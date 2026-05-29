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

  if coalesce(doctor_profile.verification_status, 'pending') <> 'approved' then
    raise exception 'This provider is not available for booking yet.';
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

  perform set_config('request.raphal_booking_rpc', 'create_appointment_request', true);

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

revoke all on table public.appointments from anon;
revoke delete, truncate, references, trigger on table public.appointments from authenticated;
grant select, insert, update on table public.appointments to authenticated;
grant all on table public.appointments to service_role;

drop policy if exists "Patients can create appointments" on public.appointments;
create policy "Patients can create appointments"
  on public.appointments
  for insert
  to authenticated
  with check (
    (select current_setting('request.raphal_booking_rpc', true)) = 'create_appointment_request'
    and patient_id = (select auth.uid())
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
    and coalesce((select doctors.verification_status from public.doctors where doctors.id = doctor_id), 'pending') = 'approved'
  );

revoke execute on function public.create_appointment_request(bigint, text, text) from public, anon;
grant execute on function public.create_appointment_request(bigint, text, text) to authenticated, service_role;
