alter table public.doctors
  add column if not exists verification_status text,
  add column if not exists verified_at timestamp with time zone,
  add column if not exists verified_by uuid references public.users(id) on delete set null,
  add column if not exists profile_submitted_at timestamp with time zone default timezone('utc'::text, now());

update public.doctors
set verification_status = coalesce(verification_status, 'approved'),
    verified_at = coalesce(verified_at, timezone('utc'::text, now()))
where verification_status is null;

alter table public.doctors
  alter column verification_status set default 'pending',
  alter column verification_status set not null,
  alter column profile_submitted_at set default timezone('utc'::text, now()),
  alter column profile_submitted_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'doctors_verification_status_valid'
      and conrelid = 'public.doctors'::regclass
  ) then
    alter table public.doctors
      add constraint doctors_verification_status_valid
      check (verification_status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text]));
  end if;
end;
$$;

create index if not exists doctors_verification_status_idx
  on public.doctors(verification_status, created_at desc);

create or replace function private.guard_doctor_profile_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := private.is_admin();
begin
  if tg_op = 'INSERT' then
    if caller_id is null then
      raise exception 'You must be signed in to create a provider profile.';
    end if;

    if new.owner_id is distinct from caller_id then
      raise exception 'Provider profiles can only be created for the signed-in account.';
    end if;

    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    new.profile_submitted_at := coalesce(new.profile_submitted_at, timezone('utc'::text, now()));
    return new;
  end if;

  if not caller_is_admin and new.owner_id is distinct from old.owner_id then
    raise exception 'Provider ownership can only be changed by an admin.';
  end if;

  if not caller_is_admin and (
    new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
  ) then
    raise exception 'Provider approval can only be changed by an admin.';
  end if;

  if caller_is_admin and new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      new.verified_at := timezone('utc'::text, now());
      new.verified_by := caller_id;
    else
      new.verified_at := null;
      new.verified_by := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_doctor_profile_sensitive_write_trigger on public.doctors;
create trigger guard_doctor_profile_sensitive_write_trigger
before insert or update on public.doctors
for each row execute function private.guard_doctor_profile_sensitive_write();

drop policy if exists "Approved doctors are publicly readable" on public.doctors;
drop policy if exists "Doctors are publicly readable" on public.doctors;
create policy "Approved doctors are publicly readable"
  on public.doctors
  for select
  to anon, authenticated
  using (
    verification_status = 'approved'
    or owner_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "Authenticated doctors can create profile" on public.doctors;
create policy "Authenticated doctors can create profile"
  on public.doctors
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and verification_status = 'pending'
    and verified_at is null
    and verified_by is null
  );

drop policy if exists "Users can update permitted doctors" on public.doctors;
create policy "Users can update permitted doctors"
  on public.doctors
  for update
  to authenticated
  using (
    (select private.is_admin())
    or owner_id = (select auth.uid())
    or id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
  )
  with check (
    (select private.is_admin())
    or owner_id = (select auth.uid())
    or id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
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

  update public.doctors
  set verification_status = normalized_status
  where doctors.id = p_doctor_id
  returning * into updated_doctor;

  if not found then
    raise exception 'Provider profile was not found.';
  end if;

  return updated_doctor;
end;
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

  if doctor_profile.verification_status <> 'approved' then
    raise exception 'This provider is still under review and cannot accept bookings yet.';
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

revoke all on function private.guard_doctor_profile_sensitive_write() from public, anon, authenticated;
revoke execute on function public.admin_set_doctor_verification(bigint, text) from public, anon;
grant execute on function public.admin_set_doctor_verification(bigint, text) to authenticated, service_role;
