create or replace function private.guard_user_profile_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  profile_marker text := current_setting('request.raphal_profile_rpc', true);
  caller_id uuid := auth.uid();
  request_role text := coalesce(current_setting('role', true), '');
  privileged_role boolean := auth.role() = 'service_role'
    or (caller_id is null and request_role <> all (array['authenticated', 'anon']));
begin
  if privileged_role then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if caller_id is null then
      raise exception 'You must be signed in to create a profile.';
    end if;

    if new.id is distinct from caller_id then
      raise exception 'Profiles can only be created for the signed-in account.';
    end if;

    if coalesce(new.role, 'patient') is distinct from 'patient' or new."doctorId" is not null then
      raise exception 'New profiles must start as patient profiles. Use the doctor profile workflow to link a provider account.';
    end if;

    new.role := 'patient';
    new."doctorId" := null;
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be changed.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Profile email cannot be changed from the public profile table.';
  end if;

  if new.role is distinct from old.role or new."doctorId" is distinct from old."doctorId" then
    if profile_marker is distinct from 'link_own_doctor_profile' then
      raise exception 'Role and doctor link changes must use the doctor profile workflow.';
    end if;

    if caller_id is null then
      raise exception 'You must be signed in to link a doctor profile.';
    end if;

    if new.role is distinct from 'doctor' or new."doctorId" is null then
      raise exception 'Doctor profile workflow must link a doctor account.';
    end if;

    if not exists (
      select 1
      from public.doctors
      where doctors.id = new."doctorId"
        and doctors.owner_id = caller_id
    ) then
      raise exception 'Doctor profile does not belong to this account.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.guard_doctor_profile_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_role text := coalesce(current_setting('role', true), '');
  caller_is_admin boolean := private.is_admin();
  privileged_role boolean := auth.role() = 'service_role'
    or (caller_id is null and request_role <> all (array['authenticated', 'anon']));
  material_profile_changed boolean := false;
begin
  if privileged_role then
    if tg_op = 'INSERT' then
      new.profile_submitted_at := coalesce(new.profile_submitted_at, timezone('utc'::text, now()));
    else
      new.profile_submitted_at := coalesce(new.profile_submitted_at, old.profile_submitted_at, timezone('utc'::text, now()));
    end if;
    new.verification_status := coalesce(new.verification_status, 'pending');
    return new;
  end if;

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

  material_profile_changed := new.name is distinct from old.name
    or new.specialty is distinct from old.specialty
    or new.image is distinct from old.image
    or new.district is distinct from old.district
    or new.clinic_name is distinct from old.clinic_name
    or new.location is distinct from old.location
    or new.experience is distinct from old.experience
    or new.bio is distinct from old.bio
    or new.price is distinct from old.price
    or new.upi_id is distinct from old.upi_id;

  if not caller_is_admin
     and old.verification_status = 'approved'
     and material_profile_changed then
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    new.profile_submitted_at := timezone('utc'::text, now());
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

revoke all on function private.guard_user_profile_sensitive_write() from public, anon, authenticated;
revoke all on function private.guard_doctor_profile_sensitive_write() from public, anon, authenticated;
