create or replace function private.guard_doctor_profile_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := private.is_admin();
  privileged_role boolean := session_user = any (array['postgres'::name, 'supabase_admin'::name])
    or auth.role() = 'service_role';
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

revoke all on function private.guard_doctor_profile_sensitive_write() from public, anon, authenticated;
