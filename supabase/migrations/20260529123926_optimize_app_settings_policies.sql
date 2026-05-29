create index if not exists app_settings_updated_by_idx
  on public.app_settings(updated_by)
  where updated_by is not null;

drop policy if exists "Admins can manage app settings" on public.app_settings;

create policy "Admins can insert app settings"
  on public.app_settings
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update app settings"
  on public.app_settings
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
