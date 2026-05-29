create or replace function private.guard_user_profile_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  profile_marker text := current_setting('request.raphal_profile_rpc', true);
  caller_id uuid := auth.uid();
begin
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
create trigger guard_user_profile_sensitive_update_trigger
before update on public.users
for each row execute function private.guard_user_profile_sensitive_update();

create or replace function public.link_own_doctor_profile(p_doctor_id bigint)
returns public.users
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  linked_profile public.users%rowtype;
begin
  if caller_id is null then
    raise exception 'You must be signed in to link a doctor profile.';
  end if;

  if p_doctor_id is null then
    raise exception 'Doctor profile is required.';
  end if;

  if not exists (
    select 1
    from public.doctors
    where doctors.id = p_doctor_id
      and doctors.owner_id = caller_id
  ) then
    raise exception 'Doctor profile does not belong to this account.';
  end if;

  perform set_config('request.raphal_profile_rpc', 'link_own_doctor_profile', true);

  update public.users
  set role = 'doctor',
      "doctorId" = p_doctor_id
  where users.id = caller_id
  returning * into linked_profile;

  if not found then
    raise exception 'User profile was not found.';
  end if;

  return linked_profile;
end;
$$;

revoke all on function private.guard_user_profile_sensitive_update() from public, anon, authenticated;
revoke execute on function public.link_own_doctor_profile(bigint) from public, anon;
grant execute on function public.link_own_doctor_profile(bigint) to authenticated, service_role;

revoke update on table public.users from authenticated;
grant update (
  name,
  phone,
  address,
  blood_group,
  allergies,
  district,
  push_token,
  role,
  "doctorId"
) on table public.users to authenticated;
