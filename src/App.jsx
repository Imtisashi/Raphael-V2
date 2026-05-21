import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './lib/supabaseClient'; 
import { 
  CheckCircle, Zap, Search, Calendar, User, LogOut, ShieldCheck, X, AlertCircle, 
  Settings, Sun, Moon, Type, Bell, Menu, Mic, MicOff, Brain, Heart, Bone, Stethoscope, 
  Eye, Star, MapPin, Clock, Activity, IndianRupee, CreditCard, FileText, Loader2, Camera, Phone, Droplet, Building, ChevronRight, ChevronLeft
} from 'lucide-react';

const ADMIN_UPI_HANDLE = import.meta.env.VITE_ADMIN_UPI_HANDLE || "admin@upi";
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "Rapha'l Health";

// --- UTILS & SHARED COMPONENTS ---
const SEO = ({ title }) => {
  useEffect(() => { document.title = title; }, [title]);
  return null;
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const base = "px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-teal-400 to-emerald-400 text-white shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30",
    secondary: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50 shadow-none"
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

const Toast = ({ notification, onClose }) => {
  if (!notification) return null;
  const isError = notification.type === 'error';
  const isInfo = notification.type === 'info';
  
  return (
    <div className={`fixed top-4 left-4 right-4 z-[999] px-5 py-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 backdrop-blur-xl border ${
      isError ? 'bg-rose-50/90 border-rose-100 text-rose-800' : 
      isInfo ? 'bg-indigo-50/90 border-indigo-100 text-indigo-800' : 
      'bg-emerald-50/90 border-emerald-100 text-emerald-800'
    }`}>
      {isError ? <AlertCircle size={20} className="text-rose-500" /> : 
       isInfo ? <Bell size={20} className="text-indigo-500 animate-bounce" /> : 
       <CheckCircle size={20} className="text-emerald-500" />}
      <p className="font-bold text-sm flex-1">{notification.message}</p>
      <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full transition-colors"><X size={16} /></button>
    </div>
  );
};

// --- ELDERLY VOICE ASSISTANT SYSTEM ---
const useVoiceAssistant = (setView, setSearchQuery, showToast) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleCommand(transcript);
      };
      
      recognitionRef.current.onerror = (e) => {
        setIsListening(false);
        if(e.error !== 'no-speech') showToast("Voice recognition failed. Try again.", "error");
      };
      
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for elderly
      utterance.pitch = 1.1; // Gentle pitch
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCommand = (cmd) => {
    if (cmd.includes('headache') || cmd.includes('head') || cmd.includes('migraine')) {
      speak("I hear you have a headache. I am finding Neurologists for you.");
      setSearchQuery('Neurologist'); setView('search');
    } 
    else if (cmd.includes('heart') || cmd.includes('chest')) {
      speak("Let's look at your heart. Finding Cardiologists.");
      setSearchQuery('Cardiologist'); setView('search');
    }
    else if (cmd.includes('bone') || cmd.includes('joint') || cmd.includes('knee')) {
      speak("Finding bone specialists for your pain.");
      setSearchQuery('Orthopedic'); setView('search');
    }
    else if (cmd.includes('skin') || cmd.includes('rash')) {
      speak("Finding skin doctors near you.");
      setSearchQuery('Dermatologist'); setView('search');
    }
    else if (cmd.includes('fever') || cmd.includes('cold') || cmd.includes('sick')) {
      speak("Finding a general physician to help you feel better.");
      setSearchQuery('General Physician'); setView('search');
    }
    else if (cmd.includes('appointment') || cmd.includes('visit')) {
      speak("Opening your medical visits.");
      setView('dashboard');
    }
    else if (cmd.includes('home')) {
      speak("Going back to the home screen.");
      setView('home');
    }
    else {
      speak("I heard you say: " + cmd + ". Searching for that now.");
      setSearchQuery(cmd); setView('search');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        speak("I am listening. How can I help you today?");
      } catch (e) {
        showToast("Voice features are not supported on this browser.", "error");
      }
    }
  };

  return { isListening, toggleListening, hasSupport: !!recognitionRef.current };
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [doctors, setDoctors] = useState([]); 
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [notification, setNotification] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [payingAppt, setPayingAppt] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'info' ? 6000 : 4000);
  }, []);

  const { isListening, toggleListening, hasSupport: hasVoiceSupport } = useVoiceAssistant(setView, setSearchQuery, showToast);

  useEffect(() => {
    const saved = localStorage.getItem('raphal_user_session_v2');
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
  }, []);

  const fetchMyVisits = useCallback(async () => {
    if (user && user.role === 'patient') {
      const { data } = await supabase.from('appointments').select('*').eq('patient_name', user.name).order('id', { ascending: false });
      if (data) setAppointments(data);
    }
  }, [user]);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('doctors').select('*');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (user && user.role === 'patient') fetchMyVisits();
  }, [user, view, fetchMyVisits]);

  // Realtime & Push
  useEffect(() => {
    if (!user) return;
    const setupNativePush = async () => {
      try {
        const coreName = '@capacitor/co' + 're';
        const pushName = '@capacitor/push-noti' + 'fications';
        const { Capacitor } = await import(/* @vite-ignore */ coreName);
        if (!Capacitor.isNativePlatform()) return;
        const { PushNotifications } = await import(/* @vite-ignore */ pushName);
        
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          PushNotifications.addListener('registration', async (token) => {
            await supabase.from('users').update({ push_token: token.value }).eq('id', user.id);
            if (user.role === 'doctor' && user.doctorId) await supabase.from('doctors').update({ push_token: token.value }).eq('id', user.doctorId);
          });
          PushNotifications.addListener('pushNotificationReceived', (n) => showToast(`🔔 ${n.title}: ${n.body}`, 'info'));
        }
      } catch (e) { console.log("Push skipped"); }
    };
    setupNativePush();

    const channel = supabase.channel('realtime_appts');
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, (p) => {
      if (user.role === 'admin') showToast(`New booking: ${p.new.patient_name}`, 'info');
      else if (user.role === 'doctor' && user.doctorId === p.new.doctor_id) showToast(`🔔 New request from ${p.new.patient_name}!`, 'info');
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (p) => {
      if (user.role === 'patient' && user.name === p.new.patient_name) {
         if (p.new.status === 'Accepted') { showToast(`Dr. ${p.new.doctor_name} accepted! Pay to confirm.`, 'info'); fetchMyVisits(); } 
         else if (p.new.status === 'Cancelled by Doctor') { showToast(`Request rejected by doctor.`, 'error'); fetchMyVisits(); } 
         else if (p.new.payment_status === 'Verified & Paid') { showToast(`Payment Verified!`, 'success'); fetchMyVisits(); }
      }
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, showToast, fetchMyVisits]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('raphal_user_session_v2', JSON.stringify(userData));
    setView('home'); 
    showToast(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('raphal_user_session_v2');
    setView('home');
    setAppointments([]);
    showToast("Logged out successfully.");
  }, [showToast]);

  const secureNavigate = (targetView) => { if (user) setView(targetView); else setView('home'); };

  // --- RENDERERS ---
  if (!user) return <LoginView onLogin={handleLogin} showToast={showToast} />;
  if (user.role === 'doctor') return <DoctorDashboard user={user} logout={handleLogout} showToast={showToast} />;
  if (user.role === 'admin') return <AdminDashboard doctors={doctors} logout={handleLogout} showToast={showToast} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-teal-200 flex flex-col relative overflow-hidden">
      <SEO title="Rapha'l Health" />
      <Toast notification={notification} onClose={() => setNotification(null)} />
      
      {/* GLOBAL PASTEL BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-100/50 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-100/50 rounded-full blur-[100px]"></div>
          <div className="absolute top-[40%] left-[60%] w-64 h-64 bg-rose-100/40 rounded-full blur-[80px]"></div>
      </div>

      {payingAppt && <PaymentModal appointment={payingAppt} onClose={() => setPayingAppt(null)} onConfirm={async (txnId) => {
          await supabase.from('appointments').update({ status: "Payment Verifying", payment_status: "Pending Verification", transaction_id: txnId }).eq('id', payingAppt.id);
          setPayingAppt(null); showToast("Payment sent for verification!", "info"); fetchMyVisits();
      }} />}

      {/* TOP NAVIGATION BAR */}
      <div className="w-full md:max-w-md mx-auto sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm px-5 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors">
                  <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center shadow-sm text-white font-black text-sm">R</div>
                 <span className="font-extrabold text-xl text-slate-800 tracking-tight">Rapha'l</span>
              </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-indigo-600 font-bold">
              {user.name.substring(0,1).toUpperCase()}
          </div>
      </div>

      {/* SLIDING SIDEBAR */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-white z-[100] transform transition-transform duration-500 ease-out shadow-[30px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col rounded-r-3xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-8 pb-6 border-b border-slate-100 bg-slate-50/50 rounded-tr-3xl">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Hello, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-500 text-sm font-medium">{user.email}</p>
            <button onClick={() => setIsSidebarOpen(false)} className="absolute top-6 right-6 p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-slate-700"><X size={18}/></button>
          </div>
          <div className="flex-1 p-5 space-y-2 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-3 mb-3 mt-2">Main Menu</p>
            {[
              { id: 'home', icon: Zap, label: 'Discover', color: 'text-amber-500', bg: 'bg-amber-50' },
              { id: 'search', icon: Search, label: 'Find Doctors', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { id: 'dashboard', icon: Calendar, label: 'My Visits', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { id: 'profile', icon: User, label: 'Profile Settings', color: 'text-rose-500', bg: 'bg-rose-50' }
            ].map(item => (
               <button key={item.id} onClick={() => { secureNavigate(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${view === item.id ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                 <div className={`p-2.5 rounded-xl ${view === item.id ? item.bg : 'bg-slate-100'} ${view === item.id ? item.color : 'text-slate-500'}`}>
                    <item.icon size={20} className={view === item.id ? 'fill-current opacity-20' : ''}/>
                 </div>
                 {item.label}
               </button>
            ))}
          </div>
          <div className="p-5 border-t border-slate-100 pb-safe">
            <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-500 font-bold hover:bg-rose-50 hover:text-rose-600 transition-colors">
                <div className="p-2.5 rounded-xl bg-slate-100"><LogOut size={20} /></div> Logout
            </button>
          </div>
      </div>

      {/* MAIN CONTENT VIEWS */}
      <div className="w-full md:max-w-md mx-auto flex-1 flex flex-col relative z-10">
          <div className="flex-1 overflow-y-auto scrollbar-hide pb-28 pt-2">
              {view === 'home' && <HomeView setView={secureNavigate} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
              {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={secureNavigate} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
              {view === 'detail' && <DetailView doctor={selectedDoctor} setView={secureNavigate} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleBook={async () => {
                  if (!selectedSlot || !selectedDoctor) return;
                  const bookingPayload = { doctor_id: selectedDoctor.id, doctor_name: selectedDoctor.name, patient_name: user.name, slot: selectedSlot, appointment_date: selectedDate.toISOString(), status: "Pending Approval", payment_status: "Unpaid", amount: selectedDoctor.price, patient_id: user.id };
                  await supabase.from('appointments').insert(bookingPayload);
                  secureNavigate('dashboard'); showToast("Request sent to doctor!", "success");
              }} />}
              {view === 'dashboard' && <DashboardView appointments={appointments} onPayNow={setPayingAppt} onPayCash={async (apt) => {
                  await supabase.from('appointments').update({ status: "Confirmed", payment_status: "Cash", payment_mode: "Cash" }).eq('id', apt.id);
                  showToast("Booking Confirmed!"); fetchMyVisits();
              }} />}
              {view === 'profile' && <ProfileView user={user} showToast={showToast} />}
          </div>
      </div>

      {/* ELDERLY VOICE ASSISTANT FAB */}
      {hasVoiceSupport && (
        <button 
          onClick={toggleListening}
          className={`fixed bottom-8 right-6 z-50 p-5 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] transition-all duration-300 flex items-center justify-center gap-3 ${
            isListening ? 'bg-rose-500 text-white shadow-rose-500/40 scale-110 animate-pulse' : 'bg-white text-teal-600 shadow-teal-500/10 hover:scale-105 hover:bg-teal-50'
          }`}
        >
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
      )}
    </div>
  );
}

// ==========================================
// SUB-VIEWS (Kept in same file per mandate)
// ==========================================

const LoginView = ({ onLogin, showToast }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.from('users').insert({ email, password, name, role }).select().single();
        if (error) throw error;
        if (role === 'doctor') {
           const { data: docData } = await supabase.from('doctors').insert({ name, specialty: 'General' }).select().single();
           data.doctorId = docData.id;
           await supabase.from('users').update({ doctorId: docData.id }).eq('id', data.id);
        }
        onLogin(data);
      } else {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
        if (error || !data) throw new Error("Invalid credentials");
        if (data.role === 'doctor') {
           const { data: docInfo } = await supabase.from('doctors').select('id').eq('name', data.name).single();
           if(docInfo) data.doctorId = docInfo.id;
        }
        onLogin(data);
      }
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-br from-teal-200/40 via-emerald-200/40 to-indigo-200/40 rounded-full blur-[80px]"></div>
      
      <div className="w-full max-w-sm relative z-10 bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white">
         <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4 transform rotate-3">
               <span className="text-3xl font-black text-white transform -rotate-3">R</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Rapha'l</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">{isRegister ? 'Create an account' : 'Welcome back'}</p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
               <>
                 <input type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all shadow-sm" />
                 <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 outline-none transition-all shadow-sm appearance-none">
                    <option value="patient">I am a Patient</option>
                    <option value="doctor">I am a Doctor</option>
                 </select>
               </>
            )}
            <input type="email" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all shadow-sm" />
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-400 outline-none transition-all shadow-sm" />
            
            <Button disabled={loading} className="w-full mt-2 !py-4 text-base shadow-xl">
               {loading ? <Loader2 className="animate-spin" /> : isRegister ? 'Create Account' : 'Sign In'}
            </Button>
         </form>

         <p className="text-center mt-8 text-sm font-medium text-slate-500">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-teal-600 font-bold hover:underline">
               {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
         </p>
      </div>
    </div>
  );
};

const HomeView = ({ setView, setSearchQuery, doctors, setSelectedDoctor }) => {
  const categories = [
    { icon: Brain, label: 'Neurology', color: 'bg-indigo-100 text-indigo-600' },
    { icon: Heart, label: 'Cardiology', color: 'bg-rose-100 text-rose-600' },
    { icon: Bone, label: 'Orthopedic', color: 'bg-amber-100 text-amber-600' },
    { icon: Eye, label: 'Vision', color: 'bg-sky-100 text-sky-600' },
  ];

  return (
    <div className="space-y-8 px-4 animate-in fade-in duration-700">
      
      {/* PASTEL HERO CARD */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-500 p-8 text-white shadow-xl shadow-indigo-500/20 mt-2">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] pointer-events-none"></div>
        <div className="absolute top-[-30%] right-[-20%] w-64 h-64 rounded-full bg-white/20 blur-[60px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2 w-2 rounded-full bg-teal-300 animate-pulse shadow-[0_0_10px_#5eead4]"></span>
            <span className="text-[10px] font-black tracking-widest text-teal-100 uppercase">AI Voice Ready</span>
          </div>
          <h1 className="text-3xl font-black mb-3 leading-tight tracking-tight drop-shadow-sm">
            Find Care.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-indigo-200">Instantly.</span>
          </h1>
          <p className="text-indigo-100/90 text-sm font-medium mb-6 leading-relaxed max-w-[250px]">Tap the microphone to speak, or search for your symptoms below.</p>
          
          <div className="relative shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1">
            <Search className="absolute left-4 top-4 text-white/70" size={20} />
            <input 
              type="text" 
              placeholder="e.g. Headache, Dr. Chen..."
              className="w-full h-12 pl-12 pr-4 bg-transparent text-white placeholder-white/60 focus:outline-none font-medium text-sm"
              onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 2) setView('search');
              }}
            />
          </div>
        </div>
      </div>

      {/* SPECIALTIES */}
      <div>
        <h2 className="text-lg font-black text-slate-800 mb-4 tracking-tight px-1">Specialties</h2>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat, i) => (
            <button key={i} onClick={() => { setSearchQuery(cat.label); setView('search'); }} className="flex flex-col items-center gap-2 group">
              <div className={`w-full aspect-square rounded-[1.5rem] ${cat.color} flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm`}>
                <cat.icon size={28} className="opacity-80" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{cat.label.substring(0,8)}..</span>
            </button>
          ))}
        </div>
      </div>

      {/* TOP DOCTORS */}
      <div className="pb-8">
        <h2 className="text-lg font-black text-slate-800 mb-4 tracking-tight px-1">Top Rated Specialists</h2>
        <div className="grid gap-4">
          {doctors.slice(0, 3).map(doctor => (
            <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="bg-white/80 backdrop-blur-sm p-4 rounded-[1.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-teal-100 transition-all cursor-pointer flex gap-4 items-center group">
              <img src={doctor.image} alt={doctor.name} className="w-16 h-16 rounded-[1.2rem] object-cover border-2 border-white shadow-sm" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{doctor.name}</h3>
                <p className="text-xs font-bold text-teal-600/80 mb-1.5">{doctor.specialty}</p>
                <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg w-max border border-amber-100/50">
                  <Star size={10} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-black text-amber-700">{doctor.rating}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SearchView = ({ searchQuery, setSearchQuery, doctors, setView, setSelectedDoctor }) => {
  const filtered = doctors.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="sticky top-0 bg-[#F8FAFC]/90 backdrop-blur-xl z-20 p-4 pb-2 border-b border-slate-200/50">
        <div className="relative shadow-sm rounded-2xl bg-white border border-slate-100">
          <Search className="absolute left-4 top-4 text-slate-400" size={18} />
          <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search doctors, districts..." className="w-full bg-transparent rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none placeholder:text-slate-400" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filtered.map(doctor => (
          <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="bg-white/80 backdrop-blur-sm p-5 rounded-[1.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md cursor-pointer group">
            <div className="flex gap-4">
              <img src={doctor.image} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-sm" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-900 group-hover:text-teal-600">{doctor.name}</h3>
                  <span className="text-teal-600 font-bold text-xs bg-teal-50 px-2 py-1 rounded-md">{doctor.price}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 mb-2">{doctor.specialty} • {doctor.experience}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><Star size={10} className="fill-amber-500 text-amber-500"/> {doctor.rating}</span>
                  <span className="flex items-center gap-1"><MapPin size={10}/> {doctor.district}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DetailView = ({ doctor, setView, selectedSlot, setSelectedSlot, selectedDate, setSelectedDate, handleBook }) => {
  if (!doctor) return null;
  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] animate-in slide-in-from-right duration-300 relative">
      <div className="relative h-64 bg-slate-900 shrink-0 rounded-b-[3rem] overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10"></div>
        <img src={doctor.image} className="w-full h-full object-cover opacity-60" />
        <button onClick={() => setView('search')} className="absolute top-4 left-4 z-20 p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white hover:bg-white/30 transition-all">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex-1 px-6 -mt-20 z-20 pb-32">
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-white/50 mb-6">
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">{doctor.name}</h1>
           <p className="text-teal-600 font-bold text-sm mb-4">{doctor.specialty}</p>
           <div className="flex gap-3">
             <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold">{doctor.experience} Exp</span>
             <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold">{doctor.reviews} Reviews</span>
           </div>
        </div>

        <div className="mb-8 pl-1">
          <h3 className="font-black text-slate-900 mb-2">About Specialist</h3>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">{doctor.bio}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-black text-slate-900 mb-4 px-1">Select Time Slot</h3>
          <div className="grid grid-cols-3 gap-3">
            {doctor.slots?.map(slot => (
              <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${selectedSlot === slot ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white shadow-teal-500/30 border-none' : 'bg-white border border-slate-100 text-slate-600 hover:border-teal-300'}`}>
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-8 z-50 md:max-w-md md:mx-auto">
        <Button className="w-full !py-4 text-base shadow-xl" onClick={handleBook} disabled={!selectedSlot}>
          {selectedSlot ? `Book for ${selectedSlot}` : 'Select a Time'}
        </Button>
      </div>
    </div>
  );
};

const DashboardView = ({ appointments, onPayNow, onPayCash }) => (
  <div className="p-5 space-y-4 animate-in fade-in duration-500 pb-24">
     <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-6 mt-2 px-1">My Medical Visits</h2>
     {appointments.map((apt) => {
       const isPending = apt.status === 'Pending Approval';
       const isAwaitingPayment = apt.status === 'Accepted' && apt.payment_status === 'Unpaid';
       
       return (
         <div key={apt.id} className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
           <div className="flex justify-between items-start mb-4">
             <div>
               <h3 className="text-lg font-black text-slate-900">Dr. {apt.doctor_name}</h3>
               <div className="mt-1.5 flex gap-1">
                  {isAwaitingPayment && <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Payment Required</span>}
                  {isPending && <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Pending Doctor</span>}
                  {(!isAwaitingPayment && !isPending) && <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">{apt.status}</span>}
               </div>
             </div>
             <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl flex flex-col items-center shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                <span className="text-xl font-black text-teal-600 leading-tight">{new Date(apt.appointment_date).getDate()}</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
              <span className="flex items-center gap-1.5"><Clock size={14} className="text-teal-400"/> {apt.slot}</span>
              <span className="flex items-center gap-1.5"><IndianRupee size={14} className="text-teal-400"/> {apt.amount}</span>
           </div>

           {isAwaitingPayment && (
             <div className="flex gap-2">
               <Button onClick={() => onPayNow(apt)} className="flex-[2] !py-3 text-xs shadow-md">Pay Online</Button>
               <Button onClick={() => onPayCash(apt)} variant="outline" className="flex-1 !py-3 text-xs">Pay Cash</Button>
             </div>
           )}
         </div>
       );
     })}
  </div>
);

const ProfileView = ({ user, showToast }) => (
  <div className="p-6 animate-in slide-in-from-right duration-300 pb-20">
    <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20 mb-8 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/20 blur-[30px] rounded-full"></div>
      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner mb-4">
          <User size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
      <p className="text-indigo-100 font-medium opacity-90 mt-1">{user.email}</p>
    </div>
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-4">
      <h3 className="font-black text-slate-800">Account Details</h3>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Phone</label>
        <div className="bg-slate-50 px-4 py-3.5 rounded-xl font-bold text-slate-600 border border-slate-100">{user.phone || 'Not provided'}</div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Location</label>
        <div className="bg-slate-50 px-4 py-3.5 rounded-xl font-bold text-slate-600 border border-slate-100">{user.district || 'Nagaland'}</div>
      </div>
    </div>
  </div>
);

// Doctor & Admin Dashboards (Simplified logic for monolith)
const DoctorDashboard = ({ user, logout, showToast }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col p-6 text-center">
      <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6 text-teal-600"><Stethoscope size={48}/></div>
      <h1 className="text-2xl font-black mb-2 text-slate-800">Doctor Console Active</h1>
      <p className="text-slate-500 mb-8 font-medium">Logged in as {user.name}. Use the mobile app for full doctor features.</p>
      <Button onClick={logout} variant="danger">Logout safely</Button>
  </div>
);

const AdminDashboard = ({ logout }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col p-6 text-center">
      <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 text-indigo-400"><ShieldCheck size={48}/></div>
      <h1 className="text-2xl font-black mb-2 text-white">Admin Console Active</h1>
      <Button onClick={logout} variant="danger" className="mt-8">Logout safely</Button>
  </div>
);