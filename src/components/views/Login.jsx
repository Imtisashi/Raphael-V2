import React, { useState, useEffect } from 'react';
import { Lock, User, Upload, Stethoscope, IndianRupee, Camera, Mail, Phone, ArrowRight, CheckCircle, Shield, Loader2, Eye, EyeOff, MapPin, Calendar, Heart, Activity, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabaseClient';

export default function LoginView({ onLogin, showToast }) {
  const [mode, setMode] = useState('login'); // login, register, forgot
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
  const [price, setPrice] = useState(''); // Changed from '500' to empty so doctors must decide
  const [doctorUpi, setDoctorUpi] = useState(''); 
  const [avatarFile, setAvatarFile] = useState(null); 
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Verification State
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const specialties = ['General Physician', 'Neurologist', 'Cardiologist', 'Dermatologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist'];

  useEffect(() => {
    setIsVisible(true);
    window.history.replaceState({ mode: 'login', step: 1 }, '');
    const handlePopState = (event) => {
      const state = event.state;
      if (state) {
        setMode(state.mode || 'login');
        setStep(state.step || 1);
      } else {
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
    setError('');
  };

  const goToForgot = () => {
    window.history.pushState({ mode: 'forgot', step: 1 }, '');
    setMode('forgot');
    setStep(1);
    setError('');
  };

  const goToLogin = () => {
    if (mode === 'register' || mode === 'forgot') window.history.back();
    else setMode('login');
    setError('');
  };

  // --- REGISTRATION OTP LOGIC ---
  const handleSendOtp = () => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError('');
    const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(mockOtp);
    if(showToast) showToast(`Use OTP: ${mockOtp} to verify your number.`, "success"); 
    window.history.pushState({ mode: 'register', step: 2 }, '');
    setStep(2);
  };

  const handleVerifyOtp = () => {
    if (otp === generatedOtp) {
      setIsPhoneVerified(true);
      if(showToast) showToast("Phone number verified successfully!");
      window.history.back(); 
      setOtp('');
    } else {
      setError("Invalid OTP. Please try again.");
    }
  };

  const handleBackFromVerify = () => window.history.back();

  // --- FORGOT PASSWORD LOGIC ---
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.from('users').select('phone').eq('email', resetEmail).single();
      if (error || !data) throw new Error("No account found with this email.");
      
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(mockOtp);
      if(showToast) showToast(`Use OTP: ${mockOtp} to reset your password.`, "success"); 
      
      window.history.pushState({ mode: 'forgot', step: 2 }, '');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = (e) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      window.history.pushState({ mode: 'forgot', step: 3 }, '');
      setStep(3);
      setOtp('');
    } else {
      setError("Invalid OTP. Please try again.");
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if(newPassword.length < 4) {
        setError("Password must be at least 4 characters long.");
        return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.from('users').update({ password: newPassword }).eq('email', resetEmail);
      if (error) throw error;
      
      if(showToast) showToast("Password reset successfully! You can now login.");
      
      // Navigate back to login
      setMode('login');
      setStep(1);
      setResetEmail('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN & REGISTER LOGIC ---
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
    if (role === 'doctor') {
        if (!price || Number(price) <= 0) {
            setError("Doctors must set a valid consultation fee.");
            return;
        }
        if (!doctorUpi) {
            setError("Doctors must provide a UPI ID for payouts.");
            return;
        }
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
         
         const { data: docData, error: docError } = await supabase.from('doctors').insert([{ 
             name, specialty, rating: 5.0, reviews: 0, image: avatarUrl, 
             location: 'Online', experience: '1 Year', bio: 'New specialist at Rapha\'l.', 
             price: `₹${price}`, slots: ['09:00 AM', '10:00 AM', '02:00 PM'],
             upi_id: doctorUpi 
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto overflow-x-hidden font-sans transition-colors duration-500">
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-400/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className={`w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl z-10 transform transition-all duration-1000 ease-out mb-12 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
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
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-slate-500 group-focus-within:text-teal-500" size={20} /></div>
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-4 text-white focus:bg-slate-900/80 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all duration-300 focus:scale-[1.02] placeholder:text-slate-500 shadow-sm" required />
            </div>
            
            <div className="space-y-2">
                <div className="group relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="text-slate-500 group-focus-within:text-teal-500" size={20} /></div>
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl pl-12 pr-12 py-4 text-white focus:bg-slate-900/80 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all duration-300 focus:scale-[1.02] placeholder:text-slate-500 shadow-sm" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-teal-400"><Eye size={20} /></button>
                </div>
                <div className="flex justify-end">
                    <button type="button" onClick={goToForgot} className="text-xs font-medium text-slate-400 hover:text-teal-400 transition-colors">
                        Forgot Password?
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center py-3 rounded-xl">{error}</div>}
            
            <Button className="w-full py-4 text-lg font-bold shadow-xl shadow-teal-500/30 hover:scale-[1.02] transition-all bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-2xl" disabled={loading}>
                {loading ? <span className="flex items-center gap-2 justify-center"><Loader2 className="animate-spin" /> Verifying...</span> : "Secure Login"}
            </Button>
            <button type="button" onClick={goToRegister} className="w-full text-center mt-6 text-slate-400 text-sm hover:text-teal-400 flex items-center justify-center gap-1 group">
                Create Verified Account <ArrowRight size={14} className="group-hover:translate-x-1" />
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FLOW */}
        {mode === 'forgot' && (
           <div className={`space-y-5 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-slate-400 text-sm">
                    {step === 1 && "Enter your registered email address."}
                    {step === 2 && "Enter the 4-digit code sent to your phone."}
                    {step === 3 && "Create a new secure password."}
                </p>
            </div>

            {step === 1 && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                    <div className="group relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="text-slate-500 group-focus-within:text-teal-500" size={20} /></div>
                        <input type="email" placeholder="Email Address" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white focus:ring-2 focus:ring-teal-500 outline-none" required />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                    <Button className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-xl shadow-lg" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Send Reset Code"}
                    </Button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4 animate-in zoom-in">
                    <input type="text" placeholder="0000" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-4 text-center text-4xl tracking-[0.5em] text-white focus:border-teal-500 outline-none font-mono" maxLength={4} required />
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                    <Button className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-xl shadow-lg">Verify Code</Button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <div className="group relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="text-slate-500 group-focus-within:text-teal-500" size={20} /></div>
                        <input type={showPassword ? "text" : "password"} placeholder="Enter New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-12 pr-12 py-3.5 text-white focus:ring-2 focus:ring-teal-500 outline-none" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-teal-400"><Eye size={20} /></button>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
                    <Button className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none rounded-xl shadow-lg" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Update Password"}
                    </Button>
                </form>
            )}

            <button type="button" onClick={goToLogin} className="w-full text-center mt-4 text-slate-400 text-sm hover:text-white flex justify-center items-center gap-1 group">
                <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Login
            </button>
           </div>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'register' && (
           <div className={`space-y-5 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            {step === 1 && (
              <>
                <div className="flex gap-2 mb-6 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/50">
                  {['patient', 'doctor'].map(r => (
                    <button key={r} onClick={() => setRole(r)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${role === r ? 'bg-slate-700 text-white shadow-lg ring-1 ring-teal-500/50' : 'text-slate-400 hover:text-white'}`}>{r}</button>
                  ))}
                </div>
                
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />
                
                <div className="relative group">
                  <input type="text" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPhoneVerified} className={`w-full bg-slate-900/60 border ${isPhoneVerified ? 'border-green-500 text-green-600' : 'border-slate-700/50 text-white'} rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500`} />
                  {isPhoneVerified ? <CheckCircle size={20} className="absolute right-4 top-3.5 text-green-500" /> : <button onClick={handleSendOtp} className="absolute right-2 top-2 bg-slate-800 text-xs px-4 py-1.5 rounded-lg text-white hover:bg-teal-600 font-medium">Verify</button>}
                </div>

                {role === 'doctor' && (
                  <div className="space-y-4 p-4 bg-teal-900/10 rounded-2xl border border-teal-900/30 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none appearance-none focus:ring-2 focus:ring-teal-500 text-sm">
                        {specialties.map(s => <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}</option>)}
                        </select>
                        <Stethoscope size={16} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 flex items-center relative group">
                            <IndianRupee size={16} className="absolute left-3 text-slate-400 z-10" />
                            <input type="number" placeholder="Consultation Fee (₹)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />
                        </div>
                        <div className="flex-1 relative">
                            <input type="file" id="avatar-upload" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} className="hidden" />
                            <label htmlFor="avatar-upload" className={`flex items-center justify-center gap-2 w-full h-full rounded-xl border border-dashed cursor-pointer transition-all ${avatarFile ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-700 text-slate-400'}`}>
                                <Camera size={18} /><span className="text-xs font-medium">{avatarFile ? 'Selected' : 'Photo'}</span>
                            </label>
                        </div>
                    </div>
                    <div className="relative group">
                        <CreditCard size={16} className="absolute left-3 top-3.5 text-slate-400 z-10" />
                        <input type="text" placeholder="Your UPI ID (For Payouts)" value={doctorUpi} onChange={(e) => setDoctorUpi(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500 text-sm" />
                    </div>
                  </div>
                )}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-500" />

                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">{error}</p>}
                
                <Button onClick={handleRegisterSubmit} className="w-full py-4 text-lg font-bold shadow-xl hover:scale-[1.02] bg-gradient-to-r from-teal-500 to-cyan-600 border-none mt-2" disabled={loading}>
                   {loading ? <Loader2 className="animate-spin mx-auto" /> : "Complete Registration"}
                </Button>
                <button type="button" onClick={goToLogin} className="w-full text-center mt-4 text-slate-400 text-sm hover:text-white flex justify-center items-center gap-1 group"><ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Login</button>
              </>
            )}

            {step === 2 && (
              <div className="text-center animate-in zoom-in">
                <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600"><Phone className="text-teal-400 animate-pulse" size={32} /></div>
                <h2 className="text-2xl font-bold text-white mb-2">Verify Number</h2>
                <p className="text-slate-400 text-sm mb-8">Enter code sent to <span className="text-teal-400">{phone}</span></p>
                <input type="text" placeholder="0000" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-2xl px-4 py-5 text-center text-4xl tracking-[0.5em] text-white focus:border-teal-500 outline-none mb-8 font-mono shadow-inner" maxLength={4} />
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <Button onClick={handleVerifyOtp} className="w-full py-4 text-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-600 border-none">Verify & Continue</Button>
                <button onClick={handleBackFromVerify} className="mt-6 text-sm text-slate-500 hover:text-white underline">Change Phone Number</button>
              </div>
            )}
           </div>
        )}
      </div>

      {/* SEO Content Footer */}
      <div className="max-w-4xl mx-auto mt-8 text-center space-y-8 z-10 relative pb-10 hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"><MapPin className="mx-auto mb-3 text-teal-400" size={28} /><h3 className="text-white font-bold mb-2">Nagaland Wide</h3><p className="text-sm">Kohima, Dimapur, Mokokchung, and beyond.</p></div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"><Stethoscope className="mx-auto mb-3 text-teal-400" size={28} /><h3 className="text-white font-bold mb-2">Expert Doctors</h3><p className="text-sm">Top specialists available instantly.</p></div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"><Calendar className="mx-auto mb-3 text-teal-400" size={28} /><h3 className="text-white font-bold mb-2">Easy Booking</h3><p className="text-sm">Secure UPI payments & digital records.</p></div>
        </div>
      </div>
    </div>
  );
}