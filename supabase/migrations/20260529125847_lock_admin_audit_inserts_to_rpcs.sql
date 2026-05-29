drop policy if exists "Admins can insert own admin audit events" on public.admin_audit_events;
drop policy if exists "Admin workflow RPCs can insert admin audit events" on public.admin_audit_events;

create policy "Admin workflow RPCs can insert admin audit events"
  on public.admin_audit_events
  for insert
  to authenticated
  with check (
    (select private.is_admin())
    and actor_id = (select auth.uid())
    and current_setting('request.raphal_admin_audit_rpc', true) = any (array[
      'admin_set_doctor_verification'::text,
      'admin_set_platform_fee_percent'::text,
      'admin_verify_payment'::text,
      'admin_reject_payment'::text,
      'admin_mark_payout_paid'::text
    ])
  );

create or replace function public.admin_set_doctor_verification(
  p_doctor_id bigint,
  p_status text
)
returns public.doctors
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  normalized_status text := lower(trim(coalesce(p_status, '')));
  previous_status text;
  updated_doctor public.doctors%rowtype;
begin
  if caller_id is null or not exists (
    select 1
    from public.users
    where users.id = caller_id
      and users.role = 'admin'
  ) then
    raise exception 'Only admins can review provider profiles.';
  end if;

  if normalized_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'Provider status is not valid.';
  end if;

  select verification_status into previous_status
  from public.doctors
  where doctors.id = p_doctor_id
  for update;

  if not found then
    raise exception 'Provider profile was not found.';
  end if;

  update public.doctors
  set verification_status = normalized_status
  where doctors.id = p_doctor_id
  returning * into updated_doctor;

  perform set_config('request.raphal_admin_audit_rpc', 'admin_set_doctor_verification', true);

  insert into public.admin_audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    caller_id,
    'provider_reviewed',
    'doctor',
    updated_doctor.id::text,
    'Provider ' || normalized_status,
    updated_doctor.name || ' changed from ' || coalesce(previous_status, 'unknown') || ' to ' || normalized_status || '.',
    jsonb_build_object(
      'doctor_id', updated_doctor.id,
      'doctor_name', updated_doctor.name,
      'previous_status', previous_status,
      'new_status', normalized_status
    )
  );

  return updated_doctor;
end;
$$;

create or replace function public.admin_set_platform_fee_percent(p_percent numeric)
returns numeric
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  normalized_percent numeric := round(p_percent, 2);
  previous_percent numeric := public.platform_fee_percent();
begin
  if caller_id is null or not exists (
    select 1
    from public.users
    where users.id = caller_id
      and users.role = 'admin'
  ) then
    raise exception 'Only admins can change the platform fee.';
  end if;

  if normalized_percent is null or normalized_percent < 0 or normalized_percent > 50 then
    raise exception 'Platform fee must be between 0 and 50 percent.';
  end if;

  insert into public.app_settings (key, value, updated_by)
  values ('platform_fee_percent', normalized_percent::text, caller_id)
  on conflict (key) do update
    set value = excluded.value,
        updated_at = timezone('utc'::text, now()),
        updated_by = caller_id;

  perform set_config('request.raphal_admin_audit_rpc', 'admin_set_platform_fee_percent', true);

  insert into public.admin_audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    caller_id,
    'platform_fee_changed',
    'app_setting',
    'platform_fee_percent',
    'Platform fee changed',
    'Platform fee changed from ' || previous_percent::text || '% to ' || normalized_percent::text || '%.',
    jsonb_build_object(
      'key', 'platform_fee_percent',
      'previous_percent', previous_percent,
      'new_percent', normalized_percent
    )
  );

  return normalized_percent;
end;
$$;

create or replace function public.admin_verify_payment(p_appointment_id bigint, p_admin_notes text default '')
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
  gross_amount numeric := 0;
  platform_fee numeric := 0;
  doctor_share numeric := 0;
begin
  if caller_id is null or not exists (select 1 from public.users where users.id = caller_id and users.role = 'admin') then
    raise exception 'Only admins can verify payments.';
  end if;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found.';
  end if;

  if target.status is distinct from 'Accepted' then
    raise exception 'Only accepted appointments can be confirmed.';
  end if;

  if coalesce(target.payment_status, 'Unpaid') not in ('Payment Submitted', 'Pending Verification') then
    raise exception 'Payment proof must be submitted before verification.';
  end if;

  select settlement.gross_amount, settlement.platform_fee, settlement.doctor_share
  into gross_amount, platform_fee, doctor_share
  from public.appointment_settlement(target.amount) as settlement;

  if gross_amount <= 0 then
    raise exception 'Appointment amount is not valid.';
  end if;

  perform set_config('request.raphal_workflow_rpc', 'admin_verify_payment', true);

  update public.appointments
  set status = 'Confirmed',
      payment_status = 'Verified',
      payment_verified_at = timezone('utc'::text, now()),
      payment_verified_by = caller_id,
      payment_rejection_reason = null,
      payout_status = 'Due',
      is_paid_out = false,
      platform_fee_amount = platform_fee,
      doctor_payout_amount = doctor_share,
      admin_notes = nullif(trim(coalesce(p_admin_notes, '')), '')
  where appointments.id = p_appointment_id
  returning * into target;

  perform set_config('request.raphal_admin_audit_rpc', 'admin_verify_payment', true);

  insert into public.admin_audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    caller_id,
    'payment_verified',
    'appointment',
    target.id::text,
    'Payment verified',
    'Appointment #' || target.id::text || ' completed for ' || coalesce(target.patient_name, 'patient') || '.',
    jsonb_build_object(
      'appointment_id', target.id,
      'patient_id', target.patient_id,
      'doctor_id', target.doctor_id,
      'amount', target.amount,
      'transaction_id', target.transaction_id,
      'platform_fee_amount', platform_fee,
      'doctor_payout_amount', doctor_share
    )
  );

  return target;
end;
$$;

create or replace function public.admin_reject_payment(p_appointment_id bigint, p_reason text default null)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
  clean_reason text := coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'UTR not found or amount mismatch.');
begin
  if caller_id is null or not exists (select 1 from public.users where users.id = caller_id and users.role = 'admin') then
    raise exception 'Only admins can reject payment proof.';
  end if;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found.';
  end if;

  if coalesce(target.payment_status, 'Unpaid') not in ('Payment Submitted', 'Pending Verification') then
    raise exception 'Only submitted payment proof can be rejected.';
  end if;

  perform set_config('request.raphal_workflow_rpc', 'admin_reject_payment', true);

  update public.appointments
  set status = 'Accepted',
      payment_status = 'Rejected',
      payment_verified_at = null,
      payment_verified_by = caller_id,
      payment_rejection_reason = clean_reason,
      payout_status = 'Not Due',
      is_paid_out = false,
      platform_fee_amount = 0,
      doctor_payout_amount = null,
      admin_notes = clean_reason
  where appointments.id = p_appointment_id
  returning * into target;

  perform set_config('request.raphal_admin_audit_rpc', 'admin_reject_payment', true);

  insert into public.admin_audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    caller_id,
    'payment_rejected',
    'appointment',
    target.id::text,
    'Payment rejected',
    'Appointment #' || target.id::text || ' payment proof rejected.',
    jsonb_build_object(
      'appointment_id', target.id,
      'patient_id', target.patient_id,
      'doctor_id', target.doctor_id,
      'amount', target.amount,
      'transaction_id', target.transaction_id,
      'reason', clean_reason
    )
  );

  return target;
end;
$$;

create or replace function public.admin_mark_payout_paid(p_appointment_id bigint)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
  gross_amount numeric := 0;
  platform_fee numeric := 0;
  doctor_share numeric := 0;
begin
  if caller_id is null or not exists (select 1 from public.users where users.id = caller_id and users.role = 'admin') then
    raise exception 'Only admins can mark payouts paid.';
  end if;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found.';
  end if;

  if target.status is distinct from 'Confirmed' or coalesce(target.payment_status, 'Unpaid') <> 'Verified' then
    raise exception 'Only verified confirmed appointments can be paid out.';
  end if;

  if coalesce(target.payout_status, 'Not Due') = 'Paid' then
    return target;
  end if;

  if coalesce(target.payout_status, 'Not Due') not in ('Due', 'Hold') then
    raise exception 'Payout is not due for this appointment.';
  end if;

  select settlement.gross_amount, settlement.platform_fee, settlement.doctor_share
  into gross_amount, platform_fee, doctor_share
  from public.appointment_settlement(target.amount) as settlement;

  if gross_amount <= 0 then
    raise exception 'Appointment amount is not valid.';
  end if;

  perform set_config('request.raphal_workflow_rpc', 'admin_mark_payout_paid', true);

  update public.appointments
  set payout_status = 'Paid',
      is_paid_out = true,
      payout_marked_at = timezone('utc'::text, now()),
      payout_marked_by = caller_id,
      platform_fee_amount = coalesce(target.platform_fee_amount, platform_fee),
      doctor_payout_amount = coalesce(target.doctor_payout_amount, doctor_share)
  where appointments.id = p_appointment_id
  returning * into target;

  perform set_config('request.raphal_admin_audit_rpc', 'admin_mark_payout_paid', true);

  insert into public.admin_audit_events (
    actor_id,
    event_type,
    entity_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    caller_id,
    'payout_paid',
    'appointment',
    target.id::text,
    'Payout marked paid',
    'Doctor payout marked paid for appointment #' || target.id::text || '.',
    jsonb_build_object(
      'appointment_id', target.id,
      'patient_id', target.patient_id,
      'doctor_id', target.doctor_id,
      'amount', target.amount,
      'doctor_payout_amount', target.doctor_payout_amount,
      'platform_fee_amount', target.platform_fee_amount
    )
  );

  return target;
end;
$$;
