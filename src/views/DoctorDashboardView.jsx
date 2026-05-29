function DoctorDashboard({ user, doctor, logout, showToast, onSaveProfile, onOpenNotifications, unreadCount = 0 }) {
  const [appointments, setAppointments] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    district: user?.district || 'Dimapur',
    specialty: doctor?.specialty || 'General Physician',
    clinic_name: doctor?.clinic_name || '',
    location: doctor?.location || '',
    experience: doctor?.experience || '1 Year',
    bio: doctor?.bio || '',
    price: numericAmount(doctor?.price),
    upi_id: doctor?.upi_id || '',
    slots: (doctor?.slots || ['09:00 AM', '10:00 AM', '02:00 PM']).join(', '),
  });
  const doctorId = user?.doctorId;

  useEffect(() => {
    setDoctorForm({
      name: user?.name || '',
      phone: user?.phone || '',
      district: user?.district || 'Dimapur',
      specialty: doctor?.specialty || 'General Physician',
      clinic_name: doctor?.clinic_name || '',
      location: doctor?.location || '',
      experience: doctor?.experience || '1 Year',
      bio: doctor?.bio || '',
      price: numericAmount(doctor?.price),
      upi_id: doctor?.upi_id || '',
      slots: (doctor?.slots || ['09:00 AM', '10:00 AM', '02:00 PM']).join(', '),
    });
  }, [doctor, user]);

  const fetchDoctorAppointments = useCallback(async () => {
      if (doctorId) {
         if (!supabase) {
           setAppointments([]);
           setAppointmentEvents({});
           return;
         }

         try {
           const { data, error } = await supabase.from('appointments').select().eq('doctor_id', doctorId);
           if (error) throw error;
           const rows = data || [];
           setAppointments(rows);
           try {
             setAppointmentEvents(await fetchAppointmentEventsFor(rows.map(appointment => appointment.id)));
           } catch {
             setAppointmentEvents({});
           }
         } catch (err) {
           setAppointments([]);
           setAppointmentEvents({});
           showToast(friendlyNetworkError(err, 'Unable to load appointment requests.'), 'error');
         }
      } else {
         setAppointments([]);
         setAppointmentEvents({});
      }
  }, [doctorId, showToast]);

  useEffect(() => {
    let active = true;
    if (active) fetchDoctorAppointments();
    return () => { active = false; };
  }, [fetchDoctorAppointments]);

  useEffect(() => {
    if (!supabase || !doctorId) return undefined;
    const channel = supabase
      .channel(`doctor-appointments-${doctorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorId}` }, () => {
        fetchDoctorAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, fetchDoctorAppointments]);

  const handleAction = async (id, action) => {
    const status = action === 'accept' ? 'Accepted' : 'Cancelled';

    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('doctor_decide_appointment', {
        p_appointment_id: id,
        p_accept: action === 'accept',
      });
      if (error) throw error;
      const updatedAppointment = appointmentFromRpc(data);
      setAppointments(prev => prev.map(apt => (
        apt.id === id ? (updatedAppointment || { ...apt, status }) : apt
      )));
      showToast(action === 'accept' ? 'Appointment accepted' : 'Appointment declined');
      dispatchPushNotifications();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to update appointment.'), 'error');
    }
  };

  const updateDoctorField = (field, value) => setDoctorForm(prev => ({ ...prev, [field]: value }));

  const saveDoctorProfile = async () => {
    setSavingProfile(true);
    try {
      const providerName = doctorForm.name.trim();
      await onSaveProfile(
        {
          name: providerName,
          phone: doctorForm.phone.trim(),
          district: doctorForm.district.trim() || 'Dimapur',
        },
        {
          name: doctorDisplayName(providerName),
          specialty: doctorForm.specialty,
          clinic_name: doctorForm.clinic_name.trim(),
          location: doctorForm.location.trim(),
          experience: doctorForm.experience.trim(),
          bio: doctorForm.bio.trim(),
          price: displayAmount(doctorForm.price),
          upi_id: doctorForm.upi_id.trim(),
          slots: normalizeSlots(doctorForm.slots),
        }
      );
      setProfileOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100";
  const pendingAppointments = appointments.filter(a => a.status === 'Pending Approval');
  const currentProviderStatus = providerStatus(doctor);

  return (
    <div className="min-h-screen app-screen p-5 font-sans space-y-5">
      <div className="pro-card p-5">
        <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} specialty="General Physician" size="md" />
          <div>
            <h1 className="text-xl font-black text-slate-950 leading-tight">{doctorDisplayName(user?.name)}</h1>
            <span className="text-xs font-bold text-cyan-700">Provider console</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenNotifications} className="pro-icon-button relative">
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
        </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <MetricPill icon={Shield} label="Status" value={providerStatusText(currentProviderStatus)} tone={currentProviderStatus === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100'} />
          <MetricPill icon={ClipboardCheck} label="Pending" value={pendingAppointments.length} tone="text-amber-700 bg-amber-50 border-amber-100" />
          <MetricPill icon={CheckCircle} label="Accepted" value={appointments.filter(a => a.status === 'Accepted').length} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
      </div>

      {currentProviderStatus !== 'approved' && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Profile under review</p>
              <p className="mt-1 text-xs font-bold leading-relaxed">Patients can book after admin approval. Keep your fee, UPI, clinic, and slots ready.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Profile" title="Provider details" />
          <button onClick={() => setProfileOpen(prev => !prev)} className="pro-icon-button">
            {profileOpen ? <X size={18} /> : <Edit3 size={18} />}
          </button>
        </div>
        {!profileOpen ? (
          <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">{doctor?.specialty || doctorForm.specialty}</div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">{displayAmount(doctor?.price || doctorForm.price)}</div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 col-span-2">{doctor?.clinic_name || doctorForm.clinic_name || 'Clinic not set'}</div>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={doctorForm.name} onChange={(e) => updateDoctorField('name', e.target.value)} className={inputClass} placeholder="Doctor name" />
            <div className="grid grid-cols-2 gap-3">
              <input value={doctorForm.phone} onChange={(e) => updateDoctorField('phone', e.target.value)} className={inputClass} placeholder="Phone" />
              <input value={doctorForm.district} onChange={(e) => updateDoctorField('district', e.target.value)} className={inputClass} placeholder="District" />
            </div>
            <select value={doctorForm.specialty} onChange={(e) => updateDoctorField('specialty', e.target.value)} className={inputClass}>
              {uniqueSpecialties().map(specialty => <option key={specialty} value={specialty}>{specialty}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={doctorForm.price} onChange={(e) => updateDoctorField('price', e.target.value)} className={inputClass} placeholder="Fee" />
              <input value={doctorForm.upi_id} onChange={(e) => updateDoctorField('upi_id', e.target.value)} className={inputClass} placeholder="UPI ID" />
            </div>
            <input value={doctorForm.clinic_name} onChange={(e) => updateDoctorField('clinic_name', e.target.value)} className={inputClass} placeholder="Clinic name" />
            <input value={doctorForm.location} onChange={(e) => updateDoctorField('location', e.target.value)} className={inputClass} placeholder="Clinic location" />
            <input value={doctorForm.experience} onChange={(e) => updateDoctorField('experience', e.target.value)} className={inputClass} placeholder="Experience" />
            <textarea value={doctorForm.bio} onChange={(e) => updateDoctorField('bio', e.target.value)} className={`${inputClass} min-h-24 resize-none`} placeholder="Short professional bio" />
            <input value={doctorForm.slots} onChange={(e) => updateDoctorField('slots', e.target.value)} className={inputClass} placeholder="Slots, comma separated" />
            <Button onClick={saveDoctorProfile} variant="accent" className="w-full" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Provider Profile
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <SectionHeader eyebrow="Today" title="Appointment requests" />
        {pendingAppointments.map(apt => (
          <div key={apt.id} className="pro-card p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="font-black text-lg text-slate-950 mb-1">{apt.patient_name}</h3>
                <p className="text-sm font-bold text-slate-500 flex items-center gap-2"><Calendar size={14}/> {shortDate(apt.appointment_date)} at {apt.slot}</p>
              </div>
              <Badge type="warning">New</Badge>
            </div>
            <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={2} compact />
            <div className="flex gap-3">
              <Button onClick={() => handleAction(apt.id, 'accept')} variant="accent" className="flex-1 py-3 text-sm shadow-none"><Check size={16}/> Accept</Button>
              <Button onClick={() => handleAction(apt.id, 'reject')} variant="secondary" className="flex-1 py-3 text-sm"><X size={16}/> Decline</Button>
            </div>
          </div>
        ))}
        {pendingAppointments.length === 0 && (
          <div className="text-center py-12 pro-card border-dashed">
            <ClipboardCheck size={34} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No pending appointment requests.</p>
          </div>
        )}
        {appointments.filter(a => a.status !== 'Pending Approval').length > 0 && (
          <div className="space-y-3">
            <SectionHeader eyebrow="History" title="Handled requests" />
            {appointments.filter(a => a.status !== 'Pending Approval').map(apt => (
              <div key={apt.id} className="pro-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{apt.patient_name}</p>
                    <p className="text-xs font-bold text-slate-500">{shortDate(apt.appointment_date)} at {apt.slot}</p>
                  </div>
                  <Badge type={apt.status === 'Accepted' ? 'success' : 'warning'}>{apt.status}</Badge>
                </div>
                <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={2} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}