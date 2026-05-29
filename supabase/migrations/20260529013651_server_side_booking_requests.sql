create or replace function public.money_amount(p_value text)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(nullif(substring(replace(coalesce(p_value, ''), ',', '') from '([0-9]+(\.[0-9]+)?)'), '')::numeric, 0);
$$;

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
  appointment_day text := coalesce(nullif(trim(coalesce(p_appointment_date, '')), ''), timezone('utc'::text, now())::text);
  fee_amount numeric;
  created_appointment public.appointments%rowtype;
begin
  if caller_id is null then
    raise exception 'You must be signed in to book an appointment.';
  end if;

  if normalized_slot is null then
    raise exception 'Select a valid slot before booking.';
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
    appointment_day,
    'Pending Approval',
    'Unpaid',
    'Rs. ' || trim(to_char(fee_amount, 'FM9999999990.00'))
  ) returning * into created_appointment;

  return created_appointment;
end;
$$;

revoke execute on function public.money_amount(text) from public, anon;
revoke execute on function public.create_appointment_request(bigint, text, text) from public, anon;
grant execute on function public.money_amount(text) to authenticated, service_role;
grant execute on function public.create_appointment_request(bigint, text, text) to authenticated, service_role;

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
    and public.money_amount(amount) > 0
    and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
    and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
    and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = (select auth.uid())), 'Patient')
    and slot = any(coalesce((select doctors.slots from public.doctors where doctors.id = doctor_id), array[]::text[]))
  );
