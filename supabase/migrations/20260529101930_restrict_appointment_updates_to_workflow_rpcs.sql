create or replace function public.doctor_decide_appointment(p_appointment_id bigint, p_accept boolean)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_doctor_id bigint;
  target public.appointments%rowtype;
  next_status text;
begin
  if caller_id is null then
    raise exception 'You must be signed in to update appointments.';
  end if;

  select users."doctorId" into caller_doctor_id
  from public.users
  where users.id = caller_id;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found or not accessible.';
  end if;

  if caller_doctor_id is null or target.doctor_id is distinct from caller_doctor_id then
    raise exception 'Only the assigned doctor can accept or decline this appointment.';
  end if;

  if target.status is distinct from 'Pending Approval' or coalesce(target.payment_status, 'Unpaid') <> 'Unpaid' then
    raise exception 'Only unpaid pending appointments can be accepted or declined.';
  end if;

  next_status := case when p_accept then 'Accepted' else 'Cancelled' end;
  perform set_config('request.raphal_workflow_rpc', 'doctor_decide_appointment', true);

  update public.appointments
  set status = next_status
  where appointments.id = p_appointment_id
  returning * into target;

  return target;
end;
$$;

create or replace function public.submit_appointment_payment(
  p_appointment_id bigint,
  p_payment_mode text,
  p_transaction_id text default null,
  p_receiver_upi text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
  normalized_mode text := upper(trim(coalesce(p_payment_mode, '')));
  stored_mode text;
  clean_transaction_id text := nullif(upper(regexp_replace(coalesce(p_transaction_id, ''), '[[:space:]]+', '', 'g')), '');
  clean_receiver text := nullif(trim(coalesce(p_receiver_upi, '')), '');
begin
  if caller_id is null then
    raise exception 'You must be signed in to submit payment.';
  end if;

  stored_mode := case normalized_mode
    when 'UPI' then 'UPI'
    when 'CASH' then 'Cash'
    else null
  end;

  if stored_mode is null then
    raise exception 'Payment mode must be UPI or Cash.';
  end if;

  if stored_mode = 'UPI' and length(coalesce(clean_transaction_id, '')) < 6 then
    raise exception 'A valid UTR or transaction ID is required for UPI payment.';
  end if;

  if stored_mode = 'UPI' and clean_receiver is null then
    raise exception 'A payment receiver UPI is required before submitting UPI proof.';
  end if;

  if stored_mode = 'Cash' then
    clean_transaction_id := null;
    clean_receiver := coalesce(clean_receiver, 'Cash at clinic');
  end if;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found or not accessible.';
  end if;

  if target.patient_id is distinct from caller_id then
    raise exception 'Only the patient can submit payment for this appointment.';
  end if;

  if target.status is distinct from 'Accepted' then
    raise exception 'Payment can be submitted only after the doctor accepts the appointment.';
  end if;

  if coalesce(target.payment_status, 'Unpaid') not in ('Unpaid', 'Rejected') then
    raise exception 'Payment proof has already been submitted for this appointment.';
  end if;

  if stored_mode = 'UPI' and exists (
    select 1
    from public.appointments
    where appointments.id <> p_appointment_id
      and lower(appointments.transaction_id) = lower(clean_transaction_id)
  ) then
    raise exception 'This UTR is already attached to another appointment.';
  end if;

  perform set_config('request.raphal_workflow_rpc', 'submit_appointment_payment', true);

  update public.appointments
  set payment_mode = stored_mode,
      payment_status = 'Payment Submitted',
      transaction_id = clean_transaction_id,
      payment_submitted_at = timezone('utc'::text, now()),
      payment_receiver_upi = clean_receiver,
      payment_rejection_reason = null,
      payment_verified_at = null,
      payment_verified_by = null,
      payout_status = 'Not Due',
      payout_marked_at = null,
      payout_marked_by = null,
      admin_notes = null,
      is_paid_out = false,
      platform_fee_amount = 0,
      doctor_payout_amount = null
  where appointments.id = p_appointment_id
  returning * into target;

  return target;
exception
  when unique_violation then
    raise exception 'This UTR is already attached to another appointment.';
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
  amount_match text;
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

  amount_match := substring(replace(coalesce(target.amount, ''), ',', '') from '([0-9]+(\.[0-9]+)?)');
  gross_amount := coalesce(nullif(amount_match, '')::numeric, 0);
  platform_fee := round(gross_amount * 10 / 100, 2);
  doctor_share := greatest(0, round(gross_amount - platform_fee, 2));
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
  amount_match text;
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

  amount_match := substring(replace(coalesce(target.amount, ''), ',', '') from '([0-9]+(\.[0-9]+)?)');
  gross_amount := coalesce(nullif(amount_match, '')::numeric, 0);
  platform_fee := round(gross_amount * 10 / 100, 2);
  doctor_share := greatest(0, round(gross_amount - platform_fee, 2));
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

  return target;
end;
$$;

drop policy if exists "Users can update permitted appointment states" on public.appointments;
drop policy if exists "Appointment workflow RPCs can update appointment states" on public.appointments;

create policy "Appointment workflow RPCs can update appointment states"
  on public.appointments
  for update
  to authenticated
  using (
    current_setting('request.raphal_workflow_rpc', true) = any (array[
      'doctor_decide_appointment',
      'submit_appointment_payment',
      'admin_verify_payment',
      'admin_reject_payment',
      'admin_mark_payout_paid'
    ])
    and (
      private.is_admin()
      or (
        patient_id = (select auth.uid())
        and status = 'Accepted'
        and coalesce(payment_status, 'Unpaid') = any (array['Unpaid'::text, 'Rejected'::text])
      )
      or (
        status = 'Pending Approval'
        and doctor_id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
      )
    )
  )
  with check (
    current_setting('request.raphal_workflow_rpc', true) = any (array[
      'doctor_decide_appointment',
      'submit_appointment_payment',
      'admin_verify_payment',
      'admin_reject_payment',
      'admin_mark_payout_paid'
    ])
    and (
      private.is_admin()
      or (
        patient_id = (select auth.uid())
        and status = 'Accepted'
        and payment_status = 'Payment Submitted'
        and payment_mode = any (array['UPI'::text, 'Cash'::text])
        and (
          (
            payment_mode = 'Cash'
            and transaction_id is null
            and payment_receiver_upi = 'Cash at clinic'
          )
          or (
            payment_mode = 'UPI'
            and nullif(trim(transaction_id), '') is not null
            and nullif(trim(payment_receiver_upi), '') is not null
          )
        )
        and payment_verified_at is null
        and payment_verified_by is null
        and payment_rejection_reason is null
        and coalesce(payout_status, 'Not Due') = 'Not Due'
        and payout_marked_at is null
        and payout_marked_by is null
        and admin_notes is null
        and doctor_payout_amount is null
        and coalesce(platform_fee_amount, 0) = 0
        and coalesce(is_paid_out, false) is false
        and public.money_amount(amount) > 0
        and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
        and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
        and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = (select auth.uid())), 'Patient')
        and slot = any(coalesce((select doctors.slots from public.doctors where doctors.id = doctor_id), array[]::text[]))
      )
      or (
        doctor_id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
        and status = any (array['Accepted'::text, 'Cancelled'::text])
        and coalesce(payment_status, 'Unpaid') = 'Unpaid'
        and payment_mode is null
        and nullif(trim(coalesce(transaction_id, '')), '') is null
        and payment_submitted_at is null
        and payment_receiver_upi is null
        and payment_verified_at is null
        and payment_verified_by is null
        and payment_rejection_reason is null
        and coalesce(payout_status, 'Not Due') = 'Not Due'
        and payout_marked_at is null
        and payout_marked_by is null
        and admin_notes is null
        and doctor_payout_amount is null
        and coalesce(platform_fee_amount, 0) = 0
        and coalesce(is_paid_out, false) is false
        and public.money_amount(amount) > 0
        and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
        and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
        and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = patient_id), 'Patient')
        and slot = any(coalesce((select doctors.slots from public.doctors where doctors.id = doctor_id), array[]::text[]))
      )
    )
  );

revoke execute on function public.doctor_decide_appointment(bigint, boolean) from public, anon;
revoke execute on function public.submit_appointment_payment(bigint, text, text, text) from public, anon;
revoke execute on function public.admin_verify_payment(bigint, text) from public, anon;
revoke execute on function public.admin_reject_payment(bigint, text) from public, anon;
revoke execute on function public.admin_mark_payout_paid(bigint) from public, anon;

grant execute on function public.doctor_decide_appointment(bigint, boolean) to authenticated, service_role;
grant execute on function public.submit_appointment_payment(bigint, text, text, text) to authenticated, service_role;
grant execute on function public.admin_verify_payment(bigint, text) to authenticated, service_role;
grant execute on function public.admin_reject_payment(bigint, text) to authenticated, service_role;
grant execute on function public.admin_mark_payout_paid(bigint) to authenticated, service_role;
