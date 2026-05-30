import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  Search, Calendar, Clock, MapPin, Star, Shield, Activity, User, CheckCircle, X,
  ArrowRight, Loader2, Check, LogOut,
  ChevronLeft, IndianRupee, Zap, Sparkles, ChevronRight,
  HeartPulse, Stethoscope, Wallet, TrendingUp, Users, ClipboardCheck, Bell,
  PhoneCall, MapPinned, BadgeCheck, Timer, ArrowUpRight, Brain, Bone, Eye,
  Edit3, Save, AlertTriangle, FileText, Copy
} from 'lucide-react';
import { hasSupabaseConfig, supabase, supabaseConfigStatus } from './lib/supabaseClient';
import { generateAdminReport, generateReceipt } from './utils/pdfGenerator';
import LoginScreen from './views/LoginView';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import DoctorDetailView from './views/DoctorDetailView';
import DashboardView from './views/DashboardView';
import ProfileView from './views/ProfileView';
import DoctorDashboard from './views/DoctorDashboardView';
import AdminDashboard from './views/AdminDashboardView';
import appIcon from '../icons/icon-128.webp';

const APP_ICON = appIcon;
const ADMIN_UPI_HANDLE = import.meta.env.VITE_ADMIN_UPI_HANDLE || '';
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "Rapha'l Health";
const DEFAULT_PLATFORM_FEE_PERCENT = Number(import.meta.env.VITE_PLATFORM_FEE_PERCENT || 10);
const PUSH_CHANNEL_ID = 'booking-updates';
const PUSH_DEVICE_KEY = 'raphal_device_id';

const SYMPTOM_MAP = {
  head: 'Neurologist', migraine: 'Neurologist', brain: 'Neurologist',
  heart: 'Cardiologist', chest: 'Cardiologist', breath: 'Cardiologist',
  pain: 'General Physician', fever: 'General Physician', flu: 'General Physician',
  bone: 'Orthopedic', joint: 'Orthopedic', knee: 'Orthopedic', back: 'Orthopedic',
  skin: 'Dermatologist', rash: 'Dermatologist', acne: 'Dermatologist',
  eye: 'Ophthalmologist', vision: 'Ophthalmologist',
};

const SPECIALTY_META = {
  Neurologist: {
    icon: Brain,
    label: 'Neuro',
    tone: 'from-indigo-500 to-sky-500',
    soft: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    ring: 'ring-indigo-100',
  },
  Cardiologist: {
    icon: HeartPulse,
    label: 'Heart',
    tone: 'from-rose-500 to-orange-400',
    soft: 'bg-rose-50 text-rose-700 border-rose-100',
    ring: 'ring-rose-100',
  },
  'General Physician': {
    icon: Stethoscope,
    label: 'Primary',
    tone: 'from-emerald-500 to-teal-500',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    ring: 'ring-emerald-100',
  },
  Orthopedic: {
    icon: Bone,
    label: 'Ortho',
    tone: 'from-amber-500 to-lime-500',
    soft: 'bg-amber-50 text-amber-700 border-amber-100',
    ring: 'ring-amber-100',
  },
  Dermatologist: {
    icon: Sparkles,
    label: 'Skin',
    tone: 'from-fuchsia-500 to-pink-500',
    soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    ring: 'ring-fuchsia-100',
  },
  Ophthalmologist: {
    icon: Eye,
    label: 'Vision',
    tone: 'from-cyan-500 to-blue-500',
    soft: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    ring: 'ring-cyan-100',
  },
};

const FALLBACK_SPECIALTY_META = {
  icon: Shield,
  label: 'Care',
  tone: 'from-slate-700 to-cyan-500',
  soft: 'bg-slate-50 text-slate-700 border-slate-100',
  ring: 'ring-slate-100',
};

const numericAmount = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const amount = Number(match?.[0]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const displayAmount = (value) => {
  const amount = numericAmount(value);
  return amount > 0 ? `Rs. ${amount}` : 'Not set';
};
const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const uniqueSpecialties = () => Array.from(new Set(Object.values(SYMPTOM_MAP)));
const specialtyForInput = (value) => {
  const query = String(value || '').trim().toLowerCase();
  const keyword = Object.keys(SYMPTOM_MAP).find(term => query.includes(term));
  return keyword ? SYMPTOM_MAP[keyword] : null;
};
const specialtyMeta = (specialty) => SPECIALTY_META[specialty] || FALLBACK_SPECIALTY_META;
const nextSlotFor = (doctor) => normalizeSlots(doctor?.slots)[0] || 'No slots';
const ratingLabel = (rating) => Number(rating || 5).toFixed(1).replace('.0', '');
const shortDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const normalizeSlots = (value) => (
  Array.isArray(value)
    ? value
    : String(value || '').split(',').map(slot => slot.trim()).filter(Boolean)
);
const doctorDisplayName = (name) => (String(name || '').startsWith('Dr.') ? name : `Dr. ${name || 'Provider'}`);
const cleanUtr = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();
const isPaymentSubmitted = (appointment) => ['Payment Submitted', 'Pending Verification'].includes(appointment?.payment_status);
const isPaymentVerified = (appointment) => appointment?.payment_status === 'Verified' || appointment?.status === 'Confirmed';
const settlementForAmount = (amount, feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
  const gross = numericAmount(amount);
  const safeFeePercent = Number.isFinite(Number(feePercent)) ? Math.max(0, Number(feePercent)) : DEFAULT_PLATFORM_FEE_PERCENT;
  const platformFee = Math.round(gross * safeFeePercent * 100) / 10000;
  const doctorShare = Math.max(0, Math.round((gross - platformFee) * 100) / 100);
  return { gross, platformFee, doctorShare };
};
const isCashPayment = (appointment) => String(appointment?.payment_mode || '').toLowerCase() === 'cash';
const paymentReviewFor = (appointment, allAppointments = [], feePercent = DEFAULT_PLATFORM_FEE_PERCENT) => {
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
const paymentReceiverFor = (doctor) => ({
  upi: ADMIN_UPI_HANDLE || doctor?.upi_id || '',
  name: ADMIN_UPI_HANDLE ? ADMIN_NAME : doctor?.name || ADMIN_NAME,
  type: ADMIN_UPI_HANDLE ? 'clinic' : 'doctor',
});
const providerStatus = (doctor) => doctor?.verification_status || 'pending';
const isProviderApproved = (doctor) => providerStatus(doctor) === 'approved';
const providerStatusTone = (status) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'suspended') return 'error';
  return 'warning';
};
const providerStatusText = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'suspended') return 'Suspended';
  return 'Pending';
};

const notifyDevice = async (title, body) => {
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
    // Fall through to Web Notification when the native plugin is not available.
  }

  if ('Notification' in window) {
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission().catch(() => 'denied');
    if (permission === 'granted') new Notification(title, { body });
  }
};

const dispatchPushNotifications = async () => {
  if (!supabase) return;
  try {
    await supabase.functions.invoke('dispatch-push-queue', {
      body: { source: 'booking-workflow' },
    });
  } catch {
    // Push dispatch is best-effort; the durable in-app inbox remains the source of truth.
  }
};

const appointmentFromRpc = (data) => (Array.isArray(data) ? data[0] : data);
const APPOINTMENT_EVENT_META = {
  booking_requested: { icon: Calendar, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  booking_accepted: { icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  booking_declined: { icon: X, tone: 'bg-red-50 text-red-700 border-red-100' },
  payment_submitted: { icon: Wallet, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  payment_verified: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  payment_rejected: { icon: AlertTriangle, tone: 'bg-red-50 text-red-700 border-red-100' },
  payout_paid: { icon: TrendingUp, tone: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const ADMIN_AUDIT_META = {
  provider_reviewed: { icon: Shield, tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  platform_fee_changed: { icon: IndianRupee, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  payment_verified: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  payment_rejected: { icon: AlertTriangle, tone: 'bg-red-50 text-red-700 border-red-100' },
  payout_paid: { icon: TrendingUp, tone: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const formatEventTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', '');
};

const groupEventsByAppointment = (events = []) => (
  events.reduce((grouped, event) => {
    const key = String(event.appointment_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
    return grouped;
  }, {})
);

const fetchAppointmentEventsFor = async (appointmentIds = []) => {
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

const createDeviceId = () => (
  globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const getStoredDeviceId = () => {
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

const disableStoredPushDevice = async (userId) => {
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
    // Logout should still proceed if push-token cleanup is unavailable.
  }
};

const USER_PROFILE_FIELDS = 'id, email, name, role, phone, district, address, blood_group, allergies, doctorId';
const normalizeEmail = (value) => value.trim().toLowerCase();

const mergeDoctors = (...groups) => {
  const seen = new Set();
  return groups.flat().filter((doctor) => {
    if (!doctor?.id || seen.has(String(doctor.id))) return false;
    seen.add(String(doctor.id));
    return true;
  });
};

const friendlyNetworkError = (err, fallback) => {
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

const withTimeout = (promise, timeoutMs) => (
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Request timed out.')), timeoutMs);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  })
);

const routeForRole = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'doctor') return 'doctor_dashboard';
  return 'home';
};

const profileFromAuthUser = (authUser) => ({
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

const requestedSignupRole = (authUser, profileInput = {}) => (
  profileInput.role === 'doctor' || authUser.user_metadata?.role === 'doctor' ? 'doctor' : 'patient'
);

const attachDoctorProfile = async (profile) => {
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

const ensureDoctorProfile = async (authUser, profile) => {
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
      slots: ['09:00 AM', '10:00 AM', '02:00 PM'],
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

const loadUserProfile = async (authUser) => {
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

const saveUserProfile = async (authUser, profileInput) => {
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

// ==========================================
// PREMIUM UI COMPONENTS
// ==========================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-6 py-3.5 rounded-lg font-bold transition-all duration-300 ease-out active:scale-[0.99] flex items-center justify-center gap-2 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-4";
  const variants = {
    primary: "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800/90 focus-visible:ring-slate-900/50 focus-visible:ring-offset-slate-900/50",
    accent: "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-lg shadow-[0_4px_6px_-1px_rgba(16,185,129,0.3),0_2px_4px_-2px_rgba(16,185,129,0.2)] hover:brightness-105 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-cyan-500/50",
    secondary: "bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-cyan-200/50 hover:bg-cyan-50/60 focus-visible:ring-cyan-200/50 focus-visible:ring-offset-cyan-200/50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:ring-red-100/50 focus-visible:ring-offset-red-100/50",
    ghost: "bg-transparent text-slate-500 hover:text-cyan-700/80 hover:bg-cyan-50/50 focus-visible:ring-cyan-50/50 focus-visible:ring-offset-cyan-50/50",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:border-cyan-500/50 hover:text-cyan-700/80 focus-visible:ring-slate-200/50 focus-visible:ring-offset-slate-200/50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-sky-50 text-sky-700 border border-sky-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    error: "bg-red-50 text-red-700 border border-red-100",
    dark: "bg-slate-950 text-white border border-slate-800"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${styles[type]}`}>
      {children}
    </span>
  );
};

const Avatar = ({ name, url, size = "md", specialty }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-xl", lg: "w-24 h-24 text-4xl", xl: "w-28 h-28 text-5xl" };
  const initial = name ? name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D';
  const meta = specialtyMeta(specialty);

  if (url) return <img src={url} alt={name} className={`${sizes[size]} rounded-lg object-cover shadow-md ring-3 ring-white/20`} />;

  return (
    <div className={`${sizes[size]} rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/10 ring-2 ring-white/20 relative overflow-hidden`}>
      <div className="absolute inset-0 pro-avatar-pattern" />
      {initial}
      <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400/80 border-2 border-white/20 rounded-full shadow-sm"></div>
    </div>
  );
};

const SectionHeader = ({ eyebrow, title, action, onAction }) => (
  <div className="flex items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="text-[11px] font-black uppercase text-cyan-700">{eyebrow}</p>}
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
    </div>
    {action && (
      <button onClick={onAction} className="text-sm font-bold text-slate-600 hover:text-cyan-700 flex items-center gap-1">
        {action} <ChevronRight size={15} />
      </button>
    )}
  </div>
);

const MetricPill = ({ icon: Icon, label, value, tone = 'text-cyan-700 bg-cyan-50 border-cyan-100' }) => (
  <div className={`rounded-lg border px-3 py-2 ${tone}`}>
    <div className="flex items-center gap-2">
      {React.createElement(Icon, { size: 15 })}
      <span className="text-[11px] font-black">{label}</span>
    </div>
    <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
  </div>
);

const DoctorCard = ({ doctor, onClick, featured = false }) => {
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group pro-card w-full text-left ${featured ? 'p-6' : 'p-4'} hover:-translate-y-[3px] hover:shadow-xl hover:shadow-cyan-500/15 transition-all duration-300`}
    >
      <div className="flex items-start gap-4">
        <Avatar name={doctor.name} url={doctor.image} specialty={doctor.specialty} size={featured ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-black text-slate-950 leading-tight truncate">{doctor.name}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">{doctor.specialty}</p>
            </div>
            <div className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-black ${meta.soft}`}>
              {displayAmount(doctor.price)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1 text-amber-700 border border-amber-100">
              <Star size={12} className="fill-amber-400 text-amber-400" /> {ratingLabel(doctor.rating)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1 text-slate-600 border border-slate-100">
              <MapPin size={12} /> {doctor.district || 'Nagaland'}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 ${meta.soft}`}>
              {React.createElement(Icon, { size: 12 })} {meta.label}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <Timer size={14} className="text-emerald-600" />
              <span>{nextSlotFor(doctor)}</span>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-black text-cyan-700">
              Book <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ==========================================
// VIEWS
// ==========================================

function HomeView({ setView, setSearchQuery, doctors, setSelectedDoctor, onOpenNotifications, unreadCount = 0 }) {
  const [symptomInput, setSymptomInput] = useState('');
  const [routing, setRouting] = useState(false);
  const featuredDoctors = doctors.slice(0, 3);
  const specialties = uniqueSpecialties();

  const routeToCare = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;

    setSearchQuery(specialtyForInput(query) || query);
    setRouting(true);
    window.setTimeout(() => {
      setRouting(false);
      setView('search');
    }, 220);
  }, [setSearchQuery, setView, symptomInput]);

  const searchDirectly = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;
    setSearchQuery(query);
    setView('search');
  }, [setSearchQuery, setView, symptomInput]);

  return (
    <div className="relative space-y-6 pb-28 flex-1 app-screen min-h-full">
      <div className="pro-home-hero px-6 pt-8 pb-6">
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <Badge type="success"><BadgeCheck size={12} /> Verified network</Badge>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] text-slate-950">
              Book trusted care from live provider records.
            </h1>
          </div>
          <button type="button" onClick={onOpenNotifications} className="pro-icon-button relative">
            <Bell size={19} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            searchDirectly();
          }}
          className="relative z-10 pro-command-bar"
        >
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search doctors, symptoms, specialties"
            value={symptomInput}
            className="w-full h-14 pl-12 pr-14 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none font-semibold"
            onChange={(e) => setSymptomInput(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-2 p-2.5 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors">
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
          {[
            { prompt: 'fever', icon: Activity },
            { prompt: 'chest pain', icon: HeartPulse },
            { prompt: 'skin rash', icon: Sparkles },
          ].map(({ prompt, icon: Icon }) => (
            <button key={prompt} onClick={() => routeToCare(prompt)} className="quick-chip">
              {React.createElement(Icon, { size: 14 })} {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <MetricPill icon={Users} label="Doctors" value={doctors.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={ClipboardCheck} label="Booking" value="Live" tone="text-indigo-700 bg-indigo-50 border-indigo-100" />
          <MetricPill icon={Wallet} label="Pay" value="UPI" tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>

        <div className="pro-card p-5 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase">Care finder</p>
              <h2 className="text-2xl font-black text-slate-950 mt-1">Find the right specialty</h2>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Search symptoms, specialties, districts, or provider names across real available records.
              </p>
            </div>
            <button onClick={() => routeToCare()} className="h-14 w-14 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
              {routing ? <Loader2 size={22} className="animate-spin" /> : <ArrowRight size={22} />}
            </button>
          </div>
        </div>

        <section className="space-y-3">
          <SectionHeader eyebrow="Explore" title="Care specialties" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {specialties.map((specialty) => {
              const meta = specialtyMeta(specialty);
              const Icon = meta.icon;
              return (
                <button
                  key={specialty}
                  onClick={() => { setSearchQuery(specialty); setView('search'); }}
                  className="min-w-[112px] pro-card p-4"
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.tone} text-white flex items-center justify-center mb-3 shadow-md shadow-slate-900/10`}>
                    <Icon size={19} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm text-slate-950">{meta.label}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate">{specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader eyebrow="Recommended" title="Top specialists" action="See all" onAction={() => setView('search')} />
          <div className="grid gap-3">
            {featuredDoctors.map((doctor, index) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                featured={index === 0}
                onClick={() => { setSelectedDoctor(doctor); setView('detail'); }}
              />
            ))}
            {featuredDoctors.length === 0 && (
              <div className="pro-card border-dashed p-6 text-center">
                <Users size={32} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-lg font-black text-slate-900">No live providers yet</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">Add doctors in Supabase or register a provider account to populate this list.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SearchView({ searchQuery, setSearchQuery, doctors, setView, setSelectedDoctor, activeCategory, setActiveCategory }) {
  const filteredDoctors = useMemo(() => {
    let results = doctors;
    if (activeCategory && activeCategory !== 'All') results = results.filter(d => d.specialty === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const detectedSpecialty = specialtyForInput(q);
      if (detectedSpecialty) results = results.filter(d => d.specialty === detectedSpecialty);
      else results = results.filter(d => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || (d.district && d.district.toLowerCase().includes(q)));
    }
    return results;
  }, [doctors, searchQuery, activeCategory]);

  return (
    <div className="h-full flex flex-col app-screen min-h-screen pb-28">
      <div className="sticky top-0 bg-white/95 backdrop-blur-xl z-20 pt-4 pb-4 px-5 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('home')} className="pro-icon-button"><ChevronLeft size={20}/></button>
          <div className="flex-1 relative group pro-command-bar shadow-none">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find your doctor..." className="w-full bg-white rounded-lg py-3 pl-11 pr-4 outline-none font-semibold text-sm" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', ...Array.from(new Set(Object.values(SYMPTOM_MAP)))].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-900/15' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <SectionHeader eyebrow={`${filteredDoctors.length} matches`} title={searchQuery ? `Results for ${searchQuery}` : 'Browse specialists'} />
        {filteredDoctors.length === 0 && (
           <div className="text-center py-16 pro-card border-dashed">
             <Search size={34} className="mx-auto text-slate-300 mb-4" />
             <h3 className="text-lg font-black text-slate-800">No specialists found</h3>
             <p className="text-sm font-semibold text-slate-500 mt-2">Try a symptom like fever, chest pain, rash, headache, or joint pain.</p>
           </div>
        )}
        {filteredDoctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} />
        ))}
      </div>
    </div>
  );
}

function DoctorDetailView({ doctor, setView, selectedSlot, setSelectedSlot, selectedDate, handleBook }) {
  if (!doctor) return null;
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;
  const slots = normalizeSlots(doctor.slots);
  const hasFee = numericAmount(doctor.price) > 0;
  const approved = isProviderApproved(doctor);

  return (
    <div className="h-full flex flex-col app-screen">
      <div className="relative shrink-0 px-6 pt-6 pb-7 overflow-hidden pro-detail-hero text-white">
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="relative z-20 p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-lg text-white transition-colors border border-white/20"><ChevronLeft size={20} /></button>

        <div className="relative z-10 mt-8 flex items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-black text-white">
              <Icon size={13} /> {doctor.specialty}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.03]">{doctor.name}</h1>
            <p className="mt-3 text-sm font-semibold text-cyan-50">{doctor.clinic_name || doctor.location || 'Verified Rapha\'l provider'}</p>
          </div>
          <Avatar name={doctor.name} url={doctor.image} specialty={doctor.specialty} size="xl" />
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Rating</p>
            <p className="text-lg font-black">{ratingLabel(doctor.rating)}</p>
          </div>
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Experience</p>
            <p className="text-lg font-black">{doctor.experience || 'Not listed'}</p>
          </div>
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Next</p>
            <p className="text-lg font-black">{nextSlotFor(doctor).replace(' AM', '').replace(' PM', '')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-36 space-y-5">
        <div className="pro-card p-5">
          <SectionHeader eyebrow="About" title="Specialist profile" />
          <p className="text-slate-600 text-sm leading-relaxed font-semibold mt-3">{doctor.bio || "This provider has not added profile details yet."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-lg border px-3 py-3 ${meta.soft}`}>
              <Shield size={16} />
              <p className="mt-2 text-xs font-black">{approved ? 'Verified provider' : 'Provider under review'}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-amber-700">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <p className="mt-2 text-xs font-black">{doctor.reviews || 0} reviews</p>
            </div>
          </div>
        </div>

        <div className="pro-card p-5 space-y-4">
          <SectionHeader eyebrow={shortDate(selectedDate)} title="Choose a time" />
          <div className="grid grid-cols-3 gap-3">
            {slots.map(slot => (
                <button 
                  key={slot} 
                  onClick={() => setSelectedSlot(slot)} 
                  className={`py-3.5 rounded-lg text-xs font-black transition-all duration-300 border outline-none focus:ring-4 ${
                    selectedSlot === slot 
                      ? 'bg-slate-950 border-slate-950 text-white shadow-lg shadow-slate-900/15 focus:ring-slate-900/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/60 focus:ring-cyan-100'
                  }`}
                >
                  {slot}
                </button>
            ))}
            {slots.length === 0 && (
              <div className="col-span-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-500">
                No appointment slots have been added yet.
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-100 p-5 pb-6 z-30 shadow-[0_-20px_50px_rgba(15,23,42,0.10)]">
        <div className="flex justify-between items-center mb-4">
           <div>
             <span className="text-xs font-black text-slate-500 uppercase">Consultation</span>
             <p className="text-sm font-semibold text-slate-500">{selectedSlot || 'Select a slot to continue'}</p>
           </div>
           <span className="text-3xl font-black text-slate-950">{displayAmount(doctor.price)}</span>
        </div>
        <Button variant="accent" className="w-full" onClick={handleBook} disabled={!selectedSlot || !hasFee || !approved}>
           {!approved ? 'Provider Under Review' : !hasFee ? 'Consultation Fee Not Set' : selectedSlot ? `Confirm Booking for ${selectedSlot}` : 'Select a Time Slot'}
        </Button>
      </div>
    </div>
  );
}

const appointmentStatusMessage = (appointment) => {
  if (appointment.status === 'Cancelled') return 'Doctor declined this request. You can book another slot or choose a different specialist.';
  if (appointment.payment_status === 'Rejected') return `Payment proof was rejected${appointment.payment_rejection_reason ? `: ${appointment.payment_rejection_reason}` : '. Please recheck the UTR and submit again.'}`;
  if (appointment.status === 'Accepted' && appointment.payment_status === 'Unpaid') return 'Doctor accepted your request. Pay by UPI, then submit the UTR for admin verification.';
  if (isPaymentSubmitted(appointment)) return 'Payment proof submitted. Admin will match the UTR and complete the booking.';
  if (isPaymentVerified(appointment)) return 'Your visit is confirmed. Keep this appointment visible at the clinic.';
  return 'Request sent. The doctor will accept or decline it from their provider console.';
};

const appointmentSteps = (appointment) => {
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

function AppointmentTimeline({ events = [], limit = 3, compact = false }) {
  const visibleEvents = events.slice(0, limit);
  if (!visibleEvents.length) return null;

  return (
    <div className={`rounded-lg border border-slate-100 bg-white/80 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center gap-2">
        <Clock size={14} className="text-cyan-700" />
        <p className="text-[10px] font-black uppercase text-slate-500">Activity</p>
      </div>
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const meta = APPOINTMENT_EVENT_META[event.event_type] || { icon: Activity, tone: 'bg-slate-50 text-slate-700 border-slate-100' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-black text-slate-900 break-words">{event.title}</p>
                  <span className="shrink-0 text-right text-[10px] font-bold text-slate-400">{formatEventTime(event.created_at)}</span>
                </div>
                <p className={`${compact ? 'truncate' : ''} mt-1 text-xs font-semibold text-slate-500`}>{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardView({ appointments, appointmentEvents = {}, doctors = [], onOpenUpi, onSubmitPayment, onPayCash, platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT }) {
  const [utrInputs, setUtrInputs] = useState({});
  const doctorLookup = useMemo(() => new Map(doctors.map(doctor => [String(doctor.id), doctor])), [doctors]);
  const setUtrFor = (id, value) => setUtrInputs(prev => ({ ...prev, [id]: value }));

  if (!appointments.length) return (
    <div className="p-6 text-center flex flex-col items-center justify-center h-full app-screen pb-28">
      <div className="pro-card p-8 w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6 mx-auto shadow-lg shadow-cyan-500/20"><Calendar size={36} className="text-white" /></div>
        <h2 className="text-2xl font-black text-slate-950 mb-2">No visits yet</h2>
        <p className="text-slate-500 font-semibold text-sm">Booked appointments, approvals, and payment status will appear here.</p>
      </div>
    </div>
  );
  
  return (
    <div className="p-5 space-y-5 app-screen min-h-full pb-32">
       <div className="pro-card p-5">
         <div className="flex items-center justify-between">
           <div>
             <p className="text-xs font-black text-cyan-700 uppercase">Care timeline</p>
             <h2 className="text-3xl font-black text-slate-950 mt-1">My visits</h2>
           </div>
           <div className="h-12 w-12 bg-slate-950 text-white rounded-lg flex items-center justify-center">
             <ClipboardCheck size={22} />
           </div>
         </div>
       </div>
       
       {appointments.map(apt => {
         const canSubmitPayment = apt.status === 'Accepted' && ['Unpaid', 'Rejected'].includes(apt.payment_status || 'Unpaid');
         const enteredUtr = utrInputs[apt.id] ?? apt.transaction_id ?? '';
         const receiverDoctor = doctorLookup.get(String(apt.doctor_id));
         const receiver = paymentReceiverFor(receiverDoctor);
         const paymentReceiver = apt.payment_receiver_upi || receiver.upi;
         const receiverLabel = paymentReceiver || 'Payment receiver not configured';
         return (
           <div key={apt.id} className="pro-card p-5">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-lg font-black text-slate-950">{apt.doctor_name}</h3>
                 <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg mt-2 ${
                    apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    apt.status === 'Accepted' ? 'bg-cyan-50 text-cyan-700' :
                    apt.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                 }`}>{apt.status}</span>
               </div>
               <div className="bg-slate-950 text-white px-4 py-2 rounded-lg text-center shadow-sm">
                  <span className="text-[10px] font-black text-cyan-100 block uppercase">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-xl font-black text-white">{new Date(apt.appointment_date).getDate()}</span>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3 mb-2 text-sm font-bold text-slate-600">
                <span className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100"><Clock size={16} className="text-cyan-500"/> {apt.slot}</span>
                <span className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100"><IndianRupee size={16} className="text-emerald-500"/> {displayAmount(apt.amount)}</span>
             </div>
             <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                Payment: {apt.payment_status || 'Unpaid'}
                {apt.transaction_id ? <span className="block mt-1 text-slate-700">UTR: {apt.transaction_id}</span> : null}
             </div>

             <div className="mt-4 rounded-lg border border-slate-100 bg-white p-3">
               <div className="flex items-center justify-between gap-2">
                 {appointmentSteps(apt).map((step, index) => (
                   <div key={step.label} className="flex-1">
                     <div className={`h-2 rounded-full ${step.done ? (step.danger ? 'bg-red-400' : 'bg-emerald-400') : step.disabled ? 'bg-slate-100' : 'bg-slate-200'}`} />
                     <p className={`mt-2 text-[10px] font-black ${step.done ? (step.danger ? 'text-red-600' : 'text-emerald-700') : 'text-slate-400'}`}>{index + 1}. {step.label}</p>
                   </div>
                 ))}
               </div>
               <div className="mt-4 flex items-start gap-2 text-xs font-bold text-slate-600">
                 <FileText size={15} className="text-cyan-600 shrink-0 mt-0.5" />
                 <p>{appointmentStatusMessage(apt)}</p>
               </div>
             </div>
             <div className="mt-4">
               <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={4} />
             </div>
             
             {canSubmitPayment && (
               <div className="mt-6 rounded-lg border border-cyan-100 bg-cyan-50/70 p-4 space-y-3">
                 <div>
                   <p className="text-xs font-black uppercase text-cyan-700">Payment required</p>
                   <p className="text-sm font-bold text-slate-700 mt-1">
                     {paymentReceiver
                       ? `Pay to ${receiverLabel}, then submit the UTR number shown in your UPI app.`
                       : 'Payment receiver is not configured yet. Ask the clinic or choose cash at clinic.'}
                   </p>
                 </div>
                 <Button onClick={() => onOpenUpi(apt)} variant="accent" className="w-full text-sm py-3 shadow-none" disabled={!paymentReceiver}>
                   <Wallet size={16} /> Open UPI App
                 </Button>
                 <div className="flex gap-2">
                   <input
                     value={enteredUtr}
                     onChange={(event) => setUtrFor(apt.id, cleanUtr(event.target.value))}
                     placeholder="Enter UTR / transaction ID"
                     className="min-w-0 flex-1 rounded-lg border border-cyan-100 bg-white px-3 py-3 text-sm font-black uppercase text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                   />
                   <button
                     type="button"
                     onClick={() => onSubmitPayment(apt, enteredUtr)}
                     disabled={!paymentReceiver}
                     className={`rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 ${!paymentReceiver ? 'cursor-not-allowed opacity-50' : ''}`}
                   >
                     Submit
                   </button>
                 </div>
                 <button onClick={() => onPayCash(apt)} className="w-full text-center text-xs font-black text-slate-500 hover:text-cyan-700">
                   Paying cash at clinic instead
                 </button>
               </div>
             )}
             {isPaymentSubmitted(apt) && (
               <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                 Admin verification is pending. You will be notified after the UTR is matched.
               </div>
             )}
             {isPaymentVerified(apt) && (
               <Button onClick={() => generateReceipt(apt, platformFeePercent)} variant="secondary" className="mt-6 w-full text-sm py-3">
                 <FileText size={16} /> Download Receipt
               </Button>
             )}
           </div>
         );
       })}
    </div>
  );
}

function ProfileView({ user, logout, onSaveProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    district: user?.district || 'Dimapur',
    address: user?.address || '',
    blood_group: user?.blood_group || '',
    allergies: user?.allergies || '',
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      district: user?.district || 'Dimapur',
      address: user?.address || '',
      blood_group: user?.blood_group || '',
      allergies: user?.allergies || '',
    });
  }, [user]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await onSaveProfile({
        name: form.name.trim() || user?.name,
        phone: form.phone.trim(),
        district: form.district.trim() || 'Dimapur',
        address: form.address.trim(),
        blood_group: form.blood_group.trim(),
        allergies: form.allergies.trim(),
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-slate-800 font-bold text-sm outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100";

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto app-screen pb-28">
      <div className="pro-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-cyan-700 uppercase">Member profile</p>
            <h1 className="text-3xl font-black text-slate-950 mt-1">Account</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(prev => !prev)} className="pro-icon-button">
              {isEditing ? <X size={18} /> : <Edit3 size={18} />}
            </button>
            <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} specialty="General Physician" size="lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-950">{user?.name}</h2>
              <Badge type="info"><BadgeCheck size={12} /> {user?.role || 'patient'} account</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Full Name</label>
              {isEditing ? (
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={fieldClass} />
              ) : (
                <div className={fieldClass}>{user?.name || 'N/A'}</div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Email Address</label>
              <div className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-slate-800 font-bold text-sm break-all">{user?.email || 'N/A'}</div>
            </div>
            {isEditing && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Address</label>
                  <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className={fieldClass} placeholder="Home address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Blood</label>
                    <input value={form.blood_group} onChange={(e) => updateField('blood_group', e.target.value)} className={fieldClass} placeholder="O+" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Allergies</label>
                    <input value={form.allergies} onChange={(e) => updateField('allergies', e.target.value)} className={fieldClass} placeholder="None" />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-cyan-700">
                <PhoneCall size={16} />
                {isEditing ? (
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-2 w-full bg-white/70 rounded-md px-2 py-2 text-xs font-black outline-none" placeholder="Phone" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.phone || 'No phone'}</p>
                )}
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
                <MapPinned size={16} />
                {isEditing ? (
                  <input value={form.district} onChange={(e) => updateField('district', e.target.value)} className="mt-2 w-full bg-white/70 rounded-md px-2 py-2 text-xs font-black outline-none" placeholder="District" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.district || 'Dimapur'}</p>
                )}
              </div>
            </div>
            {!isEditing && (user?.address || user?.blood_group || user?.allergies) && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-slate-600 text-xs font-bold space-y-1">
                {user?.address && <p>Address: {user.address}</p>}
                {user?.blood_group && <p>Blood group: {user.blood_group}</p>}
                {user?.allergies && <p>Allergies: {user.allergies}</p>}
              </div>
            )}
            {isEditing && (
              <Button onClick={saveProfile} variant="accent" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function AdminDashboard({
  user,
  logout,
  doctors,
  showToast,
  onOpenNotifications,
  unreadCount = 0,
  onDoctorsChanged = () => {},
  platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT,
  onPlatformFeeChanged = () => {},
}) {
  const [adminAppointments, setAdminAppointments] = useState([]);
  const [adminAuditEvents, setAdminAuditEvents] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [feeDraft, setFeeDraft] = useState(String(platformFeePercent));
  const [savingFee, setSavingFee] = useState(false);
  const doctorLookup = useMemo(() => new Map(doctors.map(doctor => [String(doctor.id), doctor])), [doctors]);

  useEffect(() => {
    setFeeDraft(String(platformFeePercent));
  }, [platformFeePercent]);

  const fetchAdminAppointments = useCallback(async () => {
    if (!supabase) {
      setAdminAppointments([]);
      setAppointmentEvents({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select()
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      setAdminAppointments(rows);
      try {
        setAppointmentEvents(await fetchAppointmentEventsFor(rows.map(appointment => appointment.id)));
      } catch {
        setAppointmentEvents({});
      }
    } catch (err) {
      setAppointmentEvents({});
      showToast(friendlyNetworkError(err, 'Unable to load admin payment queue.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchAdminAuditEvents = useCallback(async () => {
    if (!supabase || user?.role !== 'admin') {
      setAdminAuditEvents([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_audit_events')
        .select('id, event_type, entity_type, entity_id, title, body, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      setAdminAuditEvents(data || []);
    } catch {
      setAdminAuditEvents([]);
    }
  }, [user]);

  useEffect(() => {
    fetchAdminAppointments();
    fetchAdminAuditEvents();
  }, [fetchAdminAppointments, fetchAdminAuditEvents]);

  useEffect(() => {
    if (!supabase || user?.role !== 'admin') return undefined;
    const channel = supabase
      .channel('admin-appointment-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAdminAppointments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_audit_events' }, () => {
        fetchAdminAuditEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAdminAppointments, fetchAdminAuditEvents, showToast, user]);

  const runAdminAppointmentRpc = async (rpcName, params, successMessage) => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.rpc(rpcName, params);
      if (error) throw error;
      const updatedAppointment = appointmentFromRpc(data);
      if (updatedAppointment) {
        setAdminAppointments(prev => prev.map(item => item.id === updatedAppointment.id ? updatedAppointment : item));
      }
      showToast(successMessage);
      dispatchPushNotifications();
      fetchAdminAppointments();
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to update appointment.'), 'error');
    }
  };

  const verifyPayment = (appointment) => {
    runAdminAppointmentRpc('admin_verify_payment', {
      p_appointment_id: appointment.id,
      p_admin_notes: notes[appointment.id] || appointment.admin_notes || '',
    }, 'Payment verified. Booking completed.');
  };

  const rejectPayment = (appointment) => {
    runAdminAppointmentRpc('admin_reject_payment', {
      p_appointment_id: appointment.id,
      p_reason: notes[appointment.id] || 'UTR not found or amount mismatch.',
    }, 'Payment proof rejected.');
  };

  const markPayoutPaid = (appointment) => {
    runAdminAppointmentRpc('admin_mark_payout_paid', {
      p_appointment_id: appointment.id,
    }, 'Doctor payout marked paid.');
  };

  const savePlatformFee = async () => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    const nextFee = Number(feeDraft);
    if (!Number.isFinite(nextFee) || nextFee < 0 || nextFee > 50) {
      showToast('Platform fee must be between 0 and 50%.', 'error');
      return;
    }

    setSavingFee(true);
    try {
      const { data, error } = await supabase.rpc('admin_set_platform_fee_percent', {
        p_percent: nextFee,
      });
      if (error) throw error;
      onPlatformFeeChanged(Number(data ?? nextFee));
      showToast('Platform fee updated.');
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to update platform fee.'), 'error');
    } finally {
      setSavingFee(false);
    }
  };

  const reviewProvider = async (doctor, status) => {
    if (!supabase) {
      showToast('Live backend is not configured.', 'error');
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_set_doctor_verification', {
        p_doctor_id: doctor.id,
        p_status: status,
      });
      if (error) throw error;
      showToast(status === 'approved' ? 'Provider approved.' : 'Provider review updated.');
      onDoctorsChanged();
      fetchAdminAuditEvents();
    } catch (err) {
      showToast(friendlyNetworkError(err, 'Unable to review provider.'), 'error');
    }
  };

  const copyDoctorUpi = async (upiId) => {
    if (!upiId) return;
    try {
      if (!window.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await window.navigator.clipboard.writeText(upiId);
      showToast('Doctor UPI copied.');
    } catch {
      showToast('Unable to copy UPI.', 'error');
    }
  };

  const paymentQueue = adminAppointments.filter(appointment => isPaymentSubmitted(appointment));
  const verifiedAppointments = adminAppointments.filter(appointment => isPaymentVerified(appointment));
  const payoutDueAppointments = verifiedAppointments.filter(appointment => appointment.payout_status !== 'Paid');
  const pendingProviders = doctors.filter(doctor => providerStatus(doctor) === 'pending');
  const approvedProviders = doctors.filter(isProviderApproved);
  const duePayoutTotal = payoutDueAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
  const payoutRows = doctors
    .map((doctor) => {
      const doctorAppointments = verifiedAppointments.filter(appointment => String(appointment.doctor_id) === String(doctor.id));
      const dueAppointments = doctorAppointments.filter(appointment => appointment.payout_status !== 'Paid');
      const paidAppointments = doctorAppointments.filter(appointment => appointment.payout_status === 'Paid');
      const totalCollected = doctorAppointments.reduce((sum, appointment) => sum + numericAmount(appointment.amount), 0);
      const platformShare = doctorAppointments.reduce((sum, appointment) => sum + (Number(appointment.platform_fee_amount) || settlementForAmount(appointment.amount, platformFeePercent).platformFee), 0);
      const doctorShare = doctorAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      const dueShare = dueAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      const paidShare = paidAppointments.reduce((sum, appointment) => sum + (Number(appointment.doctor_payout_amount) || settlementForAmount(appointment.amount, platformFeePercent).doctorShare), 0);
      return {
        doctorName: doctor.name,
        doctorUpi: doctor.upi_id || '',
        totalAppointments: doctorAppointments.length,
        dueAppointments: dueAppointments.length,
        paidAppointments: paidAppointments.length,
        totalCollected,
        platformShare,
        doctorShare,
        dueShare,
        paidShare,
      };
    })
    .filter(row => row.totalAppointments > 0);

  return (
    <div className="min-h-screen app-screen text-slate-900 p-5 font-sans space-y-5 pb-10">
      <div className="pro-card p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-cyan-700 uppercase">Operations</p>
            <h1 className="text-3xl font-black flex items-center gap-2 text-slate-950"><Shield className="text-cyan-600"/> Admin</h1>
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
          <MetricPill icon={Users} label="Approved" value={approvedProviders.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={Shield} label="Provider review" value={pendingProviders.length} tone="text-violet-700 bg-violet-50 border-violet-100" />
          <MetricPill icon={ClipboardCheck} label="Verify" value={paymentQueue.length} tone="text-amber-700 bg-amber-50 border-amber-100" />
          <MetricPill icon={TrendingUp} label="Payouts" value={formatMoney(duePayoutTotal)} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Platform fee</span>
              <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={feeDraft}
                  onChange={(event) => setFeeDraft(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-900 outline-none"
                />
                <span className="text-sm font-black text-slate-400">%</span>
              </div>
            </label>
            <button
              type="button"
              onClick={savePlatformFee}
              disabled={savingFee}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 text-xs font-black text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {savingFee ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Audit trail" title="Recent admin actions" />
        {adminAuditEvents.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={28} />
            <p className="text-sm font-black text-slate-700">No admin actions recorded yet.</p>
          </div>
        )}
        {adminAuditEvents.map((event) => {
          const meta = ADMIN_AUDIT_META[event.event_type] || { icon: ClipboardCheck, tone: 'bg-slate-50 text-slate-700 border-slate-100' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className={`shrink-0 rounded-lg border p-2 ${meta.tone}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-black text-slate-950">{event.title}</p>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatEventTime(event.created_at)}</span>
                </div>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Provider review" title="Approve specialists" />
        {pendingProviders.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Shield className="mx-auto mb-3 text-slate-300" size={30} />
            <p className="text-sm font-black text-slate-700">No provider profiles waiting.</p>
          </div>
        )}
        {pendingProviders.map((doctor) => (
          <div key={doctor.id} className="rounded-lg border border-violet-100 bg-violet-50/70 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{doctor.name}</p>
                <p className="text-xs font-bold text-slate-600">{doctor.specialty} - {doctor.district || doctor.location || 'Location not set'}</p>
              </div>
              <Badge type="warning">Pending</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <div className="rounded-lg border border-violet-100 bg-white/85 p-3">Fee<br/><span className="text-base font-black">{displayAmount(doctor.price)}</span></div>
              <div className="rounded-lg border border-violet-100 bg-white/85 p-3">UPI<br/><span className="text-base font-black break-all">{doctor.upi_id || 'Missing'}</span></div>
              <div className="col-span-2 rounded-lg border border-violet-100 bg-white/85 p-3">Clinic<br/><span className="text-sm font-black">{doctor.clinic_name || doctor.location || 'Not set'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => reviewProvider(doctor, 'approved')} variant="accent" className="py-3 text-sm shadow-none"><Check size={16}/> Approve</Button>
              <Button onClick={() => reviewProvider(doctor, 'rejected')} variant="secondary" className="py-3 text-sm"><X size={16}/> Reject</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="pro-card p-5 space-y-4">
        <SectionHeader eyebrow="Manual UTR" title="Payment verification" />
        {loading && (
          <div className="flex items-center justify-center py-8 text-cyan-700">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {!loading && paymentQueue.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-emerald-500" size={30} />
            <p className="text-sm font-black text-slate-700">No payment proofs waiting.</p>
          </div>
        )}
        {paymentQueue.map((appointment) => {
          const review = paymentReviewFor(appointment, adminAppointments, platformFeePercent);
          const settlement = review.settlement;
          return (
            <div key={appointment.id} className="rounded-lg border border-amber-100 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{appointment.patient_name}</p>
                  <p className="text-xs font-bold text-slate-600">{appointment.doctor_name} - {shortDate(appointment.appointment_date)} at {appointment.slot}</p>
                </div>
                <Badge type={review.ready ? 'success' : 'warning'}>{review.ready ? 'Ready' : 'Review'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Amount<br/><span className="text-base font-black">{displayAmount(appointment.amount)}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">UTR<br/><span className="text-base font-black break-all">{appointment.transaction_id || 'Cash'}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Doctor payout<br/><span className="text-base font-black">{formatMoney(settlement.doctorShare)}</span></div>
                <div className="rounded-lg bg-white/80 p-3 border border-amber-100">Platform fee<br/><span className="text-base font-black">{formatMoney(settlement.platformFee)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {review.checks.map((check) => (
                  <div key={check.label} className={`rounded-lg border bg-white/85 p-3 ${check.pass ? 'border-emerald-100 text-emerald-700' : 'border-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      {check.pass ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      <p className="text-[10px] font-black uppercase">{check.label}</p>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-slate-700">{check.detail}</p>
                  </div>
                ))}
              </div>
              <AppointmentTimeline events={appointmentEvents[String(appointment.id)] || []} limit={4} />
              <textarea
                value={notes[appointment.id] || ''}
                onChange={(event) => setNotes(prev => ({ ...prev, [appointment.id]: event.target.value }))}
                placeholder="Admin note or rejection reason"
                className="w-full rounded-lg border border-amber-100 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => verifyPayment(appointment)} variant="accent" className="py-3 text-sm shadow-none" disabled={!review.ready}><Check size={16}/> Verify</Button>
                <Button onClick={() => rejectPayment(appointment)} variant="secondary" className="py-3 text-sm"><X size={16}/> Reject</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pro-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader eyebrow="Settlement" title="Doctor payouts" />
          <button
            type="button"
            onClick={() => generateAdminReport(payoutRows)}
            disabled={!payoutRows.length}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-40"
          >
            Report
          </button>
        </div>
        {payoutRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
            Verified appointments will create payout totals here.
          </div>
        )}
        {payoutRows.map((row) => (
          <div key={row.doctorName} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{row.doctorName}</p>
                <p className="text-xs font-bold text-slate-500">{row.dueAppointments} due of {row.totalAppointments} verified visits</p>
                {row.doctorUpi && <p className="mt-1 text-[11px] font-bold text-slate-400 truncate">UPI: {row.doctorUpi}</p>}
              </div>
              <p className="text-lg font-black text-emerald-700">{formatMoney(row.dueShare)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
              <div className="rounded-md bg-white p-2">Collected: {formatMoney(row.totalCollected)}</div>
              <div className="rounded-md bg-white p-2">Platform: {formatMoney(row.platformShare)}</div>
              <div className="rounded-md bg-white p-2">Doctor share: {formatMoney(row.doctorShare)}</div>
              <div className="rounded-md bg-white p-2">Paid: {formatMoney(row.paidShare)}</div>
            </div>
          </div>
        ))}
        {payoutDueAppointments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500">Mark individual payouts</p>
            {payoutDueAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3">
                <div className="min-w-0">
                  {(() => {
                    const payoutDoctor = doctorLookup.get(String(appointment.doctor_id));
                    return (
                      <>
                        <p className="truncate text-sm font-black text-slate-900">{appointment.doctor_name}</p>
                        <p className="text-xs font-bold text-slate-500">#{appointment.id} - {formatMoney(appointment.doctor_payout_amount || settlementForAmount(appointment.amount, platformFeePercent).doctorShare)}</p>
                        {payoutDoctor?.upi_id && <p className="mt-1 truncate text-[11px] font-bold text-slate-400">UPI: {payoutDoctor.upi_id}</p>}
                      </>
                    );
                  })()}
                  {(appointmentEvents[String(appointment.id)] || [])[0] && (
                    <p className="mt-1 truncate text-[11px] font-bold text-slate-400">{(appointmentEvents[String(appointment.id)] || [])[0].title}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {doctorLookup.get(String(appointment.doctor_id))?.upi_id && (
                    <button
                      type="button"
                      aria-label={`Copy UPI for ${appointment.doctor_name}`}
                      title={`Copy UPI for ${appointment.doctor_name}`}
                      onClick={() => copyDoctorUpi(doctorLookup.get(String(appointment.doctor_id))?.upi_id)}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <button onClick={() => markPayoutPaid(appointment)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                    Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pro-card p-5">
        <SectionHeader eyebrow="Directory" title="Registered providers" />
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center justify-between gap-3 hover:border-cyan-200 transition-colors mt-3">
              <div className="min-w-0">
                <h3 className="font-black text-slate-950 text-lg">{doc.name}</h3>
                <p className="text-sm font-bold text-cyan-700">{doc.specialty}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge type={providerStatusTone(providerStatus(doc))}>{providerStatusText(providerStatus(doc))}</Badge>
                {providerStatus(doc) !== 'approved' && (
                  <button onClick={() => reviewProvider(doc, 'approved')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                    Approve
                  </button>
                )}
                {providerStatus(doc) === 'approved' && (
                  <button onClick={() => reviewProvider(doc, 'suspended')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationCenter({ open, notifications, onClose, onMarkRead, onMarkAllRead }) {
  if (!open) return null;

  const unreadCount = notifications.filter(item => !item.read_at).length;

  return (
    <div className="absolute inset-0 z-[90] bg-slate-950/35 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-x-4 top-6 max-h-[82vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] view-panel">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-xs font-black uppercase text-cyan-700">Updates</p>
            <h2 className="text-xl font-black text-slate-950">Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100">
                Mark all
              </button>
            )}
            <button onClick={onClose} className="pro-icon-button h-10 w-10"><X size={17} /></button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {notifications.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <Bell size={30} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-black text-slate-600">No notifications yet.</p>
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMarkRead(item)}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                item.read_at
                  ? 'border-slate-100 bg-slate-50 text-slate-600'
                  : 'border-cyan-100 bg-cyan-50 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed">{item.body}</p>
                </div>
                {!item.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />}
              </div>
              <p className="mt-3 text-[10px] font-black uppercase text-slate-400">{shortDate(item.created_at)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP ROUTER & NAV
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const selectedDate = useMemo(() => new Date(), []);
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [platformFeePercent, setPlatformFeePercent] = useState(DEFAULT_PLATFORM_FEE_PERCENT);
  const unreadNotificationCount = notifications.filter(item => !item.read_at).length;

  const showToast = useCallback((msg, type='success') => {
     setNotification({msg, type});
     setTimeout(() => setNotification(null), 3500);
  }, []);

  const fetchDoctors = useCallback(async () => {
     if (!supabase) {
        setDoctors([]);
        return;
     }

     try {
        const { data, error } = await supabase
          .from('doctors')
          .select()
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDoctors(mergeDoctors(data || []));
     } catch (err) {
        setDoctors([]);
        showToast(friendlyNetworkError(err, 'Unable to load doctors.'), 'error');
     }
  }, [showToast]);

  const fetchPlatformFeePercent = useCallback(async () => {
     if (!supabase) {
        setPlatformFeePercent(DEFAULT_PLATFORM_FEE_PERCENT);
        return;
     }

     try {
        const { data, error } = await supabase.rpc('platform_fee_percent');
        if (error) throw error;
        const nextFee = Number(data);
        setPlatformFeePercent(Number.isFinite(nextFee) ? nextFee : DEFAULT_PLATFORM_FEE_PERCENT);
     } catch {
        setPlatformFeePercent(DEFAULT_PLATFORM_FEE_PERCENT);
     }
  }, []);

  useEffect(() => {
     let active = true;

     const loadData = async (sessionUser) => {
        if (!sessionUser) {
           if (active) {
              setUser(null);
              setView('login');
              setLoadingAuth(false);
           }
           return;
        }

        try {
           const profile = await loadUserProfile(sessionUser);
           if (profile && active) {
              setUser(profile);
              setView(routeForRole(profile.role));
              fetchDoctors();
           }
        } catch (err) {
           if (active) {
              showToast(err.message || 'Unable to load your profile.', 'error');
              setUser(null);
              setView('login');
           }
        }
        if (active) setLoadingAuth(false);
     };

     fetchDoctors();
     fetchPlatformFeePercent();

     if (!supabase) {
        setLoadingAuth(false);
        return () => { active = false; };
     }

     withTimeout(supabase.auth.getSession(), 2500)
       .then(({ data: { session } }) => {
          if (active) loadData(session?.user);
       })
       .catch(() => {
          if (active) {
             setLoadingAuth(false);
             setView('login');
          }
       });

     const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (active) loadData(session?.user);
     });
     
     return () => { 
        active = false; 
        subscription.unsubscribe(); 
     };
  }, [fetchDoctors, fetchPlatformFeePercent, showToast]);

  const fetchPatientAppointments = useCallback(async () => {
     if (user?.id) {
        if (!supabase) {
           setAppointments([]);
           setAppointmentEvents({});
           return;
        }

        try {
           const { data, error } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
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
           showToast(friendlyNetworkError(err, 'Unable to load appointments.'), 'error');
        }
     }
  }, [showToast, user]);

  const fetchNotifications = useCallback(async () => {
     if (!user?.id || !supabase) {
        setNotifications([]);
        return;
     }

     try {
        const { data, error } = await supabase
          .from('notifications')
          .select()
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(40);
        if (error) throw error;
        setNotifications(data || []);
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to load notifications.'), 'error');
     }
  }, [showToast, user]);

  useEffect(() => {
     fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
     if (!supabase || !user?.id || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) {
        return undefined;
     }

     let active = true;
     const listenerHandles = [];

     const savePushToken = async (tokenValue) => {
        const token = String(tokenValue || '').trim();
        if (!token || !active) return;

        const now = new Date().toISOString();
        const platform = Capacitor.getPlatform();
        const deviceId = getStoredDeviceId();
        await supabase
          .from('device_tokens')
          .update({ enabled: false, updated_at: now })
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
          .neq('token', token);
        const { error } = await supabase
          .from('device_tokens')
          .upsert({
             user_id: user.id,
             token,
             platform,
             device_id: deviceId,
             enabled: true,
             last_seen_at: now,
             updated_at: now,
          }, { onConflict: 'user_id,token' });
        if (error) throw error;

        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
     };

     const setupPushNotifications = async () => {
        listenerHandles.push(await PushNotifications.addListener('registration', ({ value }) => {
           savePushToken(value).catch(() => undefined);
        }));
        listenerHandles.push(await PushNotifications.addListener('registrationError', () => undefined));
        listenerHandles.push(await PushNotifications.addListener('pushNotificationReceived', (pushNotification) => {
           if (!active) return;
           showToast(pushNotification.title || 'New booking update', 'info');
           fetchNotifications();
           if (user.role === 'patient') fetchPatientAppointments();
        }));
        listenerHandles.push(await PushNotifications.addListener('pushNotificationActionPerformed', () => {
           if (!active) return;
           setNotificationsOpen(true);
           fetchNotifications();
           if (user.role === 'patient') fetchPatientAppointments();
        }));

        if (Capacitor.getPlatform() === 'android') {
           await PushNotifications.createChannel({
              id: PUSH_CHANNEL_ID,
              name: 'Booking updates',
              description: 'Doctor booking, payment, and payout updates',
              importance: 5,
              visibility: 1,
           }).catch(() => undefined);
        }

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') {
           permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive === 'granted') {
           await PushNotifications.register();
        }
     };

     setupPushNotifications().catch(() => undefined);

     return () => {
        active = false;
        listenerHandles.forEach((handle) => handle.remove());
     };
  }, [fetchNotifications, fetchPatientAppointments, showToast, user]);

  useEffect(() => {
     if (!supabase || !user?.id) return undefined;

     const channel = supabase
       .channel(`notifications-${user.id}`)
       .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload) => {
             const nextNotification = payload.new;
             if (!nextNotification) return;
             setNotifications(prev => [nextNotification, ...prev.filter(item => item.id !== nextNotification.id)].slice(0, 40));
             showToast(nextNotification.title, 'info');
             notifyDevice(nextNotification.title, nextNotification.body);
             if (user.role === 'patient') fetchPatientAppointments();
          }
       )
       .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload) => {
             const updatedNotification = payload.new;
             if (!updatedNotification) return;
             setNotifications(prev => prev.map(item => item.id === updatedNotification.id ? updatedNotification : item));
          }
       )
       .subscribe();

     return () => {
        supabase.removeChannel(channel);
     };
  }, [fetchPatientAppointments, showToast, user]);

  const markNotificationRead = useCallback(async (item) => {
     if (!item || item.read_at) return;
     const readAt = new Date().toISOString();
     setNotifications(prev => prev.map(notificationItem => (
        notificationItem.id === item.id ? { ...notificationItem, read_at: readAt } : notificationItem
     )));
     if (!supabase) return;
     try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: readAt })
          .eq('id', item.id);
        if (error) throw error;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update notification.'), 'error');
        fetchNotifications();
     }
  }, [fetchNotifications, showToast]);

  const markAllNotificationsRead = useCallback(async () => {
     const unreadIds = notifications.filter(item => !item.read_at).map(item => item.id);
     if (!unreadIds.length) return;
     const readAt = new Date().toISOString();
     setNotifications(prev => prev.map(item => item.read_at ? item : { ...item, read_at: readAt }));
     if (!supabase) return;
     try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: readAt })
          .in('id', unreadIds);
        if (error) throw error;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update notifications.'), 'error');
        fetchNotifications();
     }
  }, [fetchNotifications, notifications, showToast]);

  useEffect(() => {
     if (user?.id && user.role === 'patient' && view === 'dashboard') {
        fetchPatientAppointments();
     }
  }, [fetchPatientAppointments, user, view]);

  const handleLogin = (userData) => {
     setUser(userData);
     setView(routeForRole(userData.role));
  };

  const handleLogout = async () => {
     if (supabase) {
        try {
           await disableStoredPushDevice(user?.id);
           await supabase.auth.signOut();
        } catch {
           // Clear local UI state even if the live sign-out request fails.
        }
     }
     setUser(null);
     setView('login');
  };

  const handleSaveProfile = async (profilePatch, doctorPatch = null) => {
     if (!user) return null;

     const cleanProfilePatch = Object.fromEntries(
        Object.entries(profilePatch || {}).filter(([, value]) => value !== undefined)
     );

     if (!supabase) {
        showToast('Live backend is not configured.', 'error');
        return null;
     }

     try {
        let updatedProvider = null;
        const { data, error } = await supabase
          .from('users')
          .update(cleanProfilePatch)
          .eq('id', user.id)
          .select(USER_PROFILE_FIELDS)
          .single();
        if (error) throw error;

        if (doctorPatch && user.doctorId) {
           const { data: updatedDoctor, error: doctorError } = await supabase
             .from('doctors')
             .update(doctorPatch)
             .eq('id', user.doctorId)
             .select()
             .single();
           if (doctorError) throw doctorError;
           if (updatedDoctor) {
              updatedProvider = updatedDoctor;
              setDoctors(prev => mergeDoctors([updatedDoctor], prev));
           }
        }

        const savedProfile = { ...user, ...data };
        setUser(savedProfile);
        const needsProviderReview = doctorPatch && updatedProvider?.verification_status === 'pending';
        showToast(needsProviderReview ? 'Profile updated. Admin review is required before patients can book again.' : 'Profile updated.', needsProviderReview ? 'info' : 'success');
        return savedProfile;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update profile.'), 'error');
        throw err;
     }
  };

  const initiateBooking = async () => {
     if (!selectedSlot || !selectedDoctor || !user) return;
     if (!supabase) {
         showToast("Live backend is not configured.", "error");
         return;
     }

     try {
         const { error } = await supabase.rpc('create_appointment_request', {
           p_doctor_id: selectedDoctor.id,
           p_slot: selectedSlot,
           p_appointment_date: selectedDate.toISOString(),
         });
         if (error) throw error;
         showToast("Booking request sent successfully!", "success");
         dispatchPushNotifications();
         setView('success');
     } catch (err) {
         showToast(friendlyNetworkError(err, "Unable to send booking request."), 'error');
     }
  };

  const handlePayCash = async (appt) => {
     if (!supabase) {
         showToast("Live backend is not configured.", "error");
         return;
     }

     try {
         const { error } = await supabase.rpc('submit_appointment_payment', {
           p_appointment_id: appt.id,
           p_payment_mode: 'Cash',
           p_transaction_id: null,
           p_receiver_upi: 'Cash at clinic',
         });
         if (error) throw error;
         showToast("Cash payment request sent for admin verification.", "info");
         dispatchPushNotifications();
         fetchPatientAppointments();
     } catch (err) {
         showToast(friendlyNetworkError(err, "Unable to update payment mode."), "error");
     }
  };

  const handleOpenUpi = async (appt) => {
      let doctor = doctors.find((item) => String(item.id) === String(appt.doctor_id));
      if (!doctor && supabase) {
        try {
          const { data } = await supabase
            .from('doctors')
            .select('name, upi_id')
            .eq('id', appt.doctor_id)
            .maybeSingle();
          doctor = data;
        } catch {
          doctor = null;
        }
      }
      const amount = numericAmount(appt.amount);
      const receiver = paymentReceiverFor(doctor);

      if (!receiver.upi) {
        showToast('No UPI handle is configured for this payment yet.', 'error');
        return;
      }

      const params = new URLSearchParams({
        pa: receiver.upi,
        pn: receiver.name || ADMIN_NAME,
        am: amount.toString(),
        cu: 'INR',
        tn: `Raphael appointment ${appt.id}`,
      });
      window.location.href = `upi://pay?${params.toString()}`;
      showToast(`UPI opened. Submit the UTR after paying ${receiver.type === 'clinic' ? 'the clinic' : 'the doctor'}.`, 'info');
  };

  const handleSubmitPayment = async (appt, utrValue) => {
      const utr = cleanUtr(utrValue);
      if (utr.length < 6) {
        showToast('Enter a valid UTR or transaction ID after paying.', 'error');
        return;
      }

      if (!supabase) {
        showToast("Live backend is not configured.", "error");
        return;
      }

      let doctor = doctors.find((item) => String(item.id) === String(appt.doctor_id));
      if (!doctor) {
        try {
          const { data } = await supabase
            .from('doctors')
            .select('name, upi_id')
            .eq('id', appt.doctor_id)
            .maybeSingle();
          doctor = data;
        } catch {
          doctor = null;
        }
      }
      const receiver = paymentReceiverFor(doctor);
      if (!receiver.upi) {
        showToast('No UPI handle is configured for this payment yet.', 'error');
        return;
      }

      try {
        const { error } = await supabase.rpc('submit_appointment_payment', {
          p_appointment_id: appt.id,
          p_payment_mode: 'UPI',
          p_transaction_id: utr,
          p_receiver_upi: receiver.upi,
        });
        if (error) throw error;
        showToast("UTR submitted. Admin will verify the payment.", "info");
        dispatchPushNotifications();
        fetchPatientAppointments();
      } catch (err) {
        showToast(friendlyNetworkError(err, "Unable to submit payment proof."), "error");
      }
  };

  const doctorProfile = user?.doctorId
    ? doctors.find((doctor) => String(doctor.id) === String(user.doctorId))
    : null;

  if (loadingAuth) {
     return (
       <div className="min-h-screen flex items-center justify-center app-canvas">
         <div className="pro-card p-6 flex items-center gap-4">
           <img src={APP_ICON} alt="Rapha'l" className="w-12 h-12 rounded-lg object-cover" />
           <Loader2 className="animate-spin text-cyan-500" size={28} strokeWidth={3} />
         </div>
       </div>
     );
  }

  return (
     <div className="min-h-screen app-canvas font-sans text-slate-900 flex justify-center selection:bg-cyan-100 relative">
        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 px-5 py-3 rounded-lg shadow-[0_18px_50px_rgba(15,23,42,0.18)] flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300">
            {notification.type === 'error' ? <X size={18} className="text-red-500" /> : <CheckCircle size={18} className={notification.type === 'info' ? "text-sky-500" : "text-emerald-500"} />}
            <span className="text-sm font-bold">{notification.msg}</span>
          </div>
        )}

        <div className="w-full sm:max-w-[430px] bg-white min-h-screen sm:min-h-[calc(100vh-2rem)] sm:my-4 relative app-frame overflow-hidden flex flex-col">
           {view === 'login' && (
             <LoginScreen
               onLogin={handleLogin}
               showToast={showToast}
               supabase={supabase}
               hasSupabaseConfig={hasSupabaseConfig}
               supabaseConfigStatus={supabaseConfigStatus}
               loadUserProfile={loadUserProfile}
               saveUserProfile={saveUserProfile}
               normalizeEmail={normalizeEmail}
               friendlyNetworkError={friendlyNetworkError}
               specialtyOptions={uniqueSpecialties()}
               appIcon={APP_ICON}
             />
           )}
           {view === 'admin' && <AdminDashboard user={user} logout={handleLogout} doctors={doctors} showToast={showToast} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} onDoctorsChanged={fetchDoctors} platformFeePercent={platformFeePercent} onPlatformFeeChanged={setPlatformFeePercent} />}
           {view === 'doctor_dashboard' && <DoctorDashboard user={user} doctor={doctorProfile} logout={handleLogout} showToast={showToast} onSaveProfile={handleSaveProfile} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} />}
           
           {['home', 'search', 'detail', 'dashboard', 'profile', 'success'].includes(view) && user && user.role === 'patient' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                 <div key={view} className="flex-1 overflow-y-auto scrollbar-hide view-panel">
                    {view === 'home' && <HomeView setView={setView} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} />}
                    {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={setView} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
                    {view === 'detail' && <DoctorDetailView doctor={selectedDoctor} setView={setView} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} handleBook={initiateBooking} />}
                    {view === 'dashboard' && <DashboardView appointments={appointments} appointmentEvents={appointmentEvents} doctors={doctors} onOpenUpi={handleOpenUpi} onSubmitPayment={handleSubmitPayment} onPayCash={handlePayCash} platformFeePercent={platformFeePercent} />}
                    {view === 'profile' && <ProfileView user={user} logout={handleLogout} onSaveProfile={handleSaveProfile} />}
                    {view === 'success' && (
                       <div className="flex flex-col items-center justify-center text-center p-6 h-full app-screen">
                          <div className="pro-card p-8 w-full">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6 mx-auto shadow-xl shadow-emerald-500/20 animate-in zoom-in-75 duration-300"><CheckCircle size={48} className="text-white" /></div>
                            <h1 className="text-3xl font-black mb-3 text-slate-950">Request sent</h1>
                            <p className="text-slate-500 font-semibold mb-8">Your booking request is waiting for the doctor to approve it.</p>
                            <Button onClick={() => setView('dashboard')} variant="accent" className="w-full mb-3 shadow-none">View Appointments</Button>
                            <Button onClick={() => setView('home')} variant="secondary" className="w-full">Back to Home</Button>
                          </div>
                       </div>
                    )}
                 </div>

                 {!['detail', 'success', 'login'].includes(view) && (
                    <div className="absolute bottom-0 w-full px-5 pb-5 pt-2 z-40 pointer-events-none">
                       <div className="bg-white/95 backdrop-blur-2xl border border-slate-200 p-2 rounded-xl flex justify-around items-center shadow-[0_20px_50px_rgba(15,23,42,0.14)] pointer-events-auto">
                         {[
                           { id: 'home', icon: Zap, label: 'Home' },
                           { id: 'search', icon: Search, label: 'Search' },
                           { id: 'dashboard', icon: Calendar, label: 'Visits' },
                           { id: 'profile', icon: User, label: 'Profile' },
                           { id: 'alerts', icon: Bell, label: 'Alerts', action: () => setNotificationsOpen(true) }
                         ].map(item => (
                           <button
                             key={item.id}
                             onClick={() => item.action ? item.action() : setView(item.id)}
                             className={`relative flex flex-col items-center gap-1 w-16 py-2 rounded-lg transition-all duration-300 ${view === item.id ? 'text-white bg-slate-950 shadow-md shadow-slate-900/15' : 'text-slate-500 hover:text-cyan-700 hover:bg-cyan-50'}`}
                           >
                             <item.icon size={22} strokeWidth={view === item.id ? 2.5 : 2} className={view === item.id ? 'animate-in zoom-in-75 duration-200' : ''} />
                             {item.id === 'alerts' && unreadNotificationCount > 0 && <span className="absolute right-2 top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-black leading-4 text-white">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span>}
                             <span className="text-[9px] font-extrabold uppercase">{item.label}</span>
                           </button>
                         ))}
                       </div>
                    </div>
                 )}
              </div>
           )}
           {user && (
             <NotificationCenter
               open={notificationsOpen}
               notifications={notifications}
               onClose={() => setNotificationsOpen(false)}
               onMarkRead={markNotificationRead}
               onMarkAllRead={markAllNotificationsRead}
             />
           )}
        </div>
     </div>
  );
}
