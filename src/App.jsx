import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Calendar, Clock, MapPin, Star, Shield, Activity, User, CheckCircle, X,
  ArrowRight, Loader2, EyeOff, Check, LogOut, MessageSquare, Send, 
  ChevronLeft, IndianRupee, Zap, Mail, Lock, Sparkles, ChevronRight
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';

const SYMPTOM_MAP = {
  head: 'Neurologist', migraine: 'Neurologist', brain: 'Neurologist',
  heart: 'Cardiologist', chest: 'Cardiologist', breath: 'Cardiologist',
  pain: 'General Physician', fever: 'General Physician', flu: 'General Physician',
  bone: 'Orthopedic', joint: 'Orthopedic', knee: 'Orthopedic', back: 'Orthopedic',
  skin: 'Dermatologist', rash: 'Dermatologist', acne: 'Dermatologist',
  eye: 'Ophthalmologist', vision: 'Ophthalmologist',
};

const USER_PROFILE_FIELDS = 'id, email, name, role, phone, district';

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
});

const attachDoctorProfile = async (profile) => {
  if (profile?.role !== 'doctor') return profile;
  const { data: docProfile } = await supabase
    .from('doctors')
    .select('id')
    .eq('name', profile.name)
    .maybeSingle();
  return docProfile ? { ...profile, doctorId: docProfile.id } : profile;
};

const loadUserProfile = async (authUser) => {
  if (!authUser) return null;

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

  return attachDoctorProfile(profile || profileFromAuthUser(authUser));
};

const saveUserProfile = async (authUser, profileInput) => {
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
  return attachDoctorProfile(data);
};

// ==========================================
// PREMIUM UI COMPONENTS
// ==========================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-6 py-3.5 rounded-xl font-bold transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center gap-2 outline-none focus:ring-4";
  const variants = {
    primary: "bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35 hover:brightness-105 focus:ring-cyan-500/20",
    secondary: "bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-cyan-200 hover:bg-cyan-50/50 focus:ring-cyan-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus:ring-red-100",
    ghost: "bg-transparent text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 focus:ring-cyan-50",
    outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-700 focus:ring-cyan-100"
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
    warning: "bg-amber-50 text-amber-700 border border-amber-100"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${styles[type]}`}>
      {children}
    </span>
  );
};

const Avatar = ({ name, url, size = "md" }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-xl", lg: "w-24 h-24 text-4xl" };
  const initial = name ? name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D';
  
  if (url) return <img src={url} alt={name} className={`${sizes[size]} rounded-2xl object-cover shadow-md ring-2 ring-white`} />;
  
  return (
    <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-sky-50 via-white to-emerald-50 border border-cyan-100 flex items-center justify-center text-cyan-700 font-black shadow-inner relative group`}>
      {initial}
      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
    </div>
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

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;

      const profile = await loadUserProfile(data.user);
      onLogin(profile);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please check your details.');
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
      if (!price || Number(price) <= 0) {
        setError('Doctors must set a valid consultation fee.');
        return;
      }
      if (!doctorUpi.trim()) {
        setError('Doctors must provide a UPI ID for payouts.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role,
            phone: phone.trim(),
            district: 'Dimapur',
          },
        },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Unable to create account. Please try again.');
      
      let currentUser = await saveUserProfile(data.user, {
        name: name.trim(),
        role,
        phone: phone.trim(),
        district: 'Dimapur',
      });
      if (role === 'doctor') {
         const fee = Number(price);
         const { data: docData, error: docError } = await supabase.from('doctors').insert([{ 
             name: name.trim(), specialty, rating: 5.0, reviews: 0, image: '', 
             location: 'Online', experience: '1 Year', bio: 'New specialist at Rapha\'l.', 
             price: `Rs. ${fee}`, slots: ['09:00 AM', '10:00 AM', '02:00 PM'], upi_id: doctorUpi.trim() 
         }]).select().single();
         if (docError) throw new Error("Failed to create doctor profile.");
         currentUser.doctorId = docData.id;
      }
      if (data.session) {
        if(showToast) showToast(`Welcome to Rapha'l, ${name.trim()}!`);
        onLogin(currentUser);
      } else {
        if(showToast) showToast('Account created. Please confirm your email before signing in.', 'info');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Unable to create account right now.');
    } finally {
      setLoading(false);
    }
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      if (showToast) showToast('Password reset email sent.', 'info');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className={`w-full max-w-md bg-white border border-cyan-100 p-8 sm:p-10 rounded-3xl shadow-[0_24px_80px_-36px_rgba(14,165,233,0.55)] z-10 transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}`}>
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/25 transform hover:rotate-6 transition-transform duration-500">
             <Shield className="text-white" size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-950 mb-3 tracking-tight">Rapha'l</h1>
          <p className="text-cyan-600 text-xs font-black tracking-[0.3em] uppercase">Bright Healthcare Access</p>
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
        ) : (
           <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                 {loading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
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
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: `Hi! I'm Rapha'l Assistant. Need help finding a specialist?` }]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: chatInput }]);
    const query = chatInput.toLowerCase();
    setChatInput('');
    setTimeout(() => {
      let response = "I'm not sure. Try keywords like 'fever', 'heart', or doctor names.";
      const match = Object.keys(SYMPTOM_MAP).find(k => query.includes(k));
      if (match) {
        setSearchQuery(SYMPTOM_MAP[match]);
        response = `That sounds like you need a ${SYMPTOM_MAP[match]}. Let me show you some experts.`;
        setTimeout(() => setView('search'), 1500);
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: response }]);
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-24 flex-1 bg-slate-50/50 min-h-full">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden bg-white px-6 py-10 rounded-b-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border-b border-slate-100">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 flex justify-between items-center mb-6">
           <div>
             <p className="text-sm font-bold text-teal-600 mb-1 tracking-wide uppercase">Good Morning</p>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Find your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Specialist.</span></h1>
           </div>
           <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shadow-inner border border-slate-200">
             <User size={24} className="text-slate-400" />
           </div>
        </div>

        <div className="relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl group">
            <input type="text" placeholder="Search doctors, specialties, symptoms..."
              className="w-full h-14 pl-12 pr-5 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium"
              onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length > 2) setView('search'); }}
            />
            <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={20} />
            <div className="absolute right-2 top-2 bg-slate-100 p-2 rounded-xl text-slate-400"><Sparkles size={16}/></div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-lg font-black text-slate-800">Top Rated Doctors</h2>
          <button onClick={() => setView('search')} className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">See all <ChevronRight size={14}/></button>
        </div>
        
        <div className="grid gap-4">
          {doctors.slice(0, 3).map(doctor => (
            <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="group bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-teal-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-4 items-center">
              <Avatar name={doctor.name} url={doctor.image} size="md" />
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{doctor.name}</h3>
                <p className="text-xs font-semibold text-slate-500 mb-2">{doctor.specialty}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-amber-700">{doctor.rating || '5.0'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <MapPin size={12} /> {doctor.district}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
        {showChat && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] w-[85vw] sm:w-80 flex flex-col border border-slate-100 mb-4 overflow-hidden transform animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg"><Sparkles size={16} /></div>
                <span className="font-bold text-sm">Rapha'l AI</span>
              </div>
              <button onClick={() => setShowChat(false)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={16} /></button>
            </div>
            <div className="h-64 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 text-sm shadow-sm ${msg.sender === 'user' ? 'bg-teal-500 text-white rounded-2xl rounded-br-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-bl-sm font-medium'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input type="text" placeholder="Type a symptom..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} className="flex-1 bg-slate-100 rounded-xl px-4 py-2 outline-none text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white border border-transparent focus:border-teal-200 transition-all" />
              <button onClick={handleSendChat} className="p-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors shadow-md shadow-teal-500/20"><Send size={16} /></button>
            </div>
          </div>
        )}
        <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/30 hover:scale-105 active:scale-95 transition-all duration-300">
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
    <div className="h-full flex flex-col bg-slate-50 min-h-screen pb-24">
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-20 pt-4 pb-3 px-4 border-b border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('home')} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-700"><ChevronLeft size={20}/></button>
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find your doctor..." className="w-full bg-slate-100 focus:bg-white border border-transparent focus:border-teal-200 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-medium text-sm" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', ...Array.from(new Set(Object.values(SYMPTOM_MAP)))].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredDoctors.length === 0 && (
           <div className="text-center py-20 text-slate-400 font-medium">No specialists found for this search.</div>
        )}
        {filteredDoctors.map(doctor => (
          <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="bg-white p-4 rounded-[1.5rem] shadow-sm hover:shadow-lg border border-slate-100 cursor-pointer flex gap-4 group transition-all duration-300 hover:-translate-y-1">
            <Avatar name={doctor.name} url={doctor.image} size="md" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                 <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{doctor.name}</h3>
                 <span className="bg-teal-50 text-teal-700 font-black text-xs px-2 py-1 rounded-lg">{doctor.price}</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-2">{doctor.specialty}</p>
              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><Star size={12} className="fill-amber-400 text-amber-400"/> {doctor.rating || '5.0'}</span>
                <span className="flex items-center gap-1"><MapPin size={12}/> {doctor.district || 'Nagaland'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DoctorDetailView({ doctor, setView, selectedSlot, setSelectedSlot, selectedDate, handleBook }) {
  if (!doctor) return null;
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="relative h-64 bg-slate-900 shrink-0 rounded-b-[3rem] shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-slate-900 rounded-b-[3rem] opacity-90" />
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="absolute top-6 left-6 z-20 p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"><ChevronLeft size={20} /></button>
        
        <div className="absolute -bottom-16 left-8 z-20">
           <Avatar name={doctor.name} url={doctor.image} size="lg" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-20 px-8 pb-32 space-y-8">
        <div>
           <div className="flex justify-between items-start mb-2">
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{doctor.name}</h1>
           </div>
           <p className="text-teal-600 font-bold text-sm mb-4">{doctor.specialty}</p>
           <div className="flex gap-2">
              <Badge type="success"><Shield size={10} className="inline mr-1"/>Verified</Badge>
              <Badge type="info"><Star size={10} className="inline mr-1"/>{doctor.rating || '5.0'}</Badge>
           </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-black text-lg text-slate-800">About Specialist</h3>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">{doctor.bio || "Leading specialist available for consultation. Bringing years of experience and dedicated patient care to Rapha'l Health."}</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">Select Time</h3>
             <div className="bg-slate-200/50 px-3 py-1 rounded-lg text-xs font-bold text-slate-600">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {doctor.slots?.map(slot => (
                <button 
                  key={slot} 
                  onClick={() => setSelectedSlot(slot)} 
                  className={`py-3.5 rounded-2xl text-xs font-bold transition-all duration-300 border-2 outline-none focus:ring-4 ${
                    selectedSlot === slot 
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm focus:ring-teal-500/20' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200'
                  }`}
                >
                  {slot}
                </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Floating Action Area */}
      <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200/50 p-6 pb-8 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        <div className="flex justify-between items-center mb-4 px-2">
           <span className="text-sm font-bold text-slate-500">Consultation Fee</span>
           <span className="text-2xl font-black text-teal-600">{doctor.price}</span>
        </div>
        <Button className="w-full shadow-teal-500/40" onClick={handleBook} disabled={!selectedSlot}>
           {selectedSlot ? `Confirm Booking for ${selectedSlot}` : 'Select a Time Slot'}
        </Button>
      </div>
    </div>
  );
}

function DashboardView({ appointments, onPayNow, onPayCash }) {
  if (!appointments.length) return (
    <div className="p-8 text-center flex flex-col items-center justify-center h-full bg-slate-50 pb-24">
      <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6"><Calendar size={40} className="text-teal-400" /></div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">No Visits Yet</h2>
      <p className="text-slate-500 font-medium text-sm">Your upcoming appointments will appear here.</p>
    </div>
  );
  
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full pb-32">
       <div className="flex items-center gap-3 mb-2">
         <div className="p-2 bg-teal-100 text-teal-600 rounded-xl"><Activity size={20} /></div>
         <h2 className="text-2xl font-black text-slate-800">My Visits</h2>
       </div>
       
       {appointments.map(apt => {
         const isAwaitingPayment = apt.status === 'Accepted' && apt.payment_status === 'Unpaid';
         return (
           <div key={apt.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-600">{apt.doctor_name}</h3>
                 <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg mt-2 ${
                    apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    apt.status === 'Accepted' ? 'bg-teal-50 text-teal-600' :
                    apt.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                 }`}>{apt.status}</span>
               </div>
               <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-center shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-xl font-black text-slate-800">{new Date(apt.appointment_date).getDate()}</span>
               </div>
             </div>
             
             <div className="flex gap-6 mb-2 text-sm font-bold text-slate-500 bg-slate-50 p-4 rounded-2xl">
                <span className="flex items-center gap-2"><Clock size={16} className="text-teal-500"/> {apt.slot}</span>
                <span className="flex items-center gap-2"><IndianRupee size={16} className="text-teal-500"/> {apt.amount?.toString().replace(/\D/g, '')}</span>
             </div>
             
             {isAwaitingPayment && (
               <div className="mt-6 flex gap-3">
                 <Button onClick={() => onPayNow(apt)} className="flex-1 text-sm py-3 shadow-none">Pay via UPI</Button>
                 <Button onClick={() => onPayCash(apt)} variant="secondary" className="flex-1 text-sm py-3 border-2">Pay Cash</Button>
               </div>
             )}
           </div>
         );
       })}
    </div>
  );
}

function ProfileView({ user, logout }) {
  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto bg-slate-50 pb-24">
      <div className="flex items-center gap-3 mb-8">
         <div className="p-2 bg-slate-200 text-slate-700 rounded-xl"><User size={20} /></div>
         <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl border-2 border-white shadow-md">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">{user?.name}</h2>
              <Badge type="info">Patient Account</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-bold text-sm">{user?.name || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-bold text-sm">{user?.email || 'N/A'}</div>
            </div>
          </div>
          
          <div className="pt-6 mt-6 border-t border-slate-100">
              <Button onClick={logout} variant="danger" className="w-full py-4"><LogOut size={18} /> Sign Out Securely</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorDashboard({ user, logout, showToast }) {
  const [appointments, setAppointments] = useState([]);
  
  useEffect(() => {
    let active = true;
    const fetchApts = async () => {
      if (user?.doctorId) {
         const { data } = await supabase.from('appointments').select().eq('doctor_id', user.doctorId);
         if (data && active) setAppointments(data);
      }
    };
    fetchApts();
    return () => { active = false; };
  }, [user?.doctorId]);

  const handleAction = async (id, action) => {
    const status = action === 'accept' ? 'Accepted' : 'Cancelled';
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (!error) showToast(action === 'accept' ? "Appointment Confirmed" : "Appointment Declined");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="flex justify-between items-center mb-10 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} size="sm" />
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Dr. {user?.name}</h1>
            <span className="text-xs font-bold text-teal-600">Provider Console</span>
          </div>
        </div>
        <button onClick={logout} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"><LogOut size={18} /></button>
      </div>
      
      <div className="space-y-6">
        <h2 className="text-xl font-black text-slate-800">Requests ({appointments.filter(a => a.status === 'Pending Approval').length})</h2>
        {appointments.filter(a => a.status === 'Pending Approval').map(apt => (
          <div key={apt.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60">
            <h3 className="font-black text-lg text-slate-800 mb-1">{apt.patient_name}</h3>
            <p className="text-sm font-bold text-slate-500 mb-6 flex items-center gap-2"><Calendar size={14}/> {new Date(apt.appointment_date).toLocaleDateString()} at {apt.slot}</p>
            <div className="flex gap-3">
              <Button onClick={() => handleAction(apt.id, 'accept')} className="flex-1 py-3 text-sm shadow-none"><Check size={16}/> Accept</Button>
              <Button onClick={() => handleAction(apt.id, 'reject')} variant="secondary" className="flex-1 py-3 text-sm border-2"><X size={16}/> Decline</Button>
            </div>
          </div>
        ))}
        {appointments.length === 0 && (
          <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No new appointments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ logout, doctors }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight"><Shield className="text-teal-400"/> System Admin</h1>
        <button onClick={logout} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-colors"><LogOut size={18} /></button>
      </div>
      <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
        <h2 className="text-lg font-bold mb-6 text-slate-300">Registered Providers ({doctors.length})</h2>
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 flex justify-between items-center hover:border-teal-500/50 transition-colors">
              <div>
                <h3 className="font-bold text-white text-lg">{doc.name}</h3>
                <p className="text-sm font-medium text-teal-400">{doc.specialty}</p>
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
  const selectedDate = new Date(); 
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

        const { data: profile } = await supabase.from('users').select().eq('id', sessionUser.id).single();
        if (profile && active) {
           if (profile.role === 'doctor') {
              const { data: docData } = await supabase.from('doctors').select().eq('name', profile.name).single();
              if (docData) profile.doctorId = docData.id;
           }
           setUser(profile);
           if (profile.role === 'admin') setView('admin');
           else if (profile.role === 'doctor') setView('doctor_dashboard');
           else setView('home');
        }
        if (active) setLoadingAuth(false);
     };

     const loadDoctors = async () => {
        const { data } = await supabase.from('doctors').select();
        if (data && active) setDoctors(data);
     };

     supabase.auth.getSession().then(({ data: { session } }) => {
        if (active) {
           loadData(session?.user);
           loadDoctors();
        }
     });

     const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (active) loadData(session?.user);
     });
     
     return () => { 
        active = false; 
        subscription.unsubscribe(); 
     };
  }, []);

  const fetchPatientAppointments = useCallback(async () => {
     if (user?.id) {
        const { data } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
        if (data) setAppointments(data);
     }
  }, [user]);

  useEffect(() => {
     let active = true;
     const load = async () => {
        if (user?.id && user.role === 'patient' && view === 'dashboard') {
           const { data } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
           if (active && data) setAppointments(data);
        }
     };
     load();
     return () => { active = false; };
  }, [user, view]);

  const handleLogin = (userData) => {
     setUser(userData);
     if (userData.role === 'admin') setView('admin');
     else if (userData.role === 'doctor') setView('doctor_dashboard');
     else setView('home');
  };

  const handleLogout = async () => {
     await supabase.auth.signOut();
     setUser(null);
     setView('login');
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
         amount: selectedDoctor.price || '500'
     };
     const { error } = await supabase.from('appointments').insert([appt]);
     if (!error) {
         showToast("Booking request sent successfully!", "success");
         setView('success');
     } else {
         showToast("Failed to book: " + error?.message, 'error');
     }
  };

  const handlePayCash = async (appt) => {
     const { error } = await supabase.from('appointments').update({ payment_mode: 'Cash', payment_status: 'Pending Verification' }).eq('id', appt.id);
     if (!error) {
         showToast("Selected Cash. Please pay at the clinic.", "info");
         fetchPatientAppointments();
     }
  };

  const handlePayNow = async (appt) => {
      showToast("UPI verified for testing purposes.", "success");
      const { error } = await supabase.from('appointments').update({ payment_mode: 'UPI', payment_status: 'Verified & Paid', status: 'Confirmed' }).eq('id', appt.id);
      if (!error) fetchPatientAppointments();
  };

  if (loadingAuth) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-500" size={40} strokeWidth={3} /></div>;
  }

  return (
     <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex justify-center selection:bg-teal-100 relative">
        {/* Dynamic Island Toast */}
        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 text-white px-5 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300">
            {notification.type === 'error' ? <X Circle size={18} className="text-red-400" /> : <CheckCircle size={18} className={notification.type === 'info' ? "text-blue-400" : "text-teal-400"} />}
            <span className="text-sm font-bold tracking-wide">{notification.msg}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
           {view === 'login' && <LoginView onLogin={handleLogin} showToast={showToast} />}
           {view === 'admin' && <AdminDashboard logout={handleLogout} doctors={doctors} />}
           {view === 'doctor_dashboard' && <DoctorDashboard user={user} logout={handleLogout} showToast={showToast} />}
           
           {['home', 'search', 'detail', 'dashboard', 'profile', 'success'].includes(view) && user && user.role === 'patient' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                 <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {view === 'home' && <HomeView setView={setView} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
                    {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={setView} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
                    {view === 'detail' && <DoctorDetailView doctor={selectedDoctor} setView={setView} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} handleBook={initiateBooking} />}
                    {view === 'dashboard' && <DashboardView appointments={appointments} onPayNow={handlePayNow} onPayCash={handlePayCash} />}
                    {view === 'profile' && <ProfileView user={user} logout={handleLogout} />}
                    {view === 'success' && (
                       <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce"><CheckCircle size={48} className="text-green-500" /></div>
                          <h1 className="text-3xl font-black mb-3 text-slate-800">Confirmed!</h1>
                          <p className="text-slate-500 font-medium mb-10">Your booking request has been sent to the doctor.</p>
                          <Button onClick={() => setView('dashboard')} className="w-full mb-4 shadow-none">View Appointments</Button>
                          <Button onClick={() => setView('home')} variant="secondary" className="w-full border-2">Back to Home</Button>
                       </div>
                    )}
                 </div>

                 {/* Premium Floating iOS-style Bottom Nav */}
                 {!['detail', 'success', 'login'].includes(view) && (
                    <div className="absolute bottom-0 w-full px-6 pb-6 pt-2 z-40 pointer-events-none">
                       <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 p-2 rounded-[2rem] flex justify-around items-center shadow-[0_20px_40px_rgba(0,0,0,0.3)] pointer-events-auto">
                         {[
                           { id: 'home', icon: Zap, label: 'Home' },
                           { id: 'search', icon: Search, label: 'Search' },
                           { id: 'dashboard', icon: Calendar, label: 'Visits' },
                           { id: 'profile', icon: User, label: 'Profile' }
                         ].map(item => (
                           <button 
                             key={item.id} 
                             onClick={() => setView(item.id)} 
                             className={`relative flex flex-col items-center gap-1 w-16 py-2 rounded-2xl transition-all duration-300 ${view === item.id ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                             <item.icon size={22} strokeWidth={view === item.id ? 2.5 : 2} className={view === item.id ? 'animate-in zoom-in-75 duration-200' : ''} />
                             <span className="text-[9px] font-extrabold uppercase tracking-wider">{item.label}</span>
                             {view === item.id && <div className="absolute -top-1 w-8 h-1 bg-teal-500 rounded-full blur-[2px]"></div>}
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
