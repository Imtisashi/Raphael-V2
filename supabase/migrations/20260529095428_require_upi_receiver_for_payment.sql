create or replace function public.submit_appointment_payment(
  p_appointment_id bigint,
  p_payment_mode text,
  p_transaction_id text default null,
  p_receiver_upi text default null
)
returns public.appointments
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target public.appointments%rowtype;
  normalized_mode text := upper(trim(coalesce(p_payment_mode, '')));
  stored_mode text;
  clean_transaction_id text := nullif(upper(regexp_replace(coalesce(p_transaction_id, ''), '[[:space:]]+', '', 'g')), '');
  clean_receiver text := nullif(trim(coalesce(p_receiver_upi, '')), '');
begin
  if caller_id is null then
    raise exception 'You must be signed in to submit payment.';
  end if;

  stored_mode := case normalized_mode
    when 'UPI' then 'UPI'
    when 'CASH' then 'Cash'
    else null
  end;

  if stored_mode is null then
    raise exception 'Payment mode must be UPI or Cash.';
  end if;

  if stored_mode = 'UPI' and length(coalesce(clean_transaction_id, '')) < 6 then
    raise exception 'A valid UTR or transaction ID is required for UPI payment.';
  end if;

  if stored_mode = 'UPI' and clean_receiver is null then
    raise exception 'A payment receiver UPI is required before submitting UPI proof.';
  end if;

  if stored_mode = 'Cash' then
    clean_transaction_id := null;
    clean_receiver := coalesce(clean_receiver, 'Cash at clinic');
  end if;

  select * into target
  from public.appointments
  where appointments.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Appointment not found or not accessible.';
  end if;

  if target.patient_id is distinct from caller_id then
    raise exception 'Only the patient can submit payment for this appointment.';
  end if;

  if target.status is distinct from 'Accepted' then
    raise exception 'Payment can be submitted only after the doctor accepts the appointment.';
  end if;

  if coalesce(target.payment_status, 'Unpaid') not in ('Unpaid', 'Rejected') then
    raise exception 'Payment proof has already been submitted for this appointment.';
  end if;

  if stored_mode = 'UPI' and exists (
    select 1
    from public.appointments
    where appointments.id <> p_appointment_id
      and lower(appointments.transaction_id) = lower(clean_transaction_id)
  ) then
    raise exception 'This UTR is already attached to another appointment.';
  end if;

  update public.appointments
  set payment_mode = stored_mode,
      payment_status = 'Payment Submitted',
      transaction_id = clean_transaction_id,
      payment_submitted_at = timezone('utc'::text, now()),
      payment_receiver_upi = clean_receiver,
      payment_rejection_reason = null,
      payment_verified_at = null,
      payout_status = 'Not Due',
      is_paid_out = false,
      platform_fee_amount = 0,
      doctor_payout_amount = null
  where appointments.id = p_appointment_id
  returning * into target;

  return target;
exception
  when unique_violation then
    raise exception 'This UTR is already attached to another appointment.';
end;
$$;

revoke execute on function public.submit_appointment_payment(bigint, text, text, text) from public, anon;
grant execute on function public.submit_appointment_payment(bigint, text, text, text) to authenticated, service_role;
