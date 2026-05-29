revoke execute on function public.money_amount(text) from public, anon;
revoke execute on function public.appointment_settlement(text) from public, anon;

grant execute on function public.money_amount(text) to authenticated, service_role;
grant execute on function public.appointment_settlement(text) to authenticated, service_role;

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
