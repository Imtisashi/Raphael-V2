drop policy if exists "Admin workflow RPCs can insert admin audit events" on public.admin_audit_events;

create policy "Admin workflow RPCs can insert admin audit events"
  on public.admin_audit_events
  for insert
  to authenticated
  with check (
    (select private.is_admin())
    and actor_id = (select auth.uid())
    and (select current_setting('request.raphal_admin_audit_rpc', true)) = any (array[
      'admin_set_doctor_verification'::text,
      'admin_set_platform_fee_percent'::text,
      'admin_verify_payment'::text,
      'admin_reject_payment'::text,
      'admin_mark_payout_paid'::text
    ])
  );
