create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_by uuid references public.users(id) on delete set null,
  constraint app_settings_key_valid check (key = any (array['platform_fee_percent'::text])),
  constraint app_settings_platform_fee_valid check (
    case
      when key <> 'platform_fee_percent' then true
      when value ~ '^\d+(\.\d{1,2})?$' then value::numeric >= 0 and value::numeric <= 50
      else false
    end
  )
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('platform_fee_percent', '10')
on conflict (key) do nothing;

revoke all on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to anon, authenticated;
grant insert, update on table public.app_settings to authenticated;

drop policy if exists "Safe app settings are readable" on public.app_settings;
create policy "Safe app settings are readable"
  on public.app_settings
  for select
  to anon, authenticated
  using (key = 'platform_fee_percent');

drop policy if exists "Admins can manage app settings" on public.app_settings;
create policy "Admins can manage app settings"
  on public.app_settings
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function public.platform_fee_percent()
returns numeric
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select value::numeric
      from public.app_settings
      where key = 'platform_fee_percent'
        and value ~ '^\d+(\.\d{1,2})?$'
      limit 1
    ),
    10::numeric
  );
$$;

create or replace function public.appointment_settlement(p_amount text)
returns table (
  gross_amount numeric,
  platform_fee numeric,
  doctor_share numeric,
  platform_fee_percent numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with input as (
    select public.money_amount(p_amount) as gross,
           greatest(0::numeric, least(50::numeric, public.platform_fee_percent())) as fee_percent
  )
  select
    gross,
    round(gross * fee_percent / 100, 2),
    greatest(0::numeric, round(gross - round(gross * fee_percent / 100, 2), 2)),
    fee_percent
  from input;
$$;

create or replace function public.admin_set_platform_fee_percent(p_percent numeric)
returns numeric
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  normalized_percent numeric := round(p_percent, 2);
begin
  if caller_id is null or not exists (
    select 1
    from public.users
    where users.id = caller_id
      and users.role = 'admin'
  ) then
    raise exception 'Only admins can change the platform fee.';
  end if;

  if normalized_percent is null or normalized_percent < 0 or normalized_percent > 50 then
    raise exception 'Platform fee must be between 0 and 50 percent.';
  end if;

  insert into public.app_settings (key, value, updated_by)
  values ('platform_fee_percent', normalized_percent::text, caller_id)
  on conflict (key) do update
    set value = excluded.value,
        updated_at = timezone('utc'::text, now()),
        updated_by = caller_id;

  return normalized_percent;
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

  select settlement.gross_amount, settlement.platform_fee, settlement.doctor_share
  into gross_amount, platform_fee, doctor_share
  from public.appointment_settlement(target.amount) as settlement;

  if gross_amount <= 0 then
    raise exception 'Appointment amount is not valid.';
  end if;

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

create or replace function public.admin_mark_payout_paid(p_appointment_id bigint)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
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

  select settlement.gross_amount, settlement.platform_fee, settlement.doctor_share
  into gross_amount, platform_fee, doctor_share
  from public.appointment_settlement(target.amount) as settlement;

  if gross_amount <= 0 then
    raise exception 'Appointment amount is not valid.';
  end if;

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

revoke execute on function public.platform_fee_percent() from public;
revoke execute on function public.appointment_settlement(text) from public;
revoke execute on function public.admin_set_platform_fee_percent(numeric) from public, anon;

grant execute on function public.money_amount(text) to anon, authenticated, service_role;
grant execute on function public.platform_fee_percent() to anon, authenticated, service_role;
grant execute on function public.appointment_settlement(text) to anon, authenticated, service_role;
grant execute on function public.admin_set_platform_fee_percent(numeric) to authenticated, service_role;
