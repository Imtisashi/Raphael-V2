alter table public.appointments
  add column if not exists appointment_day text generated always as (
    nullif(left(nullif(trim(coalesce(appointment_date, '')), ''), 10), '')
  ) stored;

create unique index if not exists appointments_active_slot_unique_idx
  on public.appointments(doctor_id, appointment_day, lower(trim(slot)))
  where doctor_id is not null
    and appointment_day is not null
    and nullif(trim(coalesce(slot, '')), '') is not null
    and status in ('Pending Approval', 'Accepted', 'Confirmed');

create unique index if not exists appointments_transaction_id_unique_idx
  on public.appointments(lower(transaction_id))
  where transaction_id is not null
    and length(trim(transaction_id)) > 0;

create or replace function public.create_appointment_request(
  p_doctor_id bigint,
  p_slot text,
  p_appointment_date text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  patient_profile public.users%rowtype;
  doctor_profile public.doctors%rowtype;
  normalized_slot text := nullif(trim(coalesce(p_slot, '')), '');
  requested_date text := coalesce(nullif(trim(coalesce(p_appointment_date, '')), ''), timezone('utc'::text, now())::date::text);
  requested_day text := left(requested_date, 10);
  fee_amount numeric;
  created_appointment public.appointments%rowtype;
begin
  if caller_id is null then
    raise exception 'You must be signed in to book an appointment.';
  end if;

  if normalized_slot is null then
    raise exception 'Select a valid slot before booking.';
  end if;

  if requested_day !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Select a valid appointment date.';
  end if;

  select * into patient_profile
  from public.users
  where users.id = caller_id;

  if not found then
    raise exception 'Patient profile was not found.';
  end if;

  if coalesce(patient_profile.role, 'patient') <> 'patient' then
    raise exception 'Only patients can book appointments.';
  end if;

  select * into doctor_profile
  from public.doctors
  where doctors.id = p_doctor_id;

  if not found then
    raise exception 'Doctor was not found.';
  end if;

  if doctor_profile.slots is not null
     and array_length(doctor_profile.slots, 1) > 0
     and not (normalized_slot = any(doctor_profile.slots)) then
    raise exception 'Selected slot is not available for this doctor.';
  end if;

  fee_amount := public.money_amount(doctor_profile.price);
  if fee_amount <= 0 then
    raise exception 'Doctor fee is not configured.';
  end if;

  if exists (
    select 1
    from public.appointments
    where appointments.doctor_id = doctor_profile.id
      and appointments.appointment_day = requested_day
      and lower(trim(appointments.slot)) = lower(normalized_slot)
      and appointments.status in ('Pending Approval', 'Accepted', 'Confirmed')
  ) then
    raise exception 'This slot is already booked or waiting for approval. Please choose another time.';
  end if;

  insert into public.appointments (
    patient_id,
    doctor_id,
    doctor_name,
    patient_name,
    slot,
    appointment_date,
    status,
    payment_status,
    amount
  ) values (
    caller_id,
    doctor_profile.id,
    doctor_profile.name,
    coalesce(patient_profile.name, 'Patient'),
    normalized_slot,
    requested_date,
    'Pending Approval',
    'Unpaid',
    'Rs. ' || trim(to_char(fee_amount, 'FM9999999990.00'))
  ) returning * into created_appointment;

  return created_appointment;
exception
  when unique_violation then
    raise exception 'This slot is already booked or waiting for approval. Please choose another time.';
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

  update public.appointments
  set payment_mode = stored_mode,
      payment_status = 'Payment Submitted',
      transaction_id = clean_transaction_id,
      payment_submitted_at = timezone('utc'::text, now()),
      payment_receiver_upi = clean_receiver,
      payment_rejection_reason = null,
      payment_verified_at = null,
      payout_status = 'Not Due',
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

revoke execute on function public.create_appointment_request(bigint, text, text) from public, anon;
revoke execute on function public.submit_appointment_payment(bigint, text, text, text) from public, anon;
grant execute on function public.create_appointment_request(bigint, text, text) to authenticated, service_role;
grant execute on function public.submit_appointment_payment(bigint, text, text, text) to authenticated, service_role;

drop policy if exists "Patients can create appointments" on public.appointments;
create policy "Patients can create appointments"
  on public.appointments
  for insert
  to authenticated
  with check (
    patient_id = (select auth.uid())
    and coalesce(status, 'Pending Approval') = 'Pending Approval'
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
    and appointment_day ~ '^\d{4}-\d{2}-\d{2}$'
    and public.money_amount(amount) > 0
    and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
    and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
    and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = (select auth.uid())), 'Patient')
    and slot = any(coalesce((select doctors.slots from public.doctors where doctors.id = doctor_id), array[]::text[]))
  );
