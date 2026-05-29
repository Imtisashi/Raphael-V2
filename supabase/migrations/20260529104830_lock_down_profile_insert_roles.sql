create or replace function private.guard_user_profile_sensitive_write()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  profile_marker text := current_setting('request.raphal_profile_rpc', true);
  caller_id uuid := auth.uid();
begin
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

drop trigger if exists guard_user_profile_sensitive_update_trigger on public.users;
drop trigger if exists guard_user_profile_sensitive_write_trigger on public.users;

create trigger guard_user_profile_sensitive_write_trigger
before insert or update on public.users
for each row execute function private.guard_user_profile_sensitive_write();

drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile"
  on public.users
  for insert
  to authenticated
  with check (
    id = (select auth.uid())
    and coalesce(role, 'patient') = 'patient'
    and "doctorId" is null
  );

revoke all on function private.guard_user_profile_sensitive_update() from public, anon, authenticated;
revoke all on function private.guard_user_profile_sensitive_write() from public, anon, authenticated;
