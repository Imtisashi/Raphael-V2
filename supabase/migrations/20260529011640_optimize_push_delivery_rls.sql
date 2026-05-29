create index if not exists notification_deliveries_device_token_idx
  on public.notification_deliveries(device_token_id)
  where device_token_id is not null;

drop policy if exists "Users can read own device tokens" on public.device_tokens;
drop policy if exists "Users can insert own device tokens" on public.device_tokens;
drop policy if exists "Users can update own device tokens" on public.device_tokens;
drop policy if exists "Users can delete own device tokens" on public.device_tokens;

create policy "Users can read own device tokens"
  on public.device_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own device tokens"
  on public.device_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own device tokens"
  on public.device_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own device tokens"
  on public.device_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own push deliveries" on public.notification_deliveries;
drop policy if exists "Admins can read push deliveries" on public.notification_deliveries;
drop policy if exists "Users and admins can read push deliveries" on public.notification_deliveries;

create policy "Users and admins can read push deliveries"
  on public.notification_deliveries
  for select
  to authenticated
  using ((select auth.uid()) = recipient_id or private.is_admin());
