import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Calendar, Clock, MapPin, Star, Shield, Activity, User, CheckCircle, X,
  ArrowRight, Loader2, EyeOff, Check, LogOut, MessageSquare, Send, 
  ChevronLeft, IndianRupee, Zap, Mail, Lock
} from 'lucide-react';

// ==========================================
// GLOBAL CONFIGURATION & SUPABASE SETUP
// ==========================================
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || "https://wogynpamaclqouzyllgn.supabase.co";
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "sb_publishable_OdSAp_DAPXo_3kzaC3knLA_D1UVW1QN";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SYMPTOM_MAP = {
  head: 'Neurologist', migraine: 'Neurologist', brain: 'Neurologist',
  heart: 'Cardiologist', chest: 'Cardiologist', breath: 'Cardiologist',
  pain: 'General Physician', fever: 'General Physician', flu: 'General Physician',
  bone: 'Orthopedic', joint: 'Orthopedic', knee: 'Orthopedic', back: 'Orthopedic',
  skin: 'Dermatologist', rash: 'Dermatologist', acne: 'Dermatologist',
  eye: 'Ophthalmologist', vision: 'Ophthalmologist',
};

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 shadow-lg";
  const variants = {
    primary: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-teal-500/30",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 shadow-none",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700"
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${styles[type]}`}>{children}</span>
  );
};

// ==========================================
// VIEWS
// ==========================================

function LoginView({ onLogin, showToast }) {
  const [mode, setMode] = useState('login'); 
  const [isVisible, setIsVisible] = useState(false); 
  const [email, setEmail] = useState('');
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
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.from('users').select().eq('email', email).eq('password', password).single();
      if (loginError || !data) throw new Error("Invalid email or password.");
      if (data.role === 'doctor') {
        const { data: docProfile } = await supabase.from('doctors').select().eq('name', data.name).single();
        if (docProfile) data.doctorId = docProfile.id;
      }
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('users').select().eq('email', email).single();
      if (existing) throw new Error("Email already registered.");
      const { data: newUser, error: insertError } = await supabase.from('users').insert([{ email, password, name, role, phone, district: 'Dimapur' }]).select().single();
      if (insertError) throw insertError;
      
      let currentUser = newUser;
      if (role === 'doctor') {
         const { data: docData, error: docError } = await supabase.from('doctors').insert([{ 
             name, specialty, rating: 5.0, reviews: 0, image: '', 
             location: 'Online', experience: '1 Year', bio: 'New specialist at Rapha\'l.', 
             price: `₹${price}`, slots: ['09:00 AM', '10:00 AM', '02:00 PM'], upi_id: doctorUpi 
         }]).select().single();
         if (docError) throw new Error("Failed to create doctor profile.");
         currentUser.doctorId = docData.id;
      }
      if(showToast) showToast(`Welcome to Rapha'l, ${name}!`);
      onLogin(currentUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto overflow-x-hidden font-sans">
      <div className={`w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-tr from-teal-400 to-cyan-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl"><Shield className="text-white" size={48} /></div>
          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">Rapha'l</h1>
          <p className="text-slate-400 text-xs font-bold tracking-[0.25em] uppercase">Healthcare Portal</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-slate-500" size={20} /></div>
                <input type="email" placeholder="Email Address (e.g., patient@raphal.com)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-teal-500 outline-none" required />
            </div>
            <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="text-slate-500" size={20} /></div>
                <input type={showPassword ? "text" : "password"} placeholder="Password (e.g., password)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-12 py-4 text-white focus:ring-2 focus:ring-teal-500 outline-none" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400"><EyeOff size={20} /></button>
            </div>
            {error && <div className="bg-red-500/10 text-red-200 text-sm text-center py-3 rounded-xl">{error}</div>}
            <Button className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-2xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Secure Login"}
            </Button>
            <button type="button" onClick={() => setMode('register')} className="w-full text-center mt-6 text-slate-400 text-sm hover:text-teal-400 flex items-center justify-center gap-1 group">
                Create Verified Account <ArrowRight size={14} className="group-hover:translate-x-1" />
            </button>
          </form>
        ) : (
           <div className="space-y-5">
              <div className="flex gap-2 mb-6 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/50">
                {['patient', 'doctor'].map(r => (
                  <button key={r} onClick={() => setRole(r)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${role === r ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{r}</button>
                ))}
              </div>
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500" />
              
              {role === 'doctor' && (
                <div className="space-y-4 p-4 bg-teal-900/10 rounded-2xl border border-teal-900/30">
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none">
                    {Object.values(SYMPTOM_MAP).filter((v,i,a)=>a.indexOf(v)===i).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" placeholder="Consultation Fee (₹)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none" />
                  <input type="text" placeholder="Your UPI ID" value={doctorUpi} onChange={(e) => setDoctorUpi(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
              )}
              
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-teal-500" />
              {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
              
              <Button onClick={handleRegisterSubmit} className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none mt-2" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mx-auto" /> : "Complete Registration"}
              </Button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center mt-4 text-slate-400 text-sm flex justify-center items-center gap-1 group">
                 Back to Login
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
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: `Hello! I am Rapha'l's advanced AI assistant. How can I help?` }]);
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
        response = `That sounds like you need a ${SYMPTOM_MAP[match]}. I've filtered the results for you.`;
        setTimeout(() => setView('search'), 1500);
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: response }]);
    }, 1000);
  };

  return (
    <div className="space-y-8 pb-10 flex-1 bg-slate-50">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 p-8 text-white shadow-lg mx-4 mt-4">
        <div className="relative z-10">
          <h1 className="text-4xl font-black mb-4 leading-tight">Healthcare <br/><span className="text-teal-100">Reimagined.</span></h1>
          <div className="relative shadow-lg rounded-xl mt-6">
              <input type="text" placeholder="Try 'migraine' or 'Dr. Alan'..."
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/95 border border-white/20 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-300/50"
                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.length > 2) setView('search'); }}
              />
              <Search className="absolute left-3 top-3.5 text-teal-500" size={20} />
          </div>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-lg font-black text-slate-800 mb-3">Top Rated Specialists</h2>
        <div className="grid gap-4">
          {doctors.slice(0, 3).map(doctor => (
            <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-teal-50 flex items-center justify-center text-teal-500 font-bold text-xl">{doctor.name ? doctor.name.charAt(4) : 'Dr'}</div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-slate-900">{doctor.name}</h3>
                <p className="text-sm font-medium text-teal-600">{doctor.specialty}</p>
                <div className="flex items-center gap-1 mt-1 bg-amber-50 self-start px-2 py-0.5 rounded-md border border-amber-100">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700">{doctor.rating || '5.0'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end">
        {showChat && (
          <div className="bg-white rounded-2xl shadow-2xl w-80 flex flex-col border border-slate-200 mb-4 overflow-hidden">
            <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
              <span className="font-bold text-sm">Rapha'l Assistant</span>
              <button onClick={() => setShowChat(false)}><X size={18} /></button>
            </div>
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-teal-500 text-white rounded-br-none' : 'bg-white border text-slate-700 rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-white flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} className="flex-1 bg-slate-100 rounded-xl px-4 py-2 outline-none" />
              <button onClick={handleSendChat} className="p-2 bg-teal-600 text-white rounded-xl"><Send size={18} /></button>
            </div>
          </div>
        )}
        <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full bg-teal-600 text-white shadow-2xl hover:scale-105">
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
    <div className="h-full flex flex-col bg-slate-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 p-4 border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="text-slate-600" /></button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-slate-100 rounded-xl py-2.5 pl-10 pr-4 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {['All', ...Array.from(new Set(Object.values(SYMPTOM_MAP)))].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${activeCategory === cat ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredDoctors.map(doctor => (
          <div key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer flex gap-4">
            <div className="w-14 h-14 rounded-full border shadow-sm bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-xl">{doctor.name ? doctor.name.charAt(4) : 'Dr'}</div>
            <div className="flex-1">
              <div className="flex justify-between"><h3 className="font-bold text-slate-900">{doctor.name}</h3><span className="text-teal-600 font-bold text-sm">{doctor.price}</span></div>
              <p className="text-sm text-slate-500">{doctor.specialty}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400"/> {doctor.rating || '5.0'}</span>
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
      <div className="relative h-56 bg-slate-900 shrink-0">
        <div className="w-full h-full object-cover opacity-60 bg-teal-900" />
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="absolute top-4 left-4 z-20 p-2 bg-white/20 backdrop-blur-md rounded-full text-white"><ChevronLeft /></button>
        <div className="absolute -bottom-12 left-6 z-20">
          <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl bg-teal-100 flex items-center justify-center text-teal-600 text-4xl font-bold">{doctor.name ? doctor.name.charAt(4) : 'Dr'}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-16 px-6 pb-24 space-y-6">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">{doctor.name}</h1>
           <p className="text-teal-600 font-bold text-sm mb-4">{doctor.specialty}</p>
           <Badge type="info">Verified Expert</Badge>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black mb-2">About Specialist</h3>
          <p className="text-slate-500 text-sm">{doctor.bio || "Leading specialist available for consultation."}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black flex items-center gap-2"><Clock size={18} className="text-teal-500" /> Available Times</h3>
             <span className="text-xs font-bold text-slate-400">{selectedDate.toLocaleDateString()}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {doctor.slots?.map(slot => (
                <button key={slot} onClick={() => setSelectedSlot(slot)} className={`py-3 rounded-xl text-xs font-bold transition-all ${selectedSlot === slot ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{slot}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 pb-safe mt-auto z-30 relative">
        <Button className="w-full" onClick={handleBook} disabled={!selectedSlot}>{selectedSlot ? `Book for ${selectedSlot}` : 'Select Time'}</Button>
      </div>
    </div>
  );
}

function DashboardView({ appointments, onPayNow, onPayCash }) {
  if (!appointments.length) return <div className="p-8 text-center flex flex-col items-center justify-center h-full bg-slate-50"><Calendar size={48} className="text-teal-300 mb-4" /><h2 className="text-2xl font-black text-slate-800">No Visits Yet</h2></div>;
  
  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-full pb-20">
       <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6"><Activity size={24} className="text-teal-500" /> My Visits</h2>
       {appointments.map(apt => {
         const isAwaitingPayment = apt.status === 'Accepted' && apt.payment_status === 'Unpaid';
         return (
           <div key={apt.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h3 className="text-lg font-black text-slate-900">{apt.doctor_name}</h3>
                 <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-2">{apt.status}</span>
               </div>
               <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 block">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black text-teal-600">{new Date(apt.appointment_date).getDate()}</span>
               </div>
             </div>
             <div className="flex gap-4 mb-4 text-sm font-medium text-slate-600">
                <span className="flex items-center gap-1"><Clock size={16}/> {apt.slot}</span>
                <span className="flex items-center gap-1"><IndianRupee size={16}/> {apt.amount?.toString().replace(/\D/g, '')}</span>
             </div>
             {isAwaitingPayment && (
               <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                 <Button onClick={() => onPayNow(apt)} className="flex-1 text-xs py-2">Pay via UPI</Button>
                 <Button onClick={() => onPayCash(apt)} variant="outline" className="flex-1 text-xs py-2">Pay Cash</Button>
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
    <div className="h-full flex flex-col p-6 overflow-y-auto bg-slate-50">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2"><User className="text-teal-600" /> My Profile</h1>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
          <input type="text" value={user?.name || ''} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
          <input type="email" value={user?.email || ''} readOnly className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900" />
        </div>
        <div className="pt-4 border-t border-slate-100">
            <Button onClick={logout} variant="danger" className="w-full"><LogOut size={18} /> Log Out</Button>
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
    if (!error) showToast(action === 'accept' ? "Accepted!" : "Rejected");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-slate-900">Dr. {user?.name}</h1>
        <Button onClick={logout} variant="danger" className="py-2 px-4 text-sm">Logout</Button>
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Appointment Requests</h2>
        {appointments.filter(a => a.status === 'Pending Approval').map(apt => (
          <div key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
            <h3 className="font-bold">{apt.patient_name}</h3>
            <p className="text-sm text-slate-500 mb-4">{new Date(apt.appointment_date).toLocaleDateString()} @ {apt.slot}</p>
            <div className="flex gap-2">
              <Button onClick={() => handleAction(apt.id, 'accept')} className="flex-1 py-2 text-sm bg-teal-600"><Check size={16}/> Accept</Button>
              <Button onClick={() => handleAction(apt.id, 'reject')} className="flex-1 py-2 text-sm bg-slate-200 text-slate-700 hover:bg-red-100"><X size={16}/> Reject</Button>
            </div>
          </div>
        ))}
        {appointments.length === 0 && <p className="text-slate-500">No appointments yet.</p>}
      </div>
    </div>
  );
}

function AdminDashboard({ logout, doctors }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="text-teal-400"/> Admin</h1>
        <Button onClick={logout} variant="danger" className="py-2 px-4 text-sm">Logout</Button>
      </div>
      <div className="bg-slate-800 p-6 rounded-2xl">
        <h2 className="text-lg font-bold mb-4">Registered Doctors ({doctors.length})</h2>
        <div className="space-y-3">
          {doctors.map(doc => (
            <div key={doc.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
              <div><h3 className="font-bold">{doc.name}</h3><p className="text-sm text-slate-400">{doc.specialty}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP ROUTER
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
  
  // Constant declaration prevents unused state errors
  const selectedDate = new Date(); 
  
  const [notification, setNotification] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const showToast = useCallback((msg, type='success') => {
     setNotification({msg, type});
     setTimeout(() => setNotification(null), 3000);
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

     // Initial fetch
     supabase.auth.getSession().then(({ data: { session } }) => {
        if (active) {
           loadData(session?.user);
           loadDoctors();
        }
     });

     // Listener
     const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (active) loadData(session?.user);
     });
     
     return () => { 
        active = false; 
        subscription.unsubscribe(); 
     };
  }, []);

  // Correctly memoized hook using user as the direct dependency
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
         showToast("Booking request sent!");
         setView('success');
     } else {
         showToast("Failed to book: " + error?.message, 'error');
     }
  };

  const handlePayCash = async (appt) => {
     const { error } = await supabase.from('appointments').update({ payment_mode: 'Cash', payment_status: 'Pending Verification' }).eq('id', appt.id);
     if (!error) {
         showToast("Cash payment selected. Please pay at the clinic.");
         fetchPatientAppointments();
     }
  };

  const handlePayNow = async (appt) => {
      showToast("UPI Gateway integration pending. Marking as verified for testing.", "info");
      const { error } = await supabase.from('appointments').update({ payment_mode: 'UPI', payment_status: 'Verified & Paid', status: 'Confirmed' }).eq('id', appt.id);
      if (!error) fetchPatientAppointments();
  };

  if (loadingAuth) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-teal-500" size={48} /></div>;
  }

  return (
     <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex justify-center selection:bg-teal-100 relative">
        {notification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in">
            <CheckCircle size={16} className={notification.type === 'error' ? "text-red-400" : "text-teal-400"} />
            <span className="text-sm font-medium">{notification.msg}</span>
          </div>
        )}

        <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
           {view === 'login' && <LoginView onLogin={handleLogin} showToast={showToast} />}
           {view === 'admin' && <AdminDashboard logout={handleLogout} doctors={doctors} />}
           {view === 'doctor_dashboard' && <DoctorDashboard user={user} logout={handleLogout} showToast={showToast} />}
           
           {['home', 'search', 'detail', 'dashboard', 'profile', 'success'].includes(view) && user && user.role === 'patient' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                 <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {view === 'home' && <HomeView setView={setView} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
                    {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={setView} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
                    {view === 'detail' && <DoctorDetailView doctor={selectedDoctor} setView={setView} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} handleBook={initiateBooking} />}
                    {view === 'dashboard' && <DashboardView appointments={appointments} onPayNow={handlePayNow} onPayCash={handlePayCash} />}
                    {view === 'profile' && <ProfileView user={user} logout={handleLogout} />}
                    {view === 'success' && (
                       <div className="flex flex-col items-center justify-center text-center p-8 h-full pt-32">
                          <CheckCircle size={64} className="text-green-500 mb-6" />
                          <h1 className="text-2xl font-bold mb-4">Request Sent!</h1>
                          <Button onClick={() => setView('dashboard')} className="w-full mb-3">View Appointments</Button>
                          <Button onClick={() => setView('home')} variant="outline" className="w-full">Back to Home</Button>
                       </div>
                    )}
                 </div>

                 {!['detail', 'success'].includes(view) && (
                    <div className="bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 flex justify-around items-center z-40 sticky bottom-0">
                       <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-teal-600' : 'text-slate-400'}`}><Zap size={24} /><span className="text-[10px] font-bold">Discover</span></button>
                       <button onClick={() => setView('search')} className={`flex flex-col items-center gap-1 ${view === 'search' ? 'text-teal-600' : 'text-slate-400'}`}><Search size={24} /><span className="text-[10px] font-bold">Find</span></button>
                       <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-teal-600' : 'text-slate-400'}`}><Calendar size={24} /><span className="text-[10px] font-bold">Visits</span></button>
                       <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-teal-600' : 'text-slate-400'}`}><User size={24} /><span className="text-[10px] font-bold">Profile</span></button>
                    </div>
                 )}
              </div>
           )}
        </div>
     </div>
  );
}