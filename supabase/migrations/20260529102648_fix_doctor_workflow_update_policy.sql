drop policy if exists "Appointment workflow RPCs can update appointment states" on public.appointments;

create policy "Appointment workflow RPCs can update appointment states"
  on public.appointments
  for update
  to authenticated
  using (
    private.is_admin()
    or (
      patient_id = (select auth.uid())
      and status = 'Accepted'
      and coalesce(payment_status, 'Unpaid') = any (array['Unpaid'::text, 'Rejected'::text])
    )
    or (
      status = 'Pending Approval'
      and doctor_id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
    )
  )
  with check (
    current_setting('request.raphal_workflow_rpc', true) = any (array[
      'doctor_decide_appointment',
      'submit_appointment_payment',
      'admin_verify_payment',
      'admin_reject_payment',
      'admin_mark_payout_paid'
    ])
    and (
      private.is_admin()
      or (
        patient_id = (select auth.uid())
        and status = 'Accepted'
        and payment_status = 'Payment Submitted'
        and payment_mode = any (array['UPI'::text, 'Cash'::text])
        and (
          (
            payment_mode = 'Cash'
            and transaction_id is null
            and payment_receiver_upi = 'Cash at clinic'
          )
          or (
            payment_mode = 'UPI'
            and nullif(trim(transaction_id), '') is not null
            and nullif(trim(payment_receiver_upi), '') is not null
          )
        )
        and payment_verified_at is null
        and payment_verified_by is null
        and payment_rejection_reason is null
        and coalesce(payout_status, 'Not Due') = 'Not Due'
        and payout_marked_at is null
        and payout_marked_by is null
        and admin_notes is null
        and doctor_payout_amount is null
        and coalesce(platform_fee_amount, 0) = 0
        and coalesce(is_paid_out, false) is false
        and public.money_amount(amount) > 0
        and public.money_amount(amount) = public.money_amount((select doctors.price from public.doctors where doctors.id = doctor_id))
        and coalesce(doctor_name, '') = coalesce((select doctors.name from public.doctors where doctors.id = doctor_id), '')
        and coalesce(patient_name, 'Patient') = coalesce((select nullif(users.name, '') from public.users where users.id = (select auth.uid())), 'Patient')
        and slot = any(coalesce((select doctors.slots from public.doctors where doctors.id = doctor_id), array[]::text[]))
      )
      or (
        doctor_id in (select users."doctorId" from public.users where users.id = (select auth.uid()))
        and status = any (array['Accepted'::text, 'Cancelled'::text])
        and coalesce(payment_status, 'Unpaid') = 'Unpaid'
        and payment_mode is null
        and nullif(trim(coalesce(transaction_id, '')), '') is null
        and payment_submitted_at is null
        and payment_receiver_upi is null
        and payment_verified_at is null
        and payment_verified_by is null
        and payment_rejection_reason is null
        and coalesce(payout_status, 'Not Due') = 'Not Due'
        and payout_marked_at is null
        and payout_marked_by is null
        and admin_notes is null
        and doctor_payout_amount is null
        and coalesce(platform_fee_amount, 0) = 0
        and coalesce(is_paid_out, false) is false
      )
    )
  );
