import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Calendar, Clock, MapPin, Star, Shield, Activity, User, CheckCircle, X,
  ArrowRight, Loader2, EyeOff, Check, LogOut, MessageSquare, Send, 
  ChevronLeft, IndianRupee, Zap, Mail, Lock, Sparkles, ChevronRight, Mic, MicOff, Volume2,
  HeartPulse, Stethoscope, Video, Wallet, TrendingUp, Users, ClipboardCheck, Bell,
  PhoneCall, MapPinned, BadgeCheck, Timer, ArrowUpRight, Brain, Bone, Eye,
  Edit3, Save, Bot, AlertTriangle, FileText
} from 'lucide-react';
import { hasSupabaseConfig, supabase } from './lib/supabaseClient';
import appIcon from '../icons/icon-128.webp';

const APP_ICON = appIcon;
const AI_ASSISTANT_ENDPOINT = import.meta.env.VITE_AI_ASSISTANT_ENDPOINT || (import.meta.env.PROD ? '/api/ai-assistant' : '');
const REALTIME_SESSION_ENDPOINT = import.meta.env.VITE_REALTIME_SESSION_ENDPOINT || import.meta.env.VITE_REALTIME_TOKEN_ENDPOINT || (import.meta.env.PROD ? '/api/realtime-session' : '');
const GEMINI_VOICE_ENDPOINT = import.meta.env.VITE_GEMINI_VOICE_ENDPOINT || (import.meta.env.PROD ? '/api/gemini-voice' : '');
const VOICE_PROVIDER = import.meta.env.VITE_VOICE_PROVIDER || 'gemini';

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

const EMERGENCY_TERMS = [
  'severe chest pain',
  'trouble breathing',
  'cannot breathe',
  'fainting',
  'stroke',
  'seizure',
  'heavy bleeding',
  'unconscious',
  'suicidal',
];

const SYMPTOM_RULES = [
  {
    specialty: 'Cardiologist',
    urgency: 'urgent',
    terms: ['chest pain', 'pressure in chest', 'heart pain', 'palpitation', 'shortness of breath', 'breathless', 'high bp', 'blood pressure'],
    advice: 'Chest discomfort or breathing trouble can become urgent. If it is severe, sudden, spreading to the arm/jaw, or with sweating/fainting, seek emergency care now.',
  },
  {
    specialty: 'Neurologist',
    urgency: 'soon',
    terms: ['migraine', 'severe headache', 'headache', 'dizzy', 'dizziness', 'numbness', 'weakness', 'memory', 'seizure'],
    advice: 'A neurologist is a good match for recurring headaches, migraine, dizziness, numbness, seizure-like episodes, or nerve symptoms.',
  },
  {
    specialty: 'Dermatologist',
    urgency: 'routine',
    terms: ['rash', 'itching', 'skin', 'acne', 'allergy on skin', 'spots', 'eczema', 'hair fall'],
    advice: 'A dermatologist can help with rashes, acne, itching, hair fall, and skin allergy symptoms.',
  },
  {
    specialty: 'Orthopedic',
    urgency: 'routine',
    terms: ['joint', 'knee', 'back pain', 'bone', 'fracture', 'sprain', 'shoulder', 'neck pain', 'arthritis'],
    advice: 'An orthopedic specialist is a strong fit for joint, back, bone, sprain, fracture, or mobility-related pain.',
  },
  {
    specialty: 'Ophthalmologist',
    urgency: 'soon',
    terms: ['eye', 'vision', 'blurred vision', 'red eye', 'eye pain', 'watery eyes', 'sight'],
    advice: 'An ophthalmologist is best for eye pain, blurred vision, redness, watering, or sight changes.',
  },
  {
    specialty: 'General Physician',
    urgency: 'routine',
    terms: ['fever', 'flu', 'cough', 'cold', 'pain', 'stomach', 'vomit', 'diarrhea', 'weakness', 'body ache', 'infection'],
    advice: 'A general physician is a good first step for fever, flu, cough, stomach issues, weakness, body aches, and general illness.',
  },
];

const generateCareGuidance = (input, doctors = []) => {
  const query = input.trim().toLowerCase();
  if (!query) {
    return {
      specialty: null,
      shouldSearch: false,
      searchQuery: '',
      response: "Tell me what you are feeling, for example fever, chest discomfort, rash, headache, or joint pain.",
    };
  }

  const urgentTerm = EMERGENCY_TERMS.find(term => query.includes(term));
  if (urgentTerm) {
    return {
      specialty: 'Emergency Care',
      shouldSearch: false,
      searchQuery: '',
      response: "This may need urgent care. Please contact local emergency services or visit the nearest emergency department now.",
    };
  }

  const scoredRules = SYMPTOM_RULES
    .map(rule => ({
      ...rule,
      score: rule.terms.reduce((score, term) => score + (query.includes(term) ? term.length : 0), 0),
    }))
    .filter(rule => rule.score > 0)
    .sort((a, b) => b.score - a.score);

  const matchedRule = scoredRules[0];
  const matchedKeyword = !matchedRule && Object.keys(SYMPTOM_MAP).find(keyword => query.includes(keyword));
  const specialty = matchedRule?.specialty || (matchedKeyword ? SYMPTOM_MAP[matchedKeyword] : null);
  const matchingDoctors = specialty ? doctors.filter(doctor => doctor.specialty === specialty) : [];

  if (specialty) {
    const availability = matchingDoctors.length
      ? `I found ${matchingDoctors.length} ${specialty.toLowerCase()} option${matchingDoctors.length === 1 ? '' : 's'} for you.`
      : `I can search for ${specialty.toLowerCase()} options for you.`;
    const urgencyNote = matchedRule?.urgency === 'urgent'
      ? 'Please treat this as time-sensitive if symptoms feel intense or sudden.'
      : 'Book a visit if symptoms persist, worsen, or worry you.';

    return {
      specialty,
      shouldSearch: true,
      searchQuery: specialty,
      response: `${availability} ${matchedRule?.advice || 'This is guidance, not a diagnosis.'} ${urgencyNote}`,
    };
  }

  return {
    specialty: null,
    shouldSearch: false,
    searchQuery: '',
    response: "I need one or two more details to route you well. What is the main symptom, how long has it been happening, and is it mild, moderate, or severe?",
  };
};

const askCareAssistant = async (input, doctors = []) => {
  const fallbackGuidance = generateCareGuidance(input, doctors);
  if (!AI_ASSISTANT_ENDPOINT) return { ...fallbackGuidance, provider: 'local' };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(AI_ASSISTANT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: input,
        locale: 'en-IN',
        safety: 'non_diagnostic_triage',
        preferredProviders: ['openai', 'gemini'],
        doctors: doctors.slice(0, 20).map(doctor => ({
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          district: doctor.district,
          nextSlot: nextSlotFor(doctor),
        })),
      }),
    });

    if (!response.ok) throw new Error('AI endpoint unavailable');
    const data = await response.json();
    return {
      specialty: data.specialty || fallbackGuidance.specialty,
      shouldSearch: Boolean(data.shouldSearch ?? fallbackGuidance.shouldSearch),
      searchQuery: data.searchQuery || data.specialty || fallbackGuidance.searchQuery,
      response: data.response || fallbackGuidance.response,
      provider: data.provider || 'ai',
    };
  } catch {
    return {
      ...fallbackGuidance,
      provider: 'local',
      response: `${fallbackGuidance.response} I used the built-in triage logic because the AI service is not reachable right now.`,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const blobToBase64 = (blob) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  })
);

const numericAmount = (value) => {
  const match = String(value || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const amount = Number(match?.[0]);
  return Number.isFinite(amount) && amount > 0 ? amount : 500;
};

const displayAmount = (value) => `Rs. ${numericAmount(value)}`;
const uniqueSpecialties = () => Array.from(new Set(Object.values(SYMPTOM_MAP)));
const specialtyMeta = (specialty) => SPECIALTY_META[specialty] || FALLBACK_SPECIALTY_META;
const nextSlotFor = (doctor) => doctor?.slots?.[0] || 'Today';
const ratingLabel = (rating) => Number(rating || 5).toFixed(1).replace('.0', '');
const shortDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const normalizeSlots = (value) => (
  Array.isArray(value)
    ? value
    : String(value || '').split(',').map(slot => slot.trim()).filter(Boolean)
);
const doctorDisplayName = (name) => (String(name || '').startsWith('Dr.') ? name : `Dr. ${name || 'Provider'}`);

const USER_PROFILE_FIELDS = 'id, email, name, role, phone, district, address, blood_group, allergies, doctorId';
const MOCK_OTP_CODE = '123456';
const STORAGE_KEYS = {
  accounts: 'raphael.mock.accounts',
  session: 'raphael.mock.session',
  doctors: 'raphael.mock.doctors',
  appointments: 'raphael.mock.appointments',
};

const DEFAULT_DOCTORS = [
  {
    id: 91001,
    name: 'Dr. Asha Jamir',
    specialty: 'General Physician',
    rating: 4.9,
    reviews: 126,
    image: '',
    district: 'Dimapur',
    clinic_name: 'Raphael Demo Clinic',
    location: 'Dimapur',
    experience: '8 Years',
    bio: 'Demo physician for fever, flu, pain, and routine consultations.',
    price: 'Rs. 500',
    upi_id: '',
    slots: ['09:00 AM', '10:30 AM', '02:00 PM'],
  },
  {
    id: 91002,
    name: 'Dr. Meera Ao',
    specialty: 'Dermatologist',
    rating: 4.8,
    reviews: 88,
    image: '',
    district: 'Kohima',
    clinic_name: 'Skin & Wellness Demo',
    location: 'Kohima',
    experience: '6 Years',
    bio: 'Demo dermatologist for rash, acne, and skin irritation guidance.',
    price: 'Rs. 650',
    upi_id: '',
    slots: ['11:00 AM', '01:00 PM', '04:00 PM'],
  },
  {
    id: 91003,
    name: 'Dr. Imkong Walling',
    specialty: 'Cardiologist',
    rating: 5.0,
    reviews: 64,
    image: '',
    district: 'Dimapur',
    clinic_name: 'Heart Care Demo',
    location: 'Dimapur',
    experience: '12 Years',
    bio: 'Demo cardiologist for non-emergency heart and blood-pressure concerns.',
    price: 'Rs. 900',
    upi_id: '',
    slots: ['09:30 AM', '12:00 PM', '03:30 PM'],
  },
];

const normalizeEmail = (value) => value.trim().toLowerCase();

const readStoredJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStoredJson = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const encodeMockPassword = (password) => (
  Array.from(password)
    .map((char, index) => (char.charCodeAt(0) + index + 31).toString(36))
    .join('.')
);

const createLocalId = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
};

const createLocalDoctorId = () => 92000 + Math.floor(Math.random() * 7000);

const withoutPassword = (account) => {
  const profile = { ...account };
  delete profile.passwordHash;
  return profile;
};

const getMockAccounts = () => readStoredJson(STORAGE_KEYS.accounts, []);

const saveMockAccounts = (accounts) => writeStoredJson(STORAGE_KEYS.accounts, accounts);

const getMockSession = () => readStoredJson(STORAGE_KEYS.session, null);

const saveMockSession = (profile) => writeStoredJson(STORAGE_KEYS.session, profile);

const clearMockSession = () => window.localStorage.removeItem(STORAGE_KEYS.session);

const isMockUser = (profile) => Boolean(profile?.isMock);

const getLocalDoctors = () => readStoredJson(STORAGE_KEYS.doctors, []);

const saveLocalDoctors = (doctors) => writeStoredJson(STORAGE_KEYS.doctors, doctors);

const mergeDoctors = (...groups) => {
  const seen = new Set();
  return groups.flat().filter((doctor) => {
    if (!doctor?.id || seen.has(String(doctor.id))) return false;
    seen.add(String(doctor.id));
    return true;
  });
};

const upsertLocalDoctor = (doctor) => {
  const doctors = getLocalDoctors();
  const index = doctors.findIndex((item) => String(item.id) === String(doctor.id));
  const nextDoctors = index >= 0
    ? doctors.map((item, itemIndex) => (itemIndex === index ? { ...item, ...doctor } : item))
    : [...doctors, doctor];
  saveLocalDoctors(nextDoctors);
  return doctor;
};

const getLocalAppointments = () => readStoredJson(STORAGE_KEYS.appointments, []);

const saveLocalAppointments = (appointments) => writeStoredJson(STORAGE_KEYS.appointments, appointments);

const saveLocalAppointment = (appointment) => {
  const nextAppointment = {
    ...appointment,
    id: appointment.id || createLocalId('mock-appt'),
    isMock: true,
    created_at: appointment.created_at || new Date().toISOString(),
  };
  saveLocalAppointments([nextAppointment, ...getLocalAppointments()]);
  return nextAppointment;
};

const updateLocalAppointment = (id, patch) => {
  let updatedAppointment = null;
  const appointments = getLocalAppointments().map((appointment) => {
    if (String(appointment.id) !== String(id)) return appointment;
    updatedAppointment = { ...appointment, ...patch };
    return updatedAppointment;
  });
  saveLocalAppointments(appointments);
  return updatedAppointment;
};

const getLocalPatientAppointments = (patientId) => (
  getLocalAppointments()
    .filter((appointment) => String(appointment.patient_id) === String(patientId))
    .sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date))
);

const getLocalDoctorAppointments = (doctorId) => (
  getLocalAppointments()
    .filter((appointment) => String(appointment.doctor_id) === String(doctorId))
    .sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date))
);

const createMockAccount = ({ email, password, name, phone, role, specialty, price, doctorUpi }) => {
  const normalizedEmail = normalizeEmail(email);
  const accounts = getMockAccounts();

  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error('A demo account already exists for this email. Please sign in.');
  }

  const profile = {
    id: createLocalId('mock-user'),
    email: normalizedEmail,
    name: name.trim(),
    role,
    phone: phone.trim(),
    district: 'Dimapur',
    address: '',
    blood_group: '',
    allergies: '',
    isMock: true,
  };

  if (role === 'doctor') {
    const doctor = upsertLocalDoctor({
      id: createLocalDoctorId(),
      name: doctorDisplayName(profile.name),
      specialty,
      rating: 5.0,
      reviews: 0,
      image: '',
      district: 'Dimapur',
      clinic_name: `${profile.name} Clinic`,
      location: 'Online',
      experience: '1 Year',
      bio: 'Demo provider created through OTP signup.',
      price: displayAmount(price),
      upi_id: doctorUpi.trim(),
      slots: ['09:00 AM', '10:00 AM', '02:00 PM'],
      owner_id: profile.id,
      isMock: true,
    });
    profile.doctorId = doctor.id;
  }

  const account = {
    ...profile,
    passwordHash: encodeMockPassword(password),
  };
  saveMockAccounts([...accounts, account]);
  saveMockSession(profile);
  return profile;
};

const loginMockAccount = (email, password) => {
  const account = getMockAccounts().find((item) => item.email === normalizeEmail(email));
  if (!account || account.passwordHash !== encodeMockPassword(password)) return null;

  const profile = withoutPassword(account);
  saveMockSession(profile);
  return profile;
};

const updateMockAccount = (userId, patch) => {
  let updatedProfile = null;
  const accounts = getMockAccounts().map((account) => {
    if (String(account.id) !== String(userId)) return account;
    const updatedAccount = { ...account, ...patch };
    updatedProfile = withoutPassword(updatedAccount);
    return updatedAccount;
  });
  saveMockAccounts(accounts);
  if (updatedProfile) saveMockSession(updatedProfile);
  return updatedProfile;
};

const updateLocalDoctorProfile = (doctorId, patch) => {
  let updatedDoctor = null;
  const doctors = getLocalDoctors().map((doctor) => {
    if (String(doctor.id) !== String(doctorId)) return doctor;
    updatedDoctor = { ...doctor, ...patch };
    return updatedDoctor;
  });
  if (!updatedDoctor) {
    const baseDoctor = DEFAULT_DOCTORS.find((doctor) => String(doctor.id) === String(doctorId));
    if (baseDoctor) {
      updatedDoctor = { ...baseDoctor, ...patch };
      doctors.push(updatedDoctor);
    }
  }
  saveLocalDoctors(doctors);
  return updatedDoctor;
};

const friendlyNetworkError = (err, fallback) => {
  const message = err?.message || '';
  if (/failed to fetch|network|fetch/i.test(message)) {
    return `Could not reach the live server from this deployment. Check the Vercel environment variables, Supabase project status, and browser network access.${message ? ` Details: ${message}` : ''}`;
  }
  return message || fallback;
};

const routeForRole = (role) => {
  if (role === 'admin') return 'admin';
  if (role === 'doctor') return 'doctor_dashboard';
  return 'home';
};

const profileFromAuthUser = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Patient',
  role: authUser.user_metadata?.role || 'patient',
  phone: authUser.user_metadata?.phone || '',
  district: authUser.user_metadata?.district || 'Dimapur',
  address: authUser.user_metadata?.address || '',
  blood_group: authUser.user_metadata?.blood_group || '',
  allergies: authUser.user_metadata?.allergies || '',
});

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
    query = query.or(`owner_id.eq.${profile.id},name.eq.${profile.name}`);
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

  await supabase
    .from('users')
    .update({ doctorId: doctor.id })
    .eq('id', authUser.id);

  return { ...profile, doctorId: doctor.id };
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

  const profile = {
    ...profileFromAuthUser(authUser),
    ...profileInput,
    id: authUser.id,
    email: authUser.email,
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(profile, { onConflict: 'id' })
    .select(USER_PROFILE_FIELDS)
    .single();

  if (error) throw error;
  return ensureDoctorProfile(authUser, data);
};

// ==========================================
// PREMIUM UI COMPONENTS
// ==========================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-6 py-3.5 rounded-lg font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 outline-none focus:ring-4";
  const variants = {
    primary: "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 focus:ring-slate-900/15",
    accent: "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:brightness-105 focus:ring-cyan-500/20",
    secondary: "bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-cyan-200 hover:bg-cyan-50/50 focus:ring-cyan-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus:ring-red-100",
    ghost: "bg-transparent text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 focus:ring-cyan-50",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-700 focus:ring-cyan-100"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed saturate-50' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-sky-50 text-sky-700 border border-sky-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    dark: "bg-slate-950 text-white border border-slate-800"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-extrabold uppercase shadow-sm ${styles[type]}`}>
      {children}
    </span>
  );
};

const Avatar = ({ name, url, size = "md", specialty }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-xl", lg: "w-24 h-24 text-4xl", xl: "w-28 h-28 text-5xl" };
  const initial = name ? name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D';
  const meta = specialtyMeta(specialty);
  
  if (url) return <img src={url} alt={name} className={`${sizes[size]} rounded-lg object-cover shadow-md ring-4 ring-white`} />;
  
  return (
    <div className={`${sizes[size]} rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/10 ring-4 ring-white relative overflow-hidden`}>
      <div className="absolute inset-0 pro-avatar-pattern" />
      {initial}
      <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-sm"></div>
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
      className={`group pro-card w-full text-left ${featured ? 'p-5' : 'p-4'} hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10`}
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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-700 border border-amber-100">
              <Star size={12} className="fill-amber-400 text-amber-400" /> {ratingLabel(doctor.rating)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-slate-600 border border-slate-100">
              <MapPin size={12} /> {doctor.district || 'Nagaland'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${meta.soft}`}>
              {React.createElement(Icon, { size: 12 })} {meta.label}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Timer size={14} className="text-emerald-600" />
              <span>{nextSlotFor(doctor)}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-black text-cyan-700">
              Book <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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

function LoginView({ onLogin, showToast }) {
  const [mode, setMode] = useState('login'); 
  const [isVisible, setIsVisible] = useState(false); 
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient');
  const [specialty, setSpecialty] = useState('General Physician');
  const [price, setPrice] = useState(''); 
  const [doctorUpi, setDoctorUpi] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpCode, setOtpCode] = useState(MOCK_OTP_CODE);
  const [authMode, setAuthMode] = useState(hasSupabaseConfig ? 'live' : 'mock');

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let liveError = null;
      if (supabase) {
        try {
          const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginError) throw loginError;

          const profile = await loadUserProfile(data.user);
          onLogin(profile);
          return;
        } catch (err) {
          liveError = err;
        }
      }

      const mockProfile = loginMockAccount(email.trim(), password);
      if (mockProfile) {
        if (showToast) showToast(supabase ? `Live sign in is unavailable, using ${mockProfile.name}'s device account.` : `Welcome back, ${mockProfile.name}!`);
        onLogin(mockProfile);
        return;
      }

      if (liveError) throw liveError;
      throw new Error('No account found. Create one with live signup or the demo OTP flow.');
    } catch (err) {
      setError(friendlyNetworkError(err, 'Unable to sign in. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (role === 'doctor') {
      const consultationFee = Number(price);
      if (!Number.isFinite(consultationFee) || consultationFee <= 0) {
        setError('Doctors must set a valid consultation fee.');
        return;
      }
      if (!doctorUpi.trim()) {
        setError('Doctors must provide a UPI ID for payouts.');
        return;
      }
    }

    const normalizedEmail = normalizeEmail(email);
    const registration = {
      name: name.trim(),
      phone: phone.trim(),
      role,
      specialty,
      price,
      doctorUpi,
      email: normalizedEmail,
      password,
    };

    if (authMode === 'live') {
      if (!supabase) {
        setError('Live Supabase auth is not configured in this build. Use demo OTP or add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: registration.name,
              phone: registration.phone,
              role,
              district: 'Dimapur',
              specialty: role === 'doctor' ? specialty : undefined,
              consultationFee: role === 'doctor' ? Number(price) : undefined,
              doctorUpi: role === 'doctor' ? doctorUpi.trim() : undefined,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data?.user) throw new Error('Live auth did not return a new user.');

        if (!data.session) {
          if (showToast) showToast('Live account created. Verify your email, then sign in.', 'success');
          setMode('login');
          return;
        }

        const currentUser = await saveUserProfile(data.user, {
          name: registration.name,
          phone: registration.phone,
          role,
          district: 'Dimapur',
        });
        if (showToast) showToast(`Welcome to Rapha'l, ${currentUser.name}!`, 'success');
        onLogin(currentUser);
      } catch (err) {
        setError(friendlyNetworkError(err, 'Unable to create account on the live server.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (getMockAccounts().some((account) => account.email === normalizedEmail)) {
      setError('A demo account already exists for this email. Please sign in.');
      return;
    }

    const nextOtpCode = MOCK_OTP_CODE;
    setPendingRegistration(registration);
    setOtpCode(nextOtpCode);
    setOtpInput('');
    setError('');
    setMode('otp');
    if (showToast) showToast(`Demo OTP: ${nextOtpCode}`, 'info');
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!pendingRegistration) {
      setMode('register');
      return;
    }
    if (otpInput.trim() !== otpCode) {
      setError('Incorrect demo OTP. Use the code shown on this screen.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const currentUser = createMockAccount(pendingRegistration);
      if (showToast) showToast(`Demo account verified. Welcome to Rapha'l, ${currentUser.name}!`);
      onLogin(currentUser);
    } catch (err) {
      setError(err.message || 'Unable to create demo account right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtpCode(MOCK_OTP_CODE);
    setOtpInput('');
    setError('');
    if (showToast) showToast(`Demo OTP: ${MOCK_OTP_CODE}`, 'info');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      setError('Enter your email address first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (!supabase) {
        if (showToast) showToast('Demo mode: create a new account with OTP 123456.', 'info');
        setMode('register');
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      if (showToast) showToast('Password reset email sent.', 'info');
      setMode('login');
    } catch (err) {
      setError(friendlyNetworkError(err, 'Unable to send reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden font-sans">
      <div className={`w-full max-w-md pro-auth-card p-6 sm:p-8 z-10 transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <img src={APP_ICON} alt="Rapha'l" className="w-14 h-14 rounded-lg object-cover shadow-lg shadow-cyan-900/10" />
              <div>
                <h1 className="text-3xl font-black text-slate-950">Rapha'l</h1>
                <p className="text-xs font-black text-cyan-700 uppercase">Care OS</p>
              </div>
            </div>
            <Badge type="dark"><Shield size={12} /> Pro</Badge>
          </div>
          <div className="pro-hero-strip p-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-cyan-100">Pro care workspace</p>
                <h2 className="text-3xl font-black mt-1 leading-tight">Sign in to a smarter clinic flow.</h2>
              </div>
              <div className="rounded-lg bg-white/15 p-2 border border-white/20">
                <Zap size={20} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/12 p-2">
                <p className="text-[10px] font-bold text-cyan-100">Auth</p>
                <p className="text-sm font-black">{hasSupabaseConfig ? 'Live' : 'Demo'}</p>
              </div>
              <div className="rounded-lg bg-white/12 p-2">
                <p className="text-[10px] font-bold text-cyan-100">Backup</p>
                <p className="text-sm font-black">OTP</p>
              </div>
              <div className="rounded-lg bg-white/12 p-2">
                <p className="text-[10px] font-bold text-cyan-100">Voice</p>
                <p className="text-sm font-black">AI</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/12 border border-white/15 p-3 flex items-center gap-2">
                <Bot size={17} className="text-cyan-100" />
                <span className="text-xs font-black">AI triage ready</span>
              </div>
              <div className="rounded-lg bg-white/12 border border-white/15 p-3 flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-100" />
                <span className="text-xs font-black">Urgency aware</span>
              </div>
            </div>
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-slate-400"><Mail size={18} /></div>
                  <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" required />
              </div>
              <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-slate-400"><Lock size={18} /></div>
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-colors"><EyeOff size={18} /></button>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center py-3 rounded-xl">{error}</div>}
            
            <div className="pt-2">
              <Button className="w-full py-4 text-lg" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
            </div>
            
            <button type="button" onClick={() => setMode('forgot')} className="w-full text-center text-cyan-700 text-sm hover:text-cyan-900 transition-colors font-bold">
                Forgot password?
            </button>
            <button type="button" onClick={() => setMode('register')} className="w-full text-center mt-4 text-slate-500 text-sm hover:text-cyan-700 transition-colors flex items-center justify-center gap-2 group font-medium">
                Create new account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handlePasswordReset} className="space-y-5">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-black text-slate-900">Reset your password</h2>
              <p className="text-sm font-medium text-slate-500">We will send a secure reset link to your email.</p>
            </div>
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-slate-400"><Mail size={18} /></div>
              <input type="email" placeholder="Email Address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" required />
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center py-3 rounded-xl">{error}</div>}
            <Button className="w-full py-4 text-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
            </Button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center pt-2 text-slate-500 text-sm hover:text-cyan-700 transition-colors">
              Back to sign in
            </button>
          </form>
        ) : mode === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-black text-slate-900">Verify demo OTP</h2>
              <p className="text-sm font-medium text-slate-500">Use this demo code to finish signup.</p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4 text-center">
              <span className="block text-[10px] font-black uppercase text-cyan-700 mb-2">Demo OTP</span>
              <span className="text-3xl font-black text-slate-900">{otpCode}</span>
            </div>

            <div className="group relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-cyan-500 text-slate-400"><Lock size={18} /></div>
              <input inputMode="numeric" maxLength="6" placeholder="Enter OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all text-center font-black" required />
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold text-center py-3 rounded-xl">{error}</div>}

            <Button className="w-full py-4 text-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Verify & Create Account"}
            </Button>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={handleResendOtp} className="text-center text-cyan-700 text-sm hover:text-cyan-900 transition-colors font-bold">
                Resend code
              </button>
              <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-center text-slate-500 text-sm hover:text-cyan-700 transition-colors font-bold">
                Edit details
              </button>
            </div>
          </form>
        ) : (
           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { if (hasSupabaseConfig) setAuthMode('live'); setError(''); }}
                    disabled={!hasSupabaseConfig}
                    className={`rounded-xl px-3 py-3 text-xs font-black transition-all ${authMode === 'live' ? 'bg-slate-950 text-white shadow-md shadow-slate-900/15' : 'text-slate-500 hover:bg-white disabled:opacity-45 disabled:hover:bg-transparent'}`}
                  >
                    Live server
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('mock'); setError(''); }}
                    className={`rounded-xl px-3 py-3 text-xs font-black transition-all ${authMode === 'mock' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-500 hover:bg-white'}`}
                  >
                    Demo OTP
                  </button>
                </div>
                <p className="px-2 pt-3 pb-1 text-xs font-bold text-slate-500">
                  {authMode === 'live'
                    ? 'Creates a real Supabase Auth account on your live backend.'
                    : 'Uses local OTP 123456 on this device, with no paid SMS or email service.'}
                </p>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                {['patient', 'doctor'].map(r => (
                  <button key={r} onClick={() => setRole(r)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${role === r ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20' : 'text-slate-500 hover:text-cyan-700'}`}>{r}</button>
                ))}
              </div>
              
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" />
              <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" />
              
              {role === 'doctor' && (
                <div className="space-y-4 p-5 bg-cyan-50 rounded-2xl border border-cyan-100">
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-3 text-slate-900 outline-none appearance-none focus:ring-4 focus:ring-cyan-100">
                    {Object.values(SYMPTOM_MAP).filter((v,i,a)=>a.indexOf(v)===i).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" placeholder="Consultation Fee (Rs.)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-cyan-100" />
                  <input type="text" placeholder="Your UPI ID" value={doctorUpi} onChange={(e) => setDoctorUpi(e.target.value)} className="w-full bg-white border border-cyan-100 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-cyan-100" />
                </div>
              )}
              
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" />
              <input type="password" placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none transition-all" />
              
              {error && <p className="text-red-600 text-xs font-semibold text-center bg-red-50 py-3 rounded-xl border border-red-100">{error}</p>}
              
              <Button onClick={handleRegisterSubmit} className="w-full py-4 text-lg mt-2" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" /> : (authMode === 'live' ? "Create Live Account" : "Send Demo OTP")}
              </Button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center pt-4 pb-2 text-slate-500 text-sm hover:text-cyan-700 transition-colors">
                 Already have an account? Sign In
              </button>
           </div>
        )}
      </div>
    </div>
  );
}

function HomeView({ setView, setSearchQuery, doctors, setSelectedDoctor }) {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: `Hi, I'm Rapha'l Assist. Describe a symptom or tap the mic and I will help you find the right specialist.` }]);
  const [isListening, setIsListening] = useState(false);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [assistantProvider, setAssistantProvider] = useState(AI_ASSISTANT_ENDPOINT ? 'AI' : 'Local');
  const [voiceSessionState, setVoiceSessionState] = useState('idle');
  const [voiceStatus, setVoiceStatus] = useState('');
  const voiceSupported = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), []);
  const liveVoiceSupported = useMemo(() => typeof window !== 'undefined' && Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia), []);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const realtimePeerRef = useRef(null);
  const realtimeStreamRef = useRef(null);
  const realtimeAudioRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const geminiRecorderRef = useRef(null);
  const geminiChunksRef = useRef([]);
  const geminiStreamRef = useRef(null);
  const geminiStopTimerRef = useRef(null);
  const lastVoiceReplyRef = useRef('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat]);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices?.() || [];
    const naturalVoice = voices.find(voice => /en-IN|India/i.test(`${voice.lang} ${voice.name}`))
      || voices.find(voice => /Google|Microsoft|Natural|Neural/i.test(voice.name) && /^en/i.test(voice.lang))
      || voices.find(voice => /^en/i.test(voice.lang));
    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.lang = naturalVoice?.lang || 'en-IN';
    utterance.rate = 0.98;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleSendChat = useCallback(async (overrideText, speakResponse = false) => {
    const message = (overrideText ?? chatInput).trim();
    if (!message || isAssistantThinking) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: message }]);
    setChatInput('');
    setIsAssistantThinking(true);

    const guidance = await askCareAssistant(message, doctors);
    setAssistantProvider(guidance.provider === 'local' ? 'Local' : 'AI');
    if (guidance.specialty && guidance.specialty !== 'Emergency Care') {
      setSearchQuery(guidance.searchQuery || guidance.specialty);
    } else if (guidance.shouldSearch) {
      setSearchQuery(guidance.searchQuery || message);
    }
    if (guidance.shouldSearch) {
      setTimeout(() => setView('search'), 700);
    }
    setChatMessages(prev => [...prev, { sender: 'ai', text: guidance.response }]);
    setIsAssistantThinking(false);

    if (speakResponse) {
      window.setTimeout(() => {
        if (speakResponse) {
          speak(guidance.response);
        }
      }, 50);
    }
  }, [chatInput, doctors, isAssistantThinking, setSearchQuery, setView, speak]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setChatInput(transcript);
        setTimeout(() => handleSendChat(transcript, true), 0);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event?.error === 'aborted') return;
      const errorCopy = {
        'not-allowed': 'Microphone permission is blocked. Enable microphone access for this site and try again.',
        'service-not-allowed': 'This browser blocked its speech service. Use the live AI voice button on the deployed app, or type your symptom.',
        'audio-capture': 'No microphone was found. Connect or enable a microphone and try again.',
        network: 'Browser speech recognition could not reach its speech service. Try the live AI voice mode or type your symptom.',
        'no-speech': 'I did not catch speech yet. Try again and speak after the mic turns on.',
      };
      setShowChat(true);
      setChatMessages(prev => [...prev, { sender: 'ai', text: errorCopy[event?.error] || 'Speech recognition stopped before it heard enough audio. Try again or type your symptom.' }]);
    };
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [handleSendChat]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) {
      speak('Voice assistance is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    setShowChat(true);
    try {
      setIsListening(true);
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, speak]);

  const stopRealtimeVoice = useCallback((showMessage = false) => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.close();
      realtimeChannelRef.current = null;
    }
    if (realtimePeerRef.current) {
      realtimePeerRef.current.close();
      realtimePeerRef.current = null;
    }
    if (realtimeStreamRef.current) {
      realtimeStreamRef.current.getTracks().forEach(track => track.stop());
      realtimeStreamRef.current = null;
    }
    if (realtimeAudioRef.current) {
      realtimeAudioRef.current.remove();
      realtimeAudioRef.current = null;
    }
    setVoiceSessionState('idle');
    setVoiceStatus('');
    if (showMessage) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Live voice is paused. Tap the mic when you want to talk again.' }]);
    }
  }, []);

  const stopGeminiVoice = useCallback((cancelOnly = false) => {
    if (geminiStopTimerRef.current) {
      window.clearTimeout(geminiStopTimerRef.current);
      geminiStopTimerRef.current = null;
    }

    const recorder = geminiRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      if (cancelOnly) recorder.onstop = null;
      recorder.stop();
    }

    if (cancelOnly) {
      geminiStreamRef.current?.getTracks().forEach(track => track.stop());
      geminiRecorderRef.current = null;
      geminiStreamRef.current = null;
      geminiChunksRef.current = [];
      setVoiceSessionState('idle');
      setVoiceStatus('');
    }
  }, []);

  useEffect(() => () => {
    stopGeminiVoice(true);
    stopRealtimeVoice(false);
  }, [stopGeminiVoice, stopRealtimeVoice]);

  const routeFromVoiceTranscript = useCallback((transcript) => {
    const guidance = generateCareGuidance(transcript, doctors);
    if (guidance.shouldSearch) {
      setSearchQuery(guidance.searchQuery || transcript);
      window.setTimeout(() => setView('search'), 700);
    }
  }, [doctors, setSearchQuery, setView]);

  const appendVoiceReply = useCallback((text) => {
    const cleaned = String(text || '').trim();
    if (!cleaned || cleaned === lastVoiceReplyRef.current) return;
    lastVoiceReplyRef.current = cleaned;
    setChatMessages(prev => [...prev, { sender: 'ai', text: cleaned }]);
  }, []);

  const startGeminiVoice = useCallback(async () => {
    if (voiceSessionState === 'recording') {
      setVoiceStatus('Sending your voice to Gemini');
      stopGeminiVoice(false);
      return;
    }

    if (voiceSessionState === 'connecting') return;

    if (voiceSessionState === 'live') {
      stopRealtimeVoice(false);
    }

    setShowChat(true);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    if (!GEMINI_VOICE_ENDPOINT) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Gemini voice works when the app is running on Vercel or `vercel dev`. I will use browser dictation here so you can still speak.' }]);
      if (voiceSupported) toggleVoice();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'This browser needs microphone recording support for Gemini voice. Try Chrome or Edge on HTTPS, or type your symptom.' }]);
      return;
    }

    try {
      setAssistantProvider('Gemini');
      setVoiceSessionState('recording');
      setVoiceStatus('Listening with Gemini. Tap the mic again to send.');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      geminiStreamRef.current = stream;
      geminiChunksRef.current = [];

      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      geminiRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) geminiChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setVoiceSessionState('idle');
        setVoiceStatus('');
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'The microphone recorder stopped unexpectedly. Please try again.' }]);
      };

      recorder.onstop = async () => {
        if (geminiStopTimerRef.current) {
          window.clearTimeout(geminiStopTimerRef.current);
          geminiStopTimerRef.current = null;
        }
        stream.getTracks().forEach(track => track.stop());
        geminiStreamRef.current = null;
        geminiRecorderRef.current = null;

        const blob = new Blob(geminiChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        geminiChunksRef.current = [];
        if (blob.size < 800) {
          setVoiceSessionState('idle');
          setVoiceStatus('');
          setChatMessages(prev => [...prev, { sender: 'ai', text: 'I did not receive enough audio. Tap the mic, speak for a moment, then tap it again to send.' }]);
          return;
        }

        setVoiceSessionState('connecting');
        setVoiceStatus('Gemini is thinking');

        try {
          const audioBase64 = await blobToBase64(blob);
          const response = await fetch(GEMINI_VOICE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: blob.type || 'audio/webm',
              doctors: doctors.slice(0, 20).map(doctor => ({
                id: doctor.id,
                name: doctor.name,
                specialty: doctor.specialty,
                district: doctor.district || doctor.location,
                nextSlot: nextSlotFor(doctor),
              })),
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Gemini voice is unavailable.');

          const transcript = String(data.transcript || '').trim();
          const reply = String(data.response || '').trim();
          if (transcript) {
            setChatMessages(prev => [...prev, { sender: 'user', text: transcript }]);
            routeFromVoiceTranscript(transcript);
          }
          if (reply) {
            setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
            speak(reply);
          }
          if (data.specialty && data.specialty !== 'Emergency Care') {
            setSearchQuery(data.searchQuery || data.specialty);
          } else if (data.shouldSearch && (data.searchQuery || transcript)) {
            setSearchQuery(data.searchQuery || transcript);
          }
          if (data.shouldSearch) {
            window.setTimeout(() => setView('search'), 700);
          }
        } catch (err) {
          setChatMessages(prev => [...prev, { sender: 'ai', text: err?.message || 'Gemini voice could not answer yet. Check GEMINI_API_KEY in Vercel and try again.' }]);
        } finally {
          setVoiceSessionState('idle');
          setVoiceStatus('');
        }
      };

      recorder.start();
      geminiStopTimerRef.current = window.setTimeout(() => {
        if (geminiRecorderRef.current?.state === 'recording') {
          setVoiceStatus('Sending your voice to Gemini');
          geminiRecorderRef.current.stop();
        }
      }, 10000);
    } catch (err) {
      stopGeminiVoice(true);
      const message = err?.name === 'NotAllowedError'
        ? 'Microphone permission is blocked. Enable microphone access for this site and try again.'
        : err?.message || 'Unable to start Gemini voice.';
      setChatMessages(prev => [...prev, { sender: 'ai', text: message }]);
    }
  }, [doctors, isListening, routeFromVoiceTranscript, setSearchQuery, setView, speak, stopGeminiVoice, stopRealtimeVoice, toggleVoice, voiceSessionState, voiceSupported]);

  const handleRealtimeEvent = useCallback((event) => {
    if (!event?.type) return;

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = event.transcript?.trim();
      if (transcript) {
        setChatMessages(prev => [...prev, { sender: 'user', text: transcript }]);
        routeFromVoiceTranscript(transcript);
      }
      return;
    }

    if (['response.audio_transcript.done', 'response.output_text.done'].includes(event.type)) {
      appendVoiceReply(event.transcript || event.text || event.output_text);
      return;
    }

    if (event.type === 'error') {
      const message = event.error?.message || 'The live voice session had a problem. Please restart the mic.';
      setChatMessages(prev => [...prev, { sender: 'ai', text: message }]);
      setVoiceStatus('Voice session needs restart');
    }
  }, [appendVoiceReply, routeFromVoiceTranscript]);

  const startRealtimeVoice = useCallback(async () => {
    if (voiceSessionState === 'connecting' || voiceSessionState === 'live') {
      stopRealtimeVoice(true);
      return;
    }

    setShowChat(true);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    if (!REALTIME_SESSION_ENDPOINT) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Live AI voice is available on the Vercel deployment after OPENAI_API_KEY is set. I will use browser dictation here so you can still speak your symptom.' }]);
      if (voiceSupported) toggleVoice();
      return;
    }

    if (!liveVoiceSupported) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'This browser needs HTTPS, WebRTC, and microphone permission for live AI voice. Try the deployed site in Chrome or Edge, or type your symptom.' }]);
      return;
    }

    setVoiceSessionState('connecting');
    setVoiceStatus('Requesting microphone');
    lastVoiceReplyRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      realtimeStreamRef.current = stream;

      const peer = new RTCPeerConnection();
      realtimePeerRef.current = peer;

      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      realtimeAudioRef.current = audio;

      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {});
      };
      peer.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
          setVoiceStatus(peer.connectionState === 'disconnected' ? 'Reconnecting voice' : '');
        }
      };

      stream.getAudioTracks().forEach(track => peer.addTrack(track, stream));

      const channel = peer.createDataChannel('oai-events');
      realtimeChannelRef.current = channel;
      channel.onopen = () => {
        setAssistantProvider('Voice AI');
        setVoiceStatus('Listening and ready to talk');
      };
      channel.onmessage = (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data));
        } catch {
          // The Realtime API uses JSON events; ignore anything malformed.
        }
      };
      channel.onerror = () => {
        setVoiceStatus('Voice channel interrupted');
      };

      setVoiceStatus('Connecting to AI voice');
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const response = await fetch(REALTIME_SESSION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'X-Raphael-Doctors': encodeURIComponent(JSON.stringify(doctors.slice(0, 12).map(doctor => ({
            name: doctor.name,
            specialty: doctor.specialty,
            district: doctor.district || doctor.location,
            nextSlot: nextSlotFor(doctor),
          })))),
        },
        body: offer.sdp,
      });

      const answerSdp = await response.text();
      if (!response.ok) throw new Error(answerSdp || 'Unable to start live AI voice.');
      if (!answerSdp.trim()) throw new Error('The voice server did not return a WebRTC answer.');

      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      setVoiceSessionState('live');
      setAssistantProvider('Voice AI');
      setVoiceStatus('Listening and ready to talk');
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'I am listening now. Tell me what is going on, and I will talk it through with you.' }]);
    } catch (err) {
      stopRealtimeVoice(false);
      const details = friendlyNetworkError(err, 'Unable to start live AI voice.');
      setChatMessages(prev => [...prev, { sender: 'ai', text: `${details} Make sure OPENAI_API_KEY is set in Vercel and microphone permission is allowed.` }]);
    }
  }, [doctors, handleRealtimeEvent, isListening, liveVoiceSupported, stopRealtimeVoice, toggleVoice, voiceSessionState, voiceSupported]);

  const startVoiceAssistant = useCallback(() => {
    if (VOICE_PROVIDER === 'openai') {
      startRealtimeVoice();
      return;
    }
    startGeminiVoice();
  }, [startGeminiVoice, startRealtimeVoice]);

  const featuredDoctors = doctors.slice(0, 3);
  const specialties = uniqueSpecialties();
  const voiceActive = voiceSessionState === 'live' || voiceSessionState === 'recording';

  return (
    <div className="relative space-y-6 pb-28 flex-1 app-screen min-h-full">
      <div className="pro-home-hero px-6 pt-8 pb-6">
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <Badge type="success"><BadgeCheck size={12} /> Verified network</Badge>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] text-slate-950">
              Healthcare that feels fast, bright, and personal.
            </h1>
          </div>
          <button type="button" className="pro-icon-button">
            <Bell size={19} />
          </button>
        </div>

        <div className="relative z-10 pro-command-bar">
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search doctors, symptoms, specialties"
            className="w-full h-14 pl-12 pr-14 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none font-semibold"
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length > 2) setView('search'); }}
          />
          <button type="button" onClick={startVoiceAssistant} className={`absolute right-2 top-2 p-2.5 rounded-lg transition-colors ${voiceActive ? 'bg-emerald-50 text-emerald-600' : voiceSessionState === 'connecting' ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>
            {voiceSessionState === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : voiceActive ? <MicOff size={16}/> : <Mic size={16}/>}
          </button>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
          {[
            { prompt: 'fever', icon: Activity },
            { prompt: 'chest pain', icon: HeartPulse },
            { prompt: 'skin rash', icon: Sparkles },
          ].map(({ prompt, icon: Icon }) => (
            <button key={prompt} onClick={() => { setShowChat(true); handleSendChat(prompt); }} className="quick-chip">
              {React.createElement(Icon, { size: 14 })} {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <MetricPill icon={Users} label="Doctors" value={doctors.length || 3} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={Video} label="Assist" value="Voice" tone="text-indigo-700 bg-indigo-50 border-indigo-100" />
          <MetricPill icon={Wallet} label="Pay" value="UPI" tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>

        <div className="pro-card p-5 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase">Rapha'l Assist</p>
              <h2 className="text-2xl font-black text-slate-950 mt-1">Smart symptom routing</h2>
              <p className="text-sm font-semibold text-slate-500 mt-2">Describe symptoms by voice or text and jump straight to matching specialists.</p>
            </div>
            <button onClick={() => setShowChat(true)} className="h-14 w-14 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
              <MessageSquare size={22} />
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
          </div>
        </section>
      </div>

      <div className="absolute bottom-24 right-5 z-50 flex flex-col items-end">
        {showChat && (
          <div className="bg-white/95 backdrop-blur-2xl rounded-lg shadow-[0_24px_70px_-25px_rgba(15,23,42,0.38)] w-[85vw] sm:w-80 flex flex-col border border-slate-200 mb-4 overflow-hidden transform animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white/15 p-1.5 rounded-lg"><Sparkles size={16} /></div>
                <div>
                  <span className="font-bold text-sm block">Rapha'l Assist</span>
                  <span className="text-[10px] font-bold text-cyan-100">{voiceSessionState === 'recording' ? 'Gemini listening' : voiceSessionState === 'live' ? 'Live voice' : voiceSessionState === 'connecting' ? 'Thinking voice' : `${assistantProvider} triage`}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={startVoiceAssistant} className={`p-1.5 rounded-md transition-colors ${voiceActive ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}>
                  {voiceSessionState === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : voiceActive ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button onClick={() => speak(chatMessages[chatMessages.length - 1]?.text || '')} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-md transition-colors"><Volume2 size={16} /></button>
                <button onClick={() => setShowChat(false)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-md transition-colors"><X size={16} /></button>
              </div>
            </div>
            {voiceStatus && (
              <div className="bg-cyan-50 border-b border-cyan-100 px-4 py-2 text-[11px] font-black text-cyan-800 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${voiceActive ? 'bg-emerald-500' : 'bg-cyan-500 animate-pulse'}`} />
                {voiceStatus}
              </div>
            )}
            <div className="h-64 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 text-sm shadow-sm rounded-lg ${msg.sender === 'user' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-100 text-slate-700 font-medium'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAssistantThinking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 text-slate-500 rounded-lg px-3 py-2 text-sm font-bold shadow-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-cyan-600" /> Thinking
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <button type="button" onClick={startVoiceAssistant} className={`p-2.5 rounded-lg transition-colors ${voiceActive ? 'bg-emerald-50 text-emerald-600' : voiceSessionState === 'connecting' ? 'bg-cyan-50 text-cyan-700' : isListening ? 'bg-red-50 text-red-500' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'}`}>
                {voiceSessionState === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : voiceActive || isListening ? <MicOff size={16}/> : <Mic size={16}/>}
              </button>
              <input type="text" placeholder="Type a symptom..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} className="flex-1 bg-slate-100 rounded-lg px-4 py-2 outline-none text-sm focus:ring-2 focus:ring-cyan-500/20 focus:bg-white border border-transparent focus:border-cyan-200 transition-all" />
              <button onClick={() => handleSendChat()} disabled={isAssistantThinking} className="p-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-md shadow-cyan-500/20"><Send size={16} /></button>
            </div>
          </div>
        )}
        <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-lg bg-slate-950 text-white shadow-2xl shadow-slate-900/25 hover:scale-105 active:scale-95 transition-all duration-300">
          {showChat ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
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
      const detected = Object.keys(SYMPTOM_MAP).find(k => q.includes(k));
      if (detected) results = results.filter(d => d.specialty === SYMPTOM_MAP[detected]);
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
  const slots = doctor.slots?.length ? doctor.slots : ['09:00 AM', '11:00 AM', '02:00 PM'];

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
            <p className="text-lg font-black">{doctor.experience || '5 Years'}</p>
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
          <p className="text-slate-600 text-sm leading-relaxed font-semibold mt-3">{doctor.bio || "Leading specialist available for consultation. Bringing years of experience and dedicated patient care to Rapha'l Health."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-lg border px-3 py-3 ${meta.soft}`}>
              <Shield size={16} />
              <p className="mt-2 text-xs font-black">Verified provider</p>
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
        <Button variant="accent" className="w-full" onClick={handleBook} disabled={!selectedSlot}>
           {selectedSlot ? `Confirm Booking for ${selectedSlot}` : 'Select a Time Slot'}
        </Button>
      </div>
    </div>
  );
}

const appointmentStatusMessage = (appointment) => {
  if (appointment.status === 'Cancelled') return 'Doctor declined this request. You can book another slot or choose a different specialist.';
  if (appointment.status === 'Accepted' && appointment.payment_status === 'Unpaid') return 'Doctor accepted your request. Choose UPI or cash to continue.';
  if (appointment.payment_status === 'Pending Verification') return 'Payment choice is recorded and waiting for clinic verification.';
  if (appointment.status === 'Confirmed') return 'Your visit is confirmed. Keep this appointment visible at the clinic.';
  return 'Request sent. The doctor will accept or decline it from their provider console.';
};

const appointmentSteps = (appointment) => {
  const accepted = ['Accepted', 'Confirmed'].includes(appointment.status);
  const declined = appointment.status === 'Cancelled';
  const paymentStarted = appointment.payment_status && appointment.payment_status !== 'Unpaid';
  return [
    { label: 'Requested', done: true },
    { label: declined ? 'Declined' : 'Doctor review', done: accepted || declined, danger: declined },
    { label: 'Payment', done: accepted && paymentStarted, disabled: declined },
    { label: 'Clinic verify', done: appointment.status === 'Confirmed' || appointment.payment_status === 'Pending Verification', disabled: declined },
  ];
};

function DashboardView({ appointments, onPayNow, onPayCash }) {
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
         const isAwaitingPayment = apt.status === 'Accepted' && apt.payment_status === 'Unpaid';
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
             
             {isAwaitingPayment && (
               <div className="mt-6 flex gap-3">
                 <Button onClick={() => onPayNow(apt)} variant="accent" className="flex-1 text-sm py-3 shadow-none">Pay via UPI</Button>
                 <Button onClick={() => onPayCash(apt)} variant="secondary" className="flex-1 text-sm py-3">Pay Cash</Button>
               </div>
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

function DoctorDashboard({ user, doctor, logout, showToast, onSaveProfile }) {
  const [appointments, setAppointments] = useState([]);
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
  const usingMockData = isMockUser(user);

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
  
  useEffect(() => {
    let active = true;
    const fetchApts = async () => {
      if (doctorId) {
         if (usingMockData || !supabase) {
           if (active) setAppointments(getLocalDoctorAppointments(doctorId));
           return;
         }

         try {
           const { data, error } = await supabase.from('appointments').select().eq('doctor_id', doctorId);
           if (error) throw error;
           if (data && active) setAppointments(data);
         } catch {
           if (active) setAppointments(getLocalDoctorAppointments(doctorId));
         }
      }
    };
    fetchApts();
    return () => { active = false; };
  }, [doctorId, usingMockData]);

  const handleAction = async (id, action) => {
    const status = action === 'accept' ? 'Accepted' : 'Cancelled';

    if (isMockUser(user) || !supabase || String(id).startsWith('mock-appt')) {
      updateLocalAppointment(id, { status });
      setAppointments(prev => prev.map(apt => String(apt.id) === String(id) ? { ...apt, status } : apt));
      showToast(action === 'accept' ? 'Appointment accepted' : 'Appointment declined');
      return;
    }

    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status } : apt));
      showToast(action === 'accept' ? 'Appointment accepted' : 'Appointment declined');
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
        <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <MetricPill icon={ClipboardCheck} label="Pending" value={pendingAppointments.length} tone="text-amber-700 bg-amber-50 border-amber-100" />
          <MetricPill icon={CheckCircle} label="Accepted" value={appointments.filter(a => a.status === 'Accepted').length} tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
      </div>

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
              <div key={apt.id} className="pro-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{apt.patient_name}</p>
                  <p className="text-xs font-bold text-slate-500">{shortDate(apt.appointment_date)} at {apt.slot}</p>
                </div>
                <Badge type={apt.status === 'Accepted' ? 'success' : 'warning'}>{apt.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ logout, doctors }) {
  return (
    <div className="min-h-screen app-screen text-slate-900 p-5 font-sans space-y-5">
      <div className="pro-card p-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-black text-cyan-700 uppercase">Operations</p>
            <h1 className="text-3xl font-black flex items-center gap-2 text-slate-950"><Shield className="text-cyan-600"/> Admin</h1>
          </div>
          <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <MetricPill icon={Users} label="Providers" value={doctors.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={TrendingUp} label="Status" value="Live" tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>
      </div>
      <div className="pro-card p-5">
        <SectionHeader eyebrow="Directory" title="Registered providers" />
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center hover:border-cyan-200 transition-colors mt-3">
              <div>
                <h3 className="font-black text-slate-950 text-lg">{doc.name}</h3>
                <p className="text-sm font-bold text-cyan-700">{doc.specialty}</p>
              </div>
              <ChevronRight size={20} className="text-slate-500" />
            </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const selectedDate = useMemo(() => new Date(), []);
  const [notification, setNotification] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const showToast = useCallback((msg, type='success') => {
     setNotification({msg, type});
     setTimeout(() => setNotification(null), 3500);
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

        if (isMockUser(sessionUser)) {
           if (active) {
              setUser(sessionUser);
              setView(routeForRole(sessionUser.role));
              setLoadingAuth(false);
           }
           return;
        }

        try {
           const profile = await loadUserProfile(sessionUser);
           if (profile && active) {
              setUser(profile);
              setView(routeForRole(profile.role));
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

     const loadDoctors = async () => {
        let remoteDoctors = [];
        if (supabase) {
           try {
              const { data, error } = await supabase.from('doctors').select();
              if (error) throw error;
              remoteDoctors = data || [];
           } catch {
              remoteDoctors = [];
           }
        }
        if (active) setDoctors(mergeDoctors(remoteDoctors, getLocalDoctors(), DEFAULT_DOCTORS));
     };

     const mockSession = getMockSession();
     loadDoctors();

     if (mockSession) {
        loadData(mockSession);
        return () => { active = false; };
     }

     if (!supabase) {
        setLoadingAuth(false);
        return () => { active = false; };
     }

     supabase.auth.getSession()
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
  }, [showToast]);

  const fetchPatientAppointments = useCallback(async () => {
     if (user?.id) {
        if (isMockUser(user) || !supabase) {
           setAppointments(getLocalPatientAppointments(user.id));
           return;
        }

        try {
           const { data, error } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
           if (error) throw error;
           if (data) setAppointments(data);
        } catch {
           setAppointments(getLocalPatientAppointments(user.id));
        }
     }
  }, [user]);

  useEffect(() => {
     let active = true;
     const load = async () => {
        if (user?.id && user.role === 'patient' && view === 'dashboard') {
           if (isMockUser(user) || !supabase) {
              if (active) setAppointments(getLocalPatientAppointments(user.id));
              return;
           }

           try {
              const { data, error } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
              if (error) throw error;
              if (active && data) setAppointments(data);
           } catch {
              if (active) setAppointments(getLocalPatientAppointments(user.id));
           }
        }
     };
     load();
     return () => { active = false; };
  }, [user, view]);

  const handleLogin = (userData) => {
     setUser(userData);
     setView(routeForRole(userData.role));
  };

  const handleLogout = async () => {
     clearMockSession();
     if (supabase) {
        try {
           await supabase.auth.signOut();
        } catch {
           // Local logout should still succeed if the live backend is offline.
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
     const nextProfile = { ...user, ...cleanProfilePatch };

     if (isMockUser(user) || !supabase) {
        const savedProfile = updateMockAccount(user.id, cleanProfilePatch) || nextProfile;
        if (doctorPatch && user.doctorId) {
           const updatedDoctor = updateLocalDoctorProfile(user.doctorId, doctorPatch);
           if (updatedDoctor) {
              setDoctors(prev => mergeDoctors([updatedDoctor], getLocalDoctors(), prev, DEFAULT_DOCTORS));
           }
        }
        setUser(savedProfile);
        showToast('Profile updated.');
        return savedProfile;
     }

     try {
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
              setDoctors(prev => mergeDoctors([updatedDoctor], prev, getLocalDoctors(), DEFAULT_DOCTORS));
           }
        }

        const savedProfile = { ...user, ...data };
        setUser(savedProfile);
        showToast('Profile updated.');
        return savedProfile;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update profile.'), 'error');
        throw err;
     }
  };

  const initiateBooking = async () => {
     if (!selectedSlot || !selectedDoctor || !user) return;
     const appt = {
         patient_id: user.id,
         doctor_id: selectedDoctor.id,
         doctor_name: selectedDoctor.name,
         patient_name: user.name,
         slot: selectedSlot,
         appointment_date: selectedDate.toISOString(),
         status: 'Pending Approval',
         payment_status: 'Unpaid',
         amount: displayAmount(selectedDoctor.price)
     };

     if (isMockUser(user) || !supabase) {
         saveLocalAppointment(appt);
         showToast("Booking request sent successfully!", "success");
         setView('success');
         return;
     }

     try {
         const { error } = await supabase.from('appointments').insert([appt]);
         if (error) throw error;
         showToast("Booking request sent successfully!", "success");
         setView('success');
     } catch (err) {
         saveLocalAppointment(appt);
         showToast(friendlyNetworkError(err, "Saved locally because live booking is unavailable."), 'info');
         setView('success');
     }
  };

  const handlePayCash = async (appt) => {
     const patch = { payment_mode: 'Cash', payment_status: 'Pending Verification' };

     if (isMockUser(user) || !supabase || appt.isMock) {
         updateLocalAppointment(appt.id, patch);
         showToast("Selected Cash. Please pay at the clinic.", "info");
         fetchPatientAppointments();
         return;
     }

     try {
         const { error } = await supabase.from('appointments').update(patch).eq('id', appt.id);
         if (error) throw error;
         showToast("Selected Cash. Please pay at the clinic.", "info");
         fetchPatientAppointments();
     } catch (err) {
         showToast(friendlyNetworkError(err, "Unable to update payment mode."), "error");
     }
  };

  const handlePayNow = async (appt) => {
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
      const upiId = doctor?.upi_id;

      if (upiId) {
        const params = new URLSearchParams({
          pa: upiId,
          pn: doctor?.name || appt.doctor_name || 'Raphael Doctor',
          am: amount.toString(),
          cu: 'INR',
          tn: `Raphael appointment ${appt.id}`,
        });
        window.location.href = `upi://pay?${params.toString()}`;
      }

      const patch = { payment_mode: 'UPI', payment_status: 'Pending Verification' };
      if (isMockUser(user) || !supabase || appt.isMock) {
        updateLocalAppointment(appt.id, patch);
        showToast(upiId ? "UPI opened. Payment is pending verification." : "Payment marked for verification.", "info");
        fetchPatientAppointments();
        return;
      }

      try {
        const { error } = await supabase
          .from('appointments')
          .update(patch)
          .eq('id', appt.id);
        if (error) throw error;
        showToast(upiId ? "UPI opened. Payment is pending verification." : "Payment marked for verification.", "info");
        fetchPatientAppointments();
      } catch (err) {
        showToast(friendlyNetworkError(err, "Unable to start payment."), "error");
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
           {view === 'login' && <LoginView onLogin={handleLogin} showToast={showToast} />}
           {view === 'admin' && <AdminDashboard logout={handleLogout} doctors={doctors} />}
           {view === 'doctor_dashboard' && <DoctorDashboard user={user} doctor={doctorProfile} logout={handleLogout} showToast={showToast} onSaveProfile={handleSaveProfile} />}
           
           {['home', 'search', 'detail', 'dashboard', 'profile', 'success'].includes(view) && user && user.role === 'patient' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                 <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {view === 'home' && <HomeView setView={setView} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
                    {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={setView} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
                    {view === 'detail' && <DoctorDetailView doctor={selectedDoctor} setView={setView} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} handleBook={initiateBooking} />}
                    {view === 'dashboard' && <DashboardView appointments={appointments} onPayNow={handlePayNow} onPayCash={handlePayCash} />}
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
                           { id: 'profile', icon: User, label: 'Profile' }
                         ].map(item => (
                           <button 
                             key={item.id} 
                             onClick={() => setView(item.id)} 
                             className={`relative flex flex-col items-center gap-1 w-16 py-2 rounded-lg transition-all duration-300 ${view === item.id ? 'text-white bg-slate-950 shadow-md shadow-slate-900/15' : 'text-slate-500 hover:text-cyan-700 hover:bg-cyan-50'}`}
                           >
                             <item.icon size={22} strokeWidth={view === item.id ? 2.5 : 2} className={view === item.id ? 'animate-in zoom-in-75 duration-200' : ''} />
                             <span className="text-[9px] font-extrabold uppercase">{item.label}</span>
                           </button>
                         ))}
                       </div>
                    </div>
                 )}
              </div>
           )}
        </div>
     </div>
  );
}
