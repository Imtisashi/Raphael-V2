delete from public.doctors as doctors
where doctors.owner_id is null
  and doctors.name in ('Dr. Sarah Chen', 'Dr. James Wilson', 'Dr. Emily Carter')
  and not exists (
    select 1 from public.appointments appointments
    where appointments.doctor_id = doctors.id
  )
  and not exists (
    select 1 from public.users users
    where users."doctorId" = doctors.id
  );
