import React, { useState, useEffect } from 'react';
import { Lock, User, Upload, Stethoscope, IndianRupee, Camera, Mail, Phone, ArrowRight, CheckCircle, Shield, Loader2, Eye, EyeOff, MapPin, Calendar, Heart, Activity } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabaseClient';

export default function LoginView({ onLogin, showToast }) {
  const [mode, setMode] = useState('login'); 
  const [step, setStep] = useState(1); 
  const [isVisible, setIsVisible] = useState(false); 
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient');
  const [specialty, setSpecialty] = useState('General Physician');
  const [price, setPrice] = useState('500'); 
  const [avatarFile, setAvatarFile] = useState(null); 
  
  // Verification State
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const specialties = ['General Physician', 'Neurologist', 'Cardiologist', 'Dermatologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist'];

  useEffect(() => {
    setIsVisible(true);
    
    // --- HISTORY API INTEGRATION ---
    // Establish initial state so we can go back to it
    window.history.replaceState({ mode: 'login', step: 1 }, '');

    const handlePopState = (event) => {
      const state = event.state;
      if (state) {
        setMode(state.mode || 'login');
        setStep(state.step || 1);
      } else {
        // Fallback
        setMode('login');
        setStep(1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- NAVIGATION HELPERS ---
  const goToRegister = () => {
    window.history.pushState({ mode: 'register', step: 1 }, '');
    setMode('register');
    setStep(1);
  };

  const goToLogin = () => {
    // Using back() allows the browser to unwind the history stack naturally
    if (mode === 'register') {
        window.history.back();
    } else {
        setMode('login');
    }
  };

  // --- ACTIONS ---

  const handleSendOtp = () => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError('');
    // SIMULATE SMS GATEWAY
    const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(mockOtp);
    if(showToast) showToast(`Use OTP: ${mockOtp} to verify your number.`, "success"); 
    
    // Push history for the verification step
    window.history.pushState({ mode: 'register', step: 2 }, '');
    setStep(2);
  };

  const handleVerifyOtp = () => {
    if (otp === generatedOtp) {
      setIsPhoneVerified(true);
      if(showToast) showToast("Phone number verified successfully!");
      
      // Go back to Step 1 (Registration Form) but keep isPhoneVerified state
      window.history.back(); 
    } else {
      setError("Invalid OTP. Please try again.");
    }
  };

  const handleBackFromVerify = () => {
      window.history.back();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: loginError } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
      if (loginError || !data) throw new Error("Invalid email or password.");
      if (data.role === 'doctor') {
        const { data: docProfile } = await supabase.from('doctors').select('id').eq('name', data.name).single();
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
    if (!isPhoneVerified) {
      setError("You must verify your phone number first.");
      return;
    }
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
      if (existing) throw new Error("Email already registered.");
      const { data: newUser, error: insertError } = await supabase.from('users').insert([{ email, password, name, role, phone, district: 'Dimapur' }]).select().single();
      if (insertError) throw insertError;
      let currentUser = newUser;
      if (role === 'doctor') {
         let avatarUrl = '';
         if (avatarFile) {
           const fileExt = avatarFile.name.split('.').pop();
           const fileName = `${Math.random()}.${fileExt}`;
           const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
           if (!uploadError) {
             const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
             avatarUrl = urlData.publicUrl;
           }
         }
         const { data: docData, error: docError } = await supabase.from('doctors').insert([{ name, specialty, rating: 5.0, reviews: 0, image: avatarUrl, location: 'Online', experience: '1 Year', bio: 'New specialist at Rapha\'l.', price: `₹${price}`, slots: ['09:00 AM', '10:00 AM', '02:00 PM'] }]).select().single();
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto overflow-x-hidden font-sans transition-colors duration-500">
      
      {/* Background */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-400/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className={`w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl z-10 transform transition-all duration-1000 ease-out mb-12 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-teal-400 to-cyan-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-teal-500/30 transition-all duration-300 hover:scale-110 hover:rotate-3 cursor-pointer group">
            <Shield className="text-white drop-shadow-md transition-transform group-hover:scale-110" size={48} />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">Rapha'l</h1>
          <p className="text-slate-400 text-xs font-bold tracking-[0.25em] uppercase">Nagaland's Healthcare Portal</p>
        </div>

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className={`space-y-6 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-slate-500 group-focus-within:text-teal-500 transition-colors" size={20} />
                </div>
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white focus:bg-slate-900/80 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all duration-300 focus:scale-[1.02] placeholder:text-slate-500 shadow-sm" 
                    required 
                />
            </div>
            <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-500 group-focus-within:text-teal-500 transition-colors" size={20} />
                </div>
                <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-12 py-4 text-white focus:bg-slate-900/80 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all duration-300 focus:scale-[1.02] placeholder:text-slate-500 shadow-sm" 
                    required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-teal-400 focus:outline-none transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <Button className="w-full py-4 text-lg font-bold shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] transition-all duration-300 bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-2xl" disabled={loading}>
                {loading ? <span className="flex items-center gap-2 justify-center"><Loader2 className="animate-spin" /> Verifying...</span> : "Secure Login"}
            </Button>
            
            <button type="button" onClick={goToRegister} className="w-full text-center mt-6 text-slate-400 text-sm hover:text-teal-400 transition-colors duration-200 flex items-center justify-center gap-1 group">
                Create Verified Account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'register' && (
           <div className={`space-y-5 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            {step === 1 && (
              <>
                <div className="flex gap-2 mb-6 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/50">
                  {['patient', 'doctor'].map(r => (
                    <button key={r} onClick={() => setRole(r)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${role === r ? 'bg-slate-700 text-white shadow-lg ring-1 ring-teal-500/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{r}</button>
                  ))}
                </div>
                
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />
                
                <div className="relative group">
                  <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPhoneVerified} className={`w-full bg-slate-900/60 border ${isPhoneVerified ? 'border-green-500 text-green-600' : 'border-slate-700/50 text-white'} rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500`} />
                  {isPhoneVerified ? (
                    <CheckCircle size={20} className="absolute right-4 top-3.5 text-green-500" />
                  ) : (
                    <button onClick={handleSendOtp} className="absolute right-2 top-2 bg-slate-800 text-xs px-4 py-1.5 rounded-lg text-white hover:bg-teal-600 transition-colors font-medium">Verify</button>
                  )}
                </div>

                {role === 'doctor' && (
                  <div className="space-y-4 p-4 bg-teal-900/10 rounded-2xl border border-teal-900/30 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none appearance-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer text-sm">
                        {specialties.map(s => <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>)}
                        </select>
                        <Stethoscope size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 flex items-center relative group">
                            <IndianRupee size={16} className="absolute left-3 text-slate-400 z-10" />
                            <input type="number" placeholder="Fee" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
                        </div>
                        <div className="flex-1">
                             <div className="relative w-full h-full group">
                                <input type="file" id="avatar-upload" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} className="hidden" />
                                <label htmlFor="avatar-upload" className={`flex items-center justify-center gap-2 w-full h-full rounded-xl border border-dashed cursor-pointer transition-all ${avatarFile ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-700 hover:border-teal-500 hover:text-teal-400 text-slate-400'}`}>
                                    <Camera size={18} />
                                    <span className="text-xs font-medium">{avatarFile ? 'Selected' : 'Photo'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                  </div>
                )}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />

                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                
                <Button onClick={handleRegisterSubmit} className="w-full py-4 text-lg font-bold shadow-xl shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-1 transition-all mt-2 bg-gradient-to-r from-teal-500 to-cyan-600 border-none" disabled={loading}>
                   {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Creating...</span> : "Complete Registration"}
                </Button>
                <button type="button" onClick={goToLogin} className="w-full text-center mt-4 text-slate-400 text-sm hover:text-white transition-colors flex items-center justify-center gap-1 group">
                    <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Login
                </button>
              </>
            )}

            {step === 2 && (
              <div className="text-center transition-all duration-500 animate-in zoom-in">
                <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600 shadow-xl shadow-teal-900/20">
                  <Phone className="text-teal-400 animate-pulse" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Verify Number</h2>
                <p className="text-slate-400 text-sm mb-8">Enter code sent to <span className="text-teal-400 font-mono">{phone}</span></p>
                
                <input 
                  type="text" 
                  placeholder="0000" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-600 rounded-2xl px-4 py-5 text-center text-4xl tracking-[0.5em] text-white focus:border-teal-500 outline-none mb-8 font-mono shadow-inner transition-all focus:scale-105" 
                  maxLength={4}
                />
                
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <Button onClick={handleVerifyOtp} className="w-full py-4 text-lg font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20 bg-gradient-to-r from-teal-500 to-cyan-600 border-none">Verify & Continue</Button>
                <button onClick={handleBackFromVerify} className="mt-6 text-sm text-slate-500 hover:text-white transition-colors underline decoration-slate-700 hover:decoration-white">Change Phone Number</button>
              </div>
            )}
           </div>
        )}
      </div>

      {/* --- SEO CONTENT FOOTER (VISIBLE TO GOOGLE) --- */}
      <div className="max-w-4xl mx-auto mt-8 text-center space-y-8 z-10 relative pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <MapPin className="mx-auto mb-3 text-teal-400" size={28} />
                <h3 className="text-white font-bold mb-2">Nagaland Wide</h3>
                <p className="text-sm">Connecting patients in Kohima, Dimapur, Mokokchung, and beyond with top specialists.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <Stethoscope className="mx-auto mb-3 text-teal-400" size={28} />
                <h3 className="text-white font-bold mb-2">Expert Doctors</h3>
                <p className="text-sm">Book appointments with Cardiologists, Neurologists, and General Physicians instantly.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <Calendar className="mx-auto mb-3 text-teal-400" size={28} />
                <h3 className="text-white font-bold mb-2">Easy Booking</h3>
                <p className="text-sm">Seamless scheduling with UPI payments and digital prescriptions.</p>
            </div>
        </div>
        
        <div className="text-slate-500 text-xs">
            <p>Rapha'l Health Platform is Nagaland's trusted digital healthcare solution. Find doctors, book appointments, and manage your health records securely.</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} Rapha'l Health. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}