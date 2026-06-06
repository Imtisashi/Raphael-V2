import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, ClipboardCheck, CheckCircle, AlertTriangle, X, Edit3,
  ChevronLeft, ChevronRight, Plus, Save, Trash2, Calendar, Check, Clock, Activity, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import {
  doctorWorkingDates, nextBookableDateForDoctor, slotsForDoctorDate,
  decorateDoctor, formatDate, uniqueSlots, friendlyNetworkError,
  appointmentFromRpc, dispatchPushNotifications, doctorDisplayName,
  displayAmount, uniqueSpecialties, subtractMonths, addMonths,
  generateMonthDays, isSameDay, isPastDate, parseDateOnly,
  normalizeSlotValue, normalizeWorkingDates, shortDate, providerStatus,
  providerStatusText, numericAmount, fetchAppointmentEventsFor, APPOINTMENT_EVENT_META, formatEventTime
} from '../utils/utils';
import { Avatar, MetricPill, Badge, Button, SectionHeader } from '../components/ui/sharedComponents';

function AppointmentTimeline({ events = [], limit = 3, compact = false }) {
  const visibleEvents = events.slice(0, limit);
  if (!visibleEvents.length) return null;

  return (
    <div className={`rounded-lg border border-slate-100 bg-white/80 dark:bg-slate-900/60 dark:border-slate-800 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center gap-2">
        <Clock size={14} className="text-cyan-700 dark:text-cyan-400" />
        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Activity</p>
      </div>
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const meta = APPOINTMENT_EVENT_META[event.event_type] || { icon: Activity, tone: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                <Icon size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-black text-slate-900 dark:text-white break-words">{event.title}</p>
                  <span className="shrink-0 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatEventTime(event.created_at)}</span>
                </div>
                <p className={`${compact ? 'truncate' : ''} mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400`}>{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DoctorDashboardView({ user, doctor, showToast, onSaveProfile, onAvailabilityChanged = () => {} }) {
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
  });
  const doctorId = user?.doctorId;

  const [availabilityRows, setAvailabilityRows] = useState(() => doctorWorkingDates(doctor));
  const [calendarMonth, setCalendarMonth] = useState(() => nextBookableDateForDoctor(doctor) || new Date());
  const [selectedDate, setSelectedDate] = useState(() => nextBookableDateForDoctor(doctor) || new Date());
  const [dateSlots, setDateSlots] = useState([]);
  const [newSlot, setNewSlot] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  const availabilityMap = useMemo(() => (
    availabilityRows.reduce((map, row) => {
      map[row.work_date] = row;
      return map;
    }, {})
  ), [availabilityRows]);
  const configuredDates = useMemo(() => new Set(availabilityRows.map(row => row.work_date)), [availabilityRows]);

  useEffect(() => {
    const rows = doctorWorkingDates(doctor);
    const firstOpenDate = nextBookableDateForDoctor(doctor) || new Date();
    setAvailabilityRows(rows);
    setCalendarMonth(firstOpenDate);
    setSelectedDate(firstOpenDate);
    setDateSlots(slotsForDoctorDate(decorateDoctor(doctor, rows), firstOpenDate));
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
    });
  }, [doctor, user]);

  useEffect(() => {
    const dateKey = formatDate(selectedDate);
    setDateSlots(uniqueSlots(availabilityMap[dateKey]?.slots || []));
  }, [availabilityMap, selectedDate]);
  
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
        }
      );
      setProfileOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSelectedDateSlots = async () => {
    if (!doctorId || !selectedDate) return;
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    const workDate = formatDate(selectedDate);
    const slots = uniqueSlots(dateSlots);
    setSavingSchedule(true);
    try {
      if (slots.length === 0) {
        const { error } = await supabase
          .from('doctor_working_dates')
          .delete()
          .eq('doctor_id', doctorId)
          .eq('work_date', workDate);
        if (error) throw error;
        setAvailabilityRows(prev => prev.filter(row => row.work_date !== workDate));
        showToast('Working date removed.', 'info');
      } else {
        const { data, error } = await supabase
          .from('doctor_working_dates')
          .upsert({
            doctor_id: doctorId,
            work_date: workDate,
            slots,
            is_available: true,
          }, { onConflict: 'doctor_id,work_date' })
          .select('id, doctor_id, work_date, slots, is_available')
          .single();
        if (error) throw error;
        const nextRow = normalizeWorkingDates([data])[0] || { doctor_id: doctorId, work_date: workDate, slots, is_available: true };
        setAvailabilityRows(prev => normalizeWorkingDates([
          ...prev.filter(row => row.work_date !== workDate),
          nextRow,
        ]));
        showToast(`Availability saved for ${shortDate(workDate)}.`, 'success');
      }
      await onAvailabilityChanged();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to save availability.'), 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const removeWorkingDate = async (workDate) => {
    if (!doctorId || !supabase) return;
    setSavingSchedule(true);
    try {
      const { error } = await supabase
        .from('doctor_working_dates')
        .delete()
        .eq('doctor_id', doctorId)
        .eq('work_date', workDate);
      if (error) throw error;
      setAvailabilityRows(prev => prev.filter(row => row.work_date !== workDate));
      if (formatDate(selectedDate) === workDate) setDateSlots([]);
      showToast('Working date removed.', 'info');
      await onAvailabilityChanged();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to remove availability.'), 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-cyan-300 dark:focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-950";
  const pendingAppointments = appointments.filter(a => a.status === 'Pending Approval');
  const currentProviderStatus = providerStatus(doctor);

  return (
    <div className="min-h-screen app-screen p-5 font-sans space-y-5">
      <div className="pro-card p-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} specialty="General Physician" size="md" />
            <div>
              <h1 className="text-xl font-black text-slate-950 dark:text-white leading-tight">{doctorDisplayName(user?.name)}</h1>
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">Provider console</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
          <MetricPill icon={Shield} label="Status" value={providerStatusText(currentProviderStatus)} tone={currentProviderStatus === 'approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40' : 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/40'} />
          <MetricPill icon={ClipboardCheck} label="Pending" value={pendingAppointments.length} tone="text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/40" />
          <MetricPill icon={CheckCircle} label="Accepted" value={appointments.filter(a => a.status === 'Accepted').length} tone="text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40" />
        </div>
      </div>

      {currentProviderStatus !== 'approved' && (
        <div className="rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-800 dark:text-amber-400">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Profile under review</p>
              <p className="mt-1 text-xs font-bold leading-relaxed">Patients can book after admin approval. Keep your fee, UPI, clinic, and working calendar ready.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Profile" title="Provider details" />
          <button type="button" onClick={() => { triggerHaptic('selection'); setProfileOpen(prev => !prev); }} className="pro-icon-button pressable border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
            {profileOpen ? <X size={18} strokeWidth={2.2} /> : <Edit3 size={18} strokeWidth={2.2} />}
          </button>
        </div>
        {!profileOpen ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">{doctor?.specialty || doctorForm.specialty}</div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">{displayAmount(doctor?.price || doctorForm.price)}</div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 col-span-2">{doctor?.clinic_name || doctorForm.clinic_name || 'Clinic not set'}</div>
            </div>
            <button
              type="button"
              onClick={() => { triggerHaptic('selection'); setProfileOpen(true); }}
              className="pressable flex w-full items-center justify-between rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-left text-sm font-black text-emerald-800 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/44"
            >
              <span className="inline-flex items-center gap-2"><Calendar size={16} strokeWidth={2.2} /> Manage working dates</span>
              <ChevronRight size={17} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
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
            </div>

            <div className="space-y-4 rounded-lg border border-emerald-100 dark:border-slate-800 bg-emerald-50/45 dark:bg-slate-900/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <SectionHeader eyebrow={`${configuredDates.size} dates live`} title="Working calendar" />
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={withHaptic(() => setCalendarMonth(prev => subtractMonths(prev, 1)), 'selection')}
                    className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                  >
                    <ChevronLeft size={16} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={withHaptic(() => setCalendarMonth(prev => addMonths(prev, 1)), 'selection')}
                    className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                  >
                    <ChevronRight size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">Tap a date</p>
                </div>
                <div className="calendar-weekdays">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid provider-calendar">
                  {generateMonthDays(calendarMonth).map((day, index) => {
                    const dateKey = formatDate(day);
                    const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasSlots = configuredDates.has(dateKey);
                    const blocked = isPastDate(day);

                    return (
                      <button
                        key={`${dateKey}-${index}`}
                        type="button"
                        disabled={blocked}
                        onClick={() => {
                          triggerHaptic('selection');
                          setSelectedDate(parseDateOnly(dateKey));
                          setCalendarMonth(parseDateOnly(dateKey));
                        }}
                        className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasSlots ? 'available' : ''} ${blocked ? 'blocked' : ''} ${!isCurrentMonth ? 'muted' : ''}`}
                      >
                        <span>{day.getDate()}</span>
                        {hasSlots && <span className="calendar-dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Selected date</p>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    {parseDateOnly(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dateSlots.map((slot) => (
                    <span key={slot} className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-xs font-black text-emerald-800 dark:text-emerald-400">
                      {slot}
                      <button
                        type="button"
                        title={`Remove ${slot}`}
                        onClick={() => { triggerHaptic('selection'); setDateSlots(prev => prev.filter(item => item !== slot)); }}
                        className="pressable rounded-md p-0.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                    </span>
                  ))}
                  {dateSlots.length === 0 && (
                    <span className="rounded-lg border border-dashed border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs font-black text-slate-500 dark:text-slate-400">
                      Patients cannot book this date until at least one time is added.
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSlot}
                    onChange={(event) => setNewSlot(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const nextSlot = normalizeSlotValue(newSlot);
                        if (!nextSlot) return;
                        setDateSlots(prev => uniqueSlots([...prev, nextSlot]));
                        setNewSlot('');
                      }
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-cyan-300 dark:focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-950"
                    placeholder="09:00 AM"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextSlot = normalizeSlotValue(newSlot);
                      if (!nextSlot) return;
                      triggerHaptic('selection');
                      setDateSlots(prev => uniqueSlots([...prev, nextSlot]));
                      setNewSlot('');
                    }}
                    className="pressable inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-100 dark:border-slate-800 bg-cyan-50 dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-950"
                    title="Add time slot"
                  >
                    <Plus size={18} strokeWidth={2.2} />
                  </button>
                </div>

                <Button onClick={saveSelectedDateSlots} variant="accent" haptic="success" className="w-full" disabled={savingSchedule || isPastDate(selectedDate)}>
                  {savingSchedule ? <Loader2 size={16} strokeWidth={2.2} className="animate-spin" /> : <Save size={16} strokeWidth={2.2} />}
                  {dateSlots.length ? 'Publish Working Date' : 'Remove Date From Calendar'}
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black text-slate-950 dark:text-white">Published dates</h3>
                {availabilityRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/35 px-4 py-5 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                    No working dates are live yet.
                  </div>
                ) : (
                  <div className="space-y-2 stagger-list">
                    {availabilityRows.map((row) => (
                      <div key={row.work_date} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950 dark:text-white">{parseDateOnly(row.work_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{row.slots.join(', ')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={withHaptic(() => removeWorkingDate(row.work_date), 'warning')}
                          disabled={savingSchedule}
                          className="pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/45 disabled:opacity-50"
                          title={`Remove ${shortDate(row.work_date)}`}
                        >
                          <Trash2 size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <Button onClick={saveDoctorProfile} variant="accent" haptic="success" className="w-full mt-6" disabled={savingProfile}>
              {savingProfile ? <Loader2 size={16} strokeWidth={2.2} className="animate-spin" /> : <Save size={16} strokeWidth={2.2} />} Save Provider Profile
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        <SectionHeader eyebrow="Today" title="Appointment requests" />
        {pendingAppointments.length > 0 && (
          <div className="space-y-5 stagger-list">
            {pendingAppointments.map(apt => (
              <div key={apt.id} className="pro-card p-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="font-black text-lg text-slate-950 dark:text-white mb-1">{apt.patient_name}</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-450 flex items-center gap-2"><Calendar size={14} strokeWidth={2.2}/> {shortDate(apt.appointment_date)} at {apt.slot}</p>
                  </div>
                  <Badge type="warning">New</Badge>
                </div>
                <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={2} compact />
                <div className="flex gap-3 mt-4">
                  <Button onClick={() => handleAction(apt.id, 'accept')} variant="accent" haptic="success" className="flex-1 py-3 text-sm shadow-none"><Check size={16} strokeWidth={2.2}/> Accept</Button>
                  <Button onClick={() => handleAction(apt.id, 'reject')} variant="secondary" haptic="warning" className="flex-1 py-3 text-sm"><X size={16} strokeWidth={2.2}/> Decline</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {pendingAppointments.length === 0 && (
          <div className="text-center py-12 pro-card border-dashed">
            <ClipboardCheck size={34} strokeWidth={2.2} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-bold">No pending appointment requests.</p>
          </div>
        )}
        {appointments.filter(a => a.status !== 'Pending Approval').length > 0 && (
          <div className="space-y-3">
            <SectionHeader eyebrow="History" title="Handled requests" />
            <div className="space-y-3 stagger-list">
              {appointments.filter(a => a.status !== 'Pending Approval').map(apt => (
                <div key={apt.id} className="pro-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{apt.patient_name}</p>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{shortDate(apt.appointment_date)} at {apt.slot}</p>
                    </div>
                    <Badge type={apt.status === 'Accepted' ? 'success' : 'warning'}>{apt.status}</Badge>
                  </div>
                  <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={2} compact />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
