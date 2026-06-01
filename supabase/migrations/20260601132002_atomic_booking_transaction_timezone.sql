create or replace function public.normalize_time_zone(p_zone text)
returns text
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  cleaned_zone text := nullif(btrim(coalesce(p_zone, '')), '');
begin
  if cleaned_zone is null then
    return 'Asia/Kolkata';
  end if;

  if exists (
    select 1
    from pg_timezone_names
    where name = cleaned_zone
  ) then
    return cleaned_zone;
  end if;

  return 'Asia/Kolkata';
end;
$$;

create or replace function public.slot_label_to_time(p_slot text)
returns time without time zone
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  normalized_slot text := upper(regexp_replace(btrim(coalesce(p_slot, '')), '[[:space:]]+', ' ', 'g'));
  match_parts text[];
  slot_hour integer;
  slot_minute integer;
  meridiem text;
begin
  match_parts := regexp_match(normalized_slot, '^([0-9]{1,2}):([0-9]{2})[[:space:]]*(AM|PM)$');

  if match_parts is null then
    raise exception 'Select a valid appointment time.';
  end if;

  slot_hour := match_parts[1]::integer;
  slot_minute := match_parts[2]::integer;
  meridiem := match_parts[3];

  if slot_hour < 1 or slot_hour > 12 or slot_minute < 0 or slot_minute > 59 then
    raise exception 'Select a valid appointment time.';
  end if;

  if meridiem = 'PM' and slot_hour < 12 then
    slot_hour := slot_hour + 12;
  elsif meridiem = 'AM' and slot_hour = 12 then
    slot_hour := 0;
  end if;

  return make_time(slot_hour, slot_minute, 0);
end;
$$;

revoke execute on function public.normalize_time_zone(text) from public, anon;
revoke execute on function public.slot_label_to_time(text) from public, anon;
grant execute on function public.normalize_time_zone(text) to authenticated, service_role;
grant execute on function public.slot_label_to_time(text) to authenticated, service_role;

alter table public.users
  add column if not exists time_zone text;

alter table public.doctors
  add column if not exists time_zone text;

alter table public.appointments
  add column if not exists appointment_starts_at_utc timestamp with time zone,
  add column if not exists doctor_time_zone text,
  add column if not exists patient_time_zone text;

update public.users
set time_zone = public.normalize_time_zone(time_zone)
where time_zone is null
   or time_zone <> public.normalize_time_zone(time_zone);

update public.doctors
set time_zone = public.normalize_time_zone(time_zone)
where time_zone is null
   or time_zone <> public.normalize_time_zone(time_zone);

update public.appointments
set doctor_time_zone = public.normalize_time_zone(doctor_time_zone),
    patient_time_zone = public.normalize_time_zone(patient_time_zone)
where doctor_time_zone is null
   or patient_time_zone is null
   or doctor_time_zone <> public.normalize_time_zone(doctor_time_zone)
   or patient_time_zone <> public.normalize_time_zone(patient_time_zone);

alter table public.users
  alter column time_zone set default 'Asia/Kolkata',
  alter column time_zone set not null;

alter table public.doctors
  alter column time_zone set default 'Asia/Kolkata',
  alter column time_zone set not null;

alter table public.appointments
  alter column doctor_time_zone set default 'Asia/Kolkata',
  alter column doctor_time_zone set not null,
  alter column patient_time_zone set default 'Asia/Kolkata',
  alter column patient_time_zone set not null;

update public.appointments as appointments
set doctor_time_zone = public.normalize_time_zone((
      select doctors.time_zone
      from public.doctors
      where doctors.id = appointments.doctor_id
    )),
    patient_time_zone = public.normalize_time_zone((
      select users.time_zone
      from public.users
      where users.id = appointments.patient_id
    )),
    appointment_starts_at_utc = (
      appointments.appointment_day::date + public.slot_label_to_time(appointments.slot)
    ) at time zone public.normalize_time_zone((
      select doctors.time_zone
      from public.doctors
      where doctors.id = appointments.doctor_id
    ))
where exists (
    select 1
    from public.doctors
    where doctors.id = appointments.doctor_id
  )
  and appointments.appointment_day ~ '^\d{4}-\d{2}-\d{2}$'
  and upper(trim(coalesce(appointments.slot, ''))) ~ '^[0-9]{1,2}:[0-9]{2}[[:space:]]*(AM|PM)$';

create unique index if not exists appointments_active_start_unique_idx
  on public.appointments (doctor_id, appointment_starts_at_utc)
  where doctor_id is not null
    and appointment_starts_at_utc is not null
    and status in ('Pending Approval', 'Accepted', 'Confirmed');

create index if not exists appointments_doctor_start_lookup_idx
  on public.appointments (doctor_id, appointment_starts_at_utc, status);

create index if not exists doctors_public_directory_lookup_idx
  on public.doctors (verification_status, specialty, district, id);

drop function if exists public.create_appointment_request(bigint, text, text);

create or replace function public.create_appointment_request(
  p_doctor_id bigint,
  p_slot text,
  p_appointment_date text default null,
  p_patient_time_zone text default null
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
  requested_work_date date;
  available_slots text[];
  fee_amount numeric;
  doctor_zone text;
  patient_zone text;
  slot_time time without time zone;
  appointment_start_utc timestamp with time zone;
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

  requested_work_date := requested_day::date;
  slot_time := public.slot_label_to_time(normalized_slot);

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

  doctor_zone := public.normalize_time_zone(doctor_profile.time_zone);
  patient_zone := public.normalize_time_zone(coalesce(p_patient_time_zone, patient_profile.time_zone));
  appointment_start_utc := (requested_work_date + slot_time) at time zone doctor_zone;

  if requested_work_date < (timezone(doctor_zone, now()))::date then
    raise exception 'Select a current or future appointment date.';
  end if;

  if appointment_start_utc <= now() then
    raise exception 'Select a future appointment time.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'raphal-booking:' || doctor_profile.id || ':' || requested_day || ':' || lower(normalized_slot),
      0
    )
  );

  select doctor_working_dates.slots into available_slots
  from public.doctor_working_dates
  where doctor_working_dates.doctor_id = doctor_profile.id
    and doctor_working_dates.work_date = requested_work_date
    and doctor_working_dates.is_available
  limit 1;

  if coalesce(cardinality(available_slots), 0) = 0 then
    raise exception 'This provider is not taking appointments on this date.';
  end if;

  if not exists (
    select 1
    from unnest(available_slots) as available_slot(slot_value)
    where lower(trim(available_slot.slot_value)) = lower(normalized_slot)
  ) then
    raise exception 'This appointment time is not available for the selected date.';
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
      and (
        lower(trim(appointments.slot)) = lower(normalized_slot)
        or appointments.appointment_starts_at_utc = appointment_start_utc
      )
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
    appointment_starts_at_utc,
    doctor_time_zone,
    patient_time_zone,
    status,
    payment_status,
    amount
  ) values (
    caller_id,
    doctor_profile.id,
    doctor_profile.name,
    coalesce(patient_profile.name, 'Patient'),
    normalized_slot,
    requested_day,
    appointment_start_utc,
    doctor_zone,
    patient_zone,
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
    and appointment_starts_at_utc is not null
    and doctor_time_zone = public.normalize_time_zone((select doctors.time_zone from public.doctors where doctors.id = doctor_id))
    and patient_time_zone = public.normalize_time_zone(patient_time_zone)
    and appointment_starts_at_utc = ((appointment_day::date + public.slot_label_to_time(slot)) at time zone doctor_time_zone)
    and public.money_amount(amount) > 0
    and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
    and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
    and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = (select auth.uid())), 'Patient')
    and exists (
      select 1
      from public.doctor_working_dates
      where doctor_working_dates.doctor_id = appointments.doctor_id
        and doctor_working_dates.work_date::text = appointments.appointment_day
        and doctor_working_dates.is_available
        and exists (
          select 1
          from unnest(doctor_working_dates.slots) as available_slot(slot_value)
          where lower(trim(available_slot.slot_value)) = lower(trim(appointments.slot))
        )
    )
    and coalesce((select doctors.verification_status from public.doctors where doctors.id = doctor_id), 'pending') = 'approved'
  );

revoke execute on function public.create_appointment_request(bigint, text, text, text) from public, anon;
grant execute on function public.create_appointment_request(bigint, text, text, text) to authenticated, service_role;
