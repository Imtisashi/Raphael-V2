import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  Brain, HeartPulse, Stethoscope, Bone, Sparkles, Eye, Shield,
  Calendar, CheckCircle, X, Wallet, BadgeCheck, AlertTriangle, TrendingUp, IndianRupee
} from 'lucide-react';
import { hasSupabaseConfig, supabase, supabaseConfigStatus } from '../lib/supabaseClient';

export const ADMIN_UPI_HANDLE = import.meta.env.VITE_ADMIN_UPI_HANDLE || '';
export const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "Rapha'l Health";
export const DEFAULT_PLATFORM_FEE_PERCENT = Number(import.meta.env.VITE_PLATFORM_FEE_PERCENT || 10);
export const PUSH_CHANNEL_ID = 'booking-updates';
export const PUSH_DEVICE_KEY = 'raphal_device_id';

export const SYMPTOM_MAP = {
  head: 'Neurologist', migraine: 'Neurologist', brain: 'Neurologist',
  heart: 'Cardiologist', chest: 'Cardiologist', breath: 'Cardiologist',
  pain: 'General Physician', fever: 'General Physician', flu: 'General Physician',
  bone: 'Orthopedic', joint: 'Orthopedic', knee: 'Orthopedic', back: 'Orthopedic',
  skin: 'Dermatologist', rash: 'Dermatologist', acne: 'Dermatologist',
  eye: 'Ophthalmologist', vision: 'Ophthalmologist',
};

export const SPECIALTY_META = {
  Neurologist: {
    icon: Brain,
    label: 'Neuro',
    tone: 'from-indigo-500 to-sky-500',
    soft: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
    ring: 'ring-indigo-100 dark:ring-indigo-900/30',
  },
  Cardiologist: {
    icon: HeartPulse,
    label: 'Heart',
    tone: 'from-rose-500 to-orange-400',
    soft: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50',
    ring: 'ring-rose-100 dark:ring-rose-900/30',
  },
  'General Physician': {
    icon: Stethoscope,
    label: 'Primary',
    tone: 'from-emerald-500 to-teal-500',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
    ring: 'ring-emerald-100 dark:ring-emerald-900/30',
  },
  Orthopedic: {
    icon: Bone,
    label: 'Ortho',
    tone: 'from-amber-500 to-lime-500',
    soft: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
    ring: 'ring-amber-100 dark:ring-amber-900/30',
  },
  Dermatologist: {
    icon: Sparkles,
    label: 'Skin',
    tone: 'from-fuchsia-500 to-pink-500',
    soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-900/50',
    ring: 'ring-fuchsia-100 dark:ring-fuchsia-900/30',
  },
  Ophthalmologist: {
    icon: Eye,
    label: 'Vision',
    tone: 'from-cyan-500 to-blue-500',
    soft: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
    ring: 'ring-cyan-100 dark:ring-cyan-900/30',
  },
};

export const FALLBACK_SPECIALTY_META = {
  icon: Shield,
  label: 'Care',
  tone: 'from-slate-700 to-cyan-500',
  soft: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/50',
  ring: 'ring-slate-100 dark:ring-slate-800/30',
};

export const numericAmount = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const amount = Number(match?.[0]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

export const parseDateOnly = (value) => {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const fallback = raw ? new Date(raw) : new Date();
  if (Number.isNaN(fallback.getTime())) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
};

export const formatDate = (value) => {
  const date = parseDateOnly(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};

export const isSameDay = (date1, date2) => formatDate(date1) === formatDate(date2);

export const isPastDate = (value) => parseDateOnly(value).getTime() < parseDateOnly(new Date()).getTime();

export const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const subtractMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

export const generateMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayIndex = firstDay.getDay();

  const days = [];

  for (let i = firstDayIndex; i > 0; i--) {
    days.push(new Date(year, month, -i + 1));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
};

export const normalizeSlotValue = (slot) => String(slot || '').trim();

export const normalizeSlots = (value) => (
  Array.isArray(value)
    ? value.map(normalizeSlotValue).filter(Boolean)
    : String(value || '').split(',').map(normalizeSlotValue).filter(Boolean)
);

export const uniqueSlots = (slots = []) => Array.from(new Set(normalizeSlots(slots)));

export const normalizeWorkingDates = (rows = []) => (
  (Array.isArray(rows) ? rows : [])
    .filter(row => row?.work_date && row?.is_available !== false)
    .map(row => ({
      ...row,
      work_date: formatDate(row.work_date),
      slots: uniqueSlots(row.slots),
    }))
    .filter(row => row.slots.length > 0)
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
);

export const decorateDoctor = (doctor, workingDates = null) => {
  if (!doctor) return doctor;
  const inheritedDates = doctor.workingDates || doctor.working_dates || doctor.doctor_working_dates || [];
  const normalizedDates = normalizeWorkingDates(workingDates || inheritedDates);
  const workingDateMap = normalizedDates.reduce((map, row) => {
    map[row.work_date] = row;
    return map;
  }, {});
  return {
    ...doctor,
    workingDates: normalizedDates,
    workingDateMap,
  };
};

export const mergeDoctors = (...groups) => {
  const byId = new Map();
  groups.flat().forEach((doctor) => {
    if (!doctor?.id) return;
    const key = String(doctor.id);
    const previous = byId.get(key);
    const preferredWorkingDates = doctor.workingDates || doctor.working_dates || doctor.doctor_working_dates;
    byId.set(key, decorateDoctor({
      ...(previous || {}),
      ...doctor,
      workingDates: preferredWorkingDates?.length ? preferredWorkingDates : previous?.workingDates,
    }));
  });
  return Array.from(byId.values());
};

export const doctorWorkingDates = (doctor) => normalizeWorkingDates(doctor?.workingDates || []);

export const slotsForDoctorDate = (doctor, value) => {
  const dateKey = formatDate(value);
  return uniqueSlots(doctor?.workingDateMap?.[dateKey]?.slots || []);
};

export const nextAvailabilityForDoctor = (doctor, from = new Date()) => {
  const today = formatDate(from);
  return doctorWorkingDates(doctor).find(row => row.work_date >= today && row.slots.length > 0) || null;
};

export const nextBookableDateForDoctor = (doctor) => {
  const nextAvailability = nextAvailabilityForDoctor(doctor);
  return nextAvailability ? parseDateOnly(nextAvailability.work_date) : null;
};

export const doctorCanBookDate = (doctor, value) => slotsForDoctorDate(doctor, value).length > 0;

export const displayAmount = (value) => {
  const amount = numericAmount(value);
  return amount > 0 ? `Rs. ${amount}` : 'Not set';
};

export const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const uniqueSpecialties = () => Array.from(new Set(Object.values(SYMPTOM_MAP)));

export const specialtyForInput = (value) => {
  const query = String(value || '').trim().toLowerCase();
  const keyword = Object.keys(SYMPTOM_MAP).find(term => query.includes(term));
  return keyword ? SYMPTOM_MAP[keyword] : null;
};

export const specialtyMeta = (specialty) => SPECIALTY_META[specialty] || FALLBACK_SPECIALTY_META;

export const nextSlotFor = (doctor) => {
  const nextAvailability = nextAvailabilityForDoctor(doctor);
  if (!nextAvailability) return 'No dates';
  return `${shortDate(nextAvailability.work_date)} · ${nextAvailability.slots[0]}`;
};

export const ratingLabel = (rating) => Number(rating || 5).toFixed(1).replace('.0', '');

export const shortDate = (value) => parseDateOnly(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const doctorDisplayName = (name) => (String(name || '').startsWith('Dr.') ? name : `Dr. ${name || 'Provider'}`);

export const cleanUtr = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

export const isPaymentSubmitted = (appointment) => ['Payment Submitted', 'Pending Verification'].includes(appointment?.payment_status);

export const isPaymentVerified = (appointment) => appointment?.payment_status === 'Verified' || appointment?.status === 'Confirmed';

export const settlementForAmount = (amount, feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
  const gross = numericAmount(amount);
  const safeFeePercent = Number.isFinite(Number(feePercent)) ? Math.max(0, Number(feePercent)) : DEFAULT_PLATFORM_FEE_PERCENT;
  const platformFee = Math.round(gross * safeFeePercent * 100) / 10000;
  const doctorShare = Math.max(0, Math.round((gross - platformFee) * 100) / 100);
  return { gross, platformFee, doctorShare };
};

export const isCashPayment = (appointment) => String(appointment?.payment_mode || '').toLowerCase() === 'cash';

export const paymentReviewFor = (appointment, allAppointments = [], feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
  const settlement = settlementForAmount(appointment?.amount, feePercent);
  const utr = cleanUtr(appointment?.transaction_id);
  const cashPayment = isCashPayment(appointment);
  const duplicateUtr = utr
    ? allAppointments.some(item => item.id !== appointment.id && cleanUtr(item.transaction_id) === utr)
    : false;
  const checks = [
    {
      label: 'Amount',
      detail: displayAmount(settlement.gross),
      pass: settlement.gross > 0,
    },
    {
      label: cashPayment ? 'Mode' : 'UTR',
      detail: cashPayment ? 'Cash at clinic' : (utr || 'Missing'),
      pass: cashPayment || utr.length >= 6,
    },
    {
      label: 'Unique',
      detail: cashPayment ? 'Not required' : (duplicateUtr ? 'Already used' : 'Clear'),
      pass: cashPayment || !duplicateUtr,
    },
    {
      label: 'Receiver',
      detail: cashPayment ? 'Clinic counter' : (appointment?.payment_receiver_upi || 'Not saved'),
      pass: cashPayment || Boolean(appointment?.payment_receiver_upi),
    },
  ];
  return {
    checks,
    ready: checks.every(check => check.pass),
    settlement,
  };
};

export const paymentReceiverFor = (doctor) => ({
  upi: ADMIN_UPI_HANDLE || doctor?.upi_id || '',
  name: ADMIN_UPI_HANDLE ? ADMIN_NAME : doctor?.name || ADMIN_NAME,
  type: ADMIN_UPI_HANDLE ? 'clinic' : 'doctor',
});

export const providerStatus = (doctor) => doctor?.verification_status || 'pending';

export const isProviderApproved = (doctor) => providerStatus(doctor) === 'approved';

export const providerStatusTone = (status) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'suspended') return 'error';
  return 'warning';
};

export const providerStatusText = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'suspended') return 'Suspended';
  return 'Pending';
};

export const notifyDevice = async (title, body, appIcon = '') => {
  try {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Date.now() % 2147483647),
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
        }],
      });
      return;
    }
  } catch {
    // Fall through to Web Notification
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: appIcon });
  }
};

export const dispatchPushNotifications = async () => {
  if (!supabase) return;
  try {
    await supabase.functions.invoke('dispatch-push-queue', {
      body: { source: 'booking-workflow' },
    });
  } catch {
    // Push dispatch is best-effort
  }
};

export const appointmentFromRpc = (data) => (Array.isArray(data) ? data[0] : data);

export const APPOINTMENT_EVENT_META = {
  booking_requested: { icon: Calendar, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50' },
  booking_accepted: { icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' },
  booking_declined: { icon: X, tone: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50' },
  payment_submitted: { icon: Wallet, tone: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50' },
  payment_verified: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' },
  payment_rejected: { icon: AlertTriangle, tone: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50' },
  payout_paid: { icon: TrendingUp, tone: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
};

export const ADMIN_AUDIT_META = {
  provider_reviewed: { icon: Shield, tone: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50' },
  platform_fee_changed: { icon: IndianRupee, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50' },
  payment_verified: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' },
  payment_rejected: { icon: AlertTriangle, tone: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50' },
  payout_paid: { icon: TrendingUp, tone: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
};

export const formatEventTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');
};

export const groupEventsByAppointment = (events = []) => (
  events.reduce((grouped, event) => {
    const key = String(event.appointment_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
    return grouped;
  }, {})
);

export const fetchAppointmentEventsFor = async (appointmentIds = []) => {
  const ids = Array.from(new Set(appointmentIds.filter(Boolean).map(String)));
  if (!supabase || !ids.length) return {};

  const { data, error } = await supabase
    .from('appointment_events')
    .select('id, appointment_id, event_type, title, body, created_at, metadata')
    .in('appointment_id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return groupEventsByAppointment(data || []);
};

export const createDeviceId = () => (
  globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const getStoredDeviceId = () => {
  if (typeof window === 'undefined') return createDeviceId();
  try {
    const existing = window.localStorage.getItem(PUSH_DEVICE_KEY);
    if (existing) return existing;
    const next = createDeviceId();
    window.localStorage.setItem(PUSH_DEVICE_KEY, next);
    return next;
  } catch {
    return createDeviceId();
  }
};

export const disableStoredPushDevice = async (userId) => {
  if (!supabase || !userId || typeof window === 'undefined') return;
  try {
    const deviceId = window.localStorage.getItem(PUSH_DEVICE_KEY);
    if (!deviceId) return;
    await supabase
      .from('device_tokens')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_id', deviceId);
  } catch {
    // Logout should still proceed
  }
};

export const USER_PROFILE_FIELDS = 'id, email, name, role, phone, district, address, blood_group, allergies, doctorId';

export const normalizeEmail = (value) => value.trim().toLowerCase();

export const friendlyNetworkError = (err, fallback) => {
  const message = err?.message || '';
  if (!hasSupabaseConfig) {
    const missing = supabaseConfigStatus.missing.join(', ') || 'Supabase environment variables';
    return `Live backend is not configured for this deployment. Add ${missing} in Vercel and redeploy.`;
  }
  if (/failed to fetch|network|fetch/i.test(message)) {
    const host = supabaseConfigStatus.host || 'the configured Supabase project';
    return `Could not reach Supabase (${host}) from this deployment. Check Vercel environment variables, the Supabase project status, and browser network access.${message ? ` Details: ${message}` : ''}`;
  }
  return message || fallback;
};

export const withTimeout = (promise, timeoutMs) => (
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Request timed out.')), timeoutMs);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  })
);

export const profileFromAuthUser = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Patient',
  role: 'patient',
  phone: authUser.user_metadata?.phone || '',
  district: authUser.user_metadata?.district || 'Dimapur',
  address: authUser.user_metadata?.address || '',
  blood_group: authUser.user_metadata?.blood_group || '',
  allergies: authUser.user_metadata?.allergies || '',
});

export const requestedSignupRole = (authUser, profileInput = {}) => (
  profileInput.role === 'doctor' || authUser.user_metadata?.role === 'doctor' ? 'doctor' : 'patient'
);

export const attachDoctorProfile = async (profile) => {
  if (profile?.role !== 'doctor') return profile;
  if (!supabase) return profile;

  let query = supabase
    .from('doctors')
    .select('id')
    .limit(1);

  if (profile.doctorId) {
    query = query.eq('id', profile.doctorId);
  } else {
    query = query.eq('owner_id', profile.id);
  }

  const { data: docRows } = await query;
  const docProfile = docRows?.[0];
  return docProfile ? { ...profile, doctorId: docProfile.id } : profile;
};

export const ensureDoctorProfile = async (authUser, profile) => {
  if (profile?.role !== 'doctor') return profile;
  if (!supabase) return profile;

  const existingProfile = await attachDoctorProfile(profile);
  if (existingProfile.doctorId) return existingProfile;

  const metadata = authUser.user_metadata || {};
  const { data: doctor, error } = await supabase
    .from('doctors')
    .insert([{
      name: profile.name,
      specialty: metadata.specialty || 'General Physician',
      rating: 5.0,
      reviews: 0,
      image: '',
      location: 'Online',
      experience: '1 Year',
      bio: 'New specialist at Rapha\'l.',
      price: displayAmount(metadata.consultationFee),
      slots: [],
      upi_id: metadata.doctorUpi || '',
      owner_id: authUser.id,
    }])
    .select('id')
    .single();

  if (error) throw error;

  const { data: linkedProfile, error: linkError } = await supabase.rpc('link_own_doctor_profile', {
    p_doctor_id: doctor.id,
  });
  if (linkError) throw linkError;

  return linkedProfile ? { ...linkedProfile, doctorId: linkedProfile.doctorId || doctor.id } : { ...profile, role: 'doctor', doctorId: doctor.id };
};

export const loadUserProfile = async (authUser) => {
  if (!authUser) return null;
  if (!supabase) throw new Error('Live auth is not configured.');

  let { data: profile, error } = await supabase
    .from('users')
    .select(USER_PROFILE_FIELDS)
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;

  if (!profile && authUser.email) {
    const { data: emailProfile, error: emailError } = await supabase
      .from('users')
      .select(USER_PROFILE_FIELDS)
      .eq('email', authUser.email)
      .maybeSingle();
    if (emailError) throw emailError;
    profile = emailProfile;
  }

  if (!profile) {
    return saveUserProfile(authUser, profileFromAuthUser(authUser));
  }

  return ensureDoctorProfile(authUser, profile);
};

export const saveUserProfile = async (authUser, profileInput) => {
  if (!supabase) throw new Error('Live auth is not configured.');

  const requestedRole = requestedSignupRole(authUser, profileInput);
  const safeProfileInput = { ...(profileInput || {}) };
  delete safeProfileInput.role;
  delete safeProfileInput.doctorId;
  const profile = {
    ...profileFromAuthUser(authUser),
    ...safeProfileInput,
    id: authUser.id,
    email: authUser.email,
    role: 'patient',
    doctorId: null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(profile)
    .select(USER_PROFILE_FIELDS)
    .single();

  if (error) throw error;
  return requestedRole === 'doctor' ? ensureDoctorProfile(authUser, { ...data, role: 'doctor' }) : data;
};

export const appointmentStatusMessage = (appointment) => {
  if (appointment.status === 'Cancelled') return 'Doctor declined this request. You can book another slot or choose a different specialist.';
  if (appointment.payment_status === 'Rejected') return `Payment proof was rejected${appointment.payment_rejection_reason ? `: ${appointment.payment_rejection_reason}` : '. Please recheck the UTR and submit again.'}`;
  if (appointment.status === 'Accepted' && appointment.payment_status === 'Unpaid') return 'Doctor accepted your request. Pay by UPI, then submit the UTR for admin verification.';
  if (isPaymentSubmitted(appointment)) return 'Payment proof submitted. Admin will match the UTR and complete the booking.';
  if (isPaymentVerified(appointment)) return 'Your visit is confirmed. Keep this appointment visible at the clinic.';
  return 'Request sent. The doctor will accept or decline it from their provider console.';
};

export const appointmentSteps = (appointment) => {
  const accepted = ['Accepted', 'Confirmed'].includes(appointment.status);
  const declined = appointment.status === 'Cancelled';
  const paymentStarted = appointment.payment_status && appointment.payment_status !== 'Unpaid';
  const verified = isPaymentVerified(appointment);
  return [
    { label: 'Requested', done: true },
    { label: declined ? 'Declined' : 'Doctor review', done: accepted || declined, danger: declined },
    { label: 'Payment', done: accepted && paymentStarted, disabled: declined },
    { label: 'Admin verify', done: verified, disabled: declined },
  ];
};
