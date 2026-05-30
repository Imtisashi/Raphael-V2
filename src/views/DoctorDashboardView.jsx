// Slot data handling functions for date-specific scheduling
const parseSlots = (slotsString) => {
  if (!slotsString) return {};

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(slotsString);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    // Not JSON, treat as legacy format
  }

  // Legacy format: comma-separated times (apply to all dates)
  const times = slotsString
    .split(',')
    .map(time => time.trim())
    .filter(Boolean);

  // Return object with a special key for legacy format
  return { __legacy: times };
};

// Serialize slots for storage
const serializeSlots = (slotsObject) => {
  // If it's legacy format (__legacy key exists), return as CSV
  if (slotsObject.__legacy) {
    return slotsObject.__legacy.join(', ');
  }

  // Otherwise return JSON
  return JSON.stringify(slotsObject);
};

// Get slots for a specific date
const getSlotsForDate = (slotsObject, dateString) => {
  const slots = parseSlots(typeof slotsObject === 'string' ? slotsObject : serializeSlots(slotsObject));

  // Return date-specific slots if available, otherwise fall back to legacy
  return slots[dateString] || slots.__legacy || [];
};

// Format date to YYYY-MM-DD string
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Parse date string to Date object
const parseDate = (dateString) => {
  return new Date(dateString);
};

// Check if two dates are the same day
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// Add months to a date
const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Subtract months from a date
const subtractMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

// Generate month days for calendar display
const generateMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Days in previous month to fill the calendar grid
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Day of week for first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = firstDay.getDay();

  const days = [];

  // Add days from previous month
  for (let i = firstDayIndex; i > 0; i--) {
    days.push(new Date(year, month, -i + 1));
  }

  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length; // 6 rows * 7 days = 42 cells
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
};

function DoctorDashboard({ user, doctor, logout, showToast, onSaveProfile, onOpenNotifications, unreadCount = 0 }) {
  const [appointments, setAppointments] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Calendar-specific state
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateSlots, setDateSlots] = useState([]);
  const [newSlot, setNewSlot] = useState('');
  const [configuredDates, setConfiguredDates] = useState(new Set());

  const doctorId = user?.doctorId;

  // Initialize doctorForm with proper slot handling
  const initializeDoctorForm = useCallback(() => {
    let initialSlots = {};
    if (doctor?.slots) {
      // Try to parse as JSON (new format)
      try {
        const parsed = JSON.parse(doctor.slots);
        if (typeof parsed === 'object' && parsed !== null) {
          initialSlots = parsed;
        } else {
          // Legacy format: convert to object with __legacy key
          const times = Array.isArray(doctor.slots)
            ? doctor.slots
            : doctor.slots.split(',').map(s => s.trim()).filter(Boolean);
          initialSlots = { __legacy: times };
        }
      } catch (e) {
        // Not valid JSON, treat as legacy format
        const times = Array.isArray(doctor.slots)
          ? doctor.slots
          : doctor.slots.split(',').map(s => s.trim()).filter(Boolean);
        initialSlots = { __legacy: times };
      }
    } else {
      // Default slots
      initialSlots = { __legacy: ['09:00 AM', '10:00 AM', '02:00 PM'] };
    }

    return {
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
      slots: initialSlots,
    };
  }, [doctor, user]);

  const [doctorForm, setDoctorForm] = useState(initializeDoctorForm);

  useEffect(() => {
    setDoctorForm(initializeDoctorForm());
  }, [doctor, user, initializeDoctorForm]);

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
          slots: serializeSlots(doctorForm.slots),
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

      {/* Calendar Interface for Slot Configuration */}
      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Availability" title="Configure appointment slots per date" />
          <button onClick={() => setProfileOpen(prev => !prev)} className="pro-icon-button">
            {profileOpen ? <X size={18} /> : <Edit3 size={18} />}
          </button>
        </div>
        {!profileOpen ? (
          <div className="space-y-6">
            {/* Date Selection Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Select Date</h3>
                <span className="text-sm text-slate-500">
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'No date selected'}
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="calendar-grid">
                {generateMonthDays(selectedDate || new Date()).map((day, index) => {
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, new Date(selectedDate));
                  const hasSlots = configuredDates.has(formatDate(day));

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasSlots ? 'has-appointment' : ''} ${day.getMonth() !== (selectedDate || new Date()).getMonth() ? 'opacity-50' : ''}`}
                      onClick={() => {
                        setSelectedDate(day);
                        // Load slots for this date
                        const dateStr = formatDate(day);
                        const slotsForDate = getSlotsForDate(doctorForm.slots, dateStr);
                        setDateSlots(slotsForDate || []);
                      }}
                    >
                      <div className="flex-1">{day.getDate()}</div>
                      {hasSlots && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full" />}
                    </div>
                  );
                })}
              </div>

              {/* Navigation for months */}
              <div className="flex justify-between items-center mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const current = selectedDate || new Date();
                    setSelectedDate(subtractMonths(current, 1));
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const current = selectedDate || new Date();
                    setSelectedDate(addMonths(current, 1));
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  »
                </Button>
              </div>
            </div>

            {/* Slot Configuration for Selected Date */}
            {selectedDate && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Time Slots for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>

                {/* Current slots display */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {dateSlots.map((slot, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                      {slot}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSlots = [...dateSlots];
                          newSlots.splice(index, 1);
                          setDateSlots(newSlots);
                        }}
                        className="ml-2 h-4 w-4 text-emerald-600 hover:text-emerald-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {dateSlots.length === 0 && (
                    <span className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-500 rounded-full border border-slate-200">
                      No slots configured
                    </span>
                  )}
                </div>

                {/* Add new slot */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                    placeholder="Enter time (e.g., 09:00 AM)"
                  />
                  <Button
                    onClick={() => {
                      if (newSlot.trim()) {
                        setDateSlots([...dateSlots, newSlot.trim()]);
                        setNewSlot('');
                      }
                    }}
                    variant="outline"
                  >
                    Add Slot
                  </Button>
                </div>

                {/* Save slots for this date */}
                <Button
                  onClick={() => {
                    const dateStr = formatDate(new Date(selectedDate));
                    const updatedSlots = { ...doctorForm.slots, [dateStr]: dateSlots };
                    setDoctorForm(prev => ({ ...prev, slots: updatedSlots }));
                    setConfiguredDates(prev => new Set(prev).add(dateStr));
                    showToast(`Slots saved for ${new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`, 'success');
                  }}
                  variant="accent"
                  className="w-full mt-4"
                >
                  Save Slots for This Date
                </Button>
              </div>
            )}

            {/* Configured Dates Summary */}
            <div className="mt-6">
              <h3 className="font-semibold text-slate-800">Configured Dates</h3>
              {configuredDates.size === 0 ? (
                <p className="text-slate-500 text-center py-4">No dates configured yet</p>
              ) : (
                <div className="space-y-2">
                  {[...configuredDates].map((dateStr, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm text-slate-500">
                          {getSlotsForDate(doctorForm.slots, dateStr).join(', ') || 'No slots'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const updatedSlots = { ...doctorForm.slots };
                          delete updatedSlots[dateStr];
                          setDoctorForm(prev => ({ ...prev, slots: updatedSlots }));
                          setConfiguredDates(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(dateStr);
                            return newSet;
                          });
                        }}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <Button onClick={saveDoctorProfile} variant="accent" className="w-full" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Provider Profile
            </Button>
          </div>
        )}
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