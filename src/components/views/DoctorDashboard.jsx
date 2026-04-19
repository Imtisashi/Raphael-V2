import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, Activity, Settings, LogOut, Check, X, User, Save, IndianRupee, CreditCard, FileText, Loader2, Camera, BellRing } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../ui/Button';

// Standard time slots for the doctor to choose from
const STANDARD_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
];

export default function DoctorDashboard({ user, logout, showToast }) {
  const [appointments, setAppointments] = useState([]);
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState({
    price: '',
    upi_id: '',
    bio: '',
    slots: [],
    image: ''
  });
  
  const fileInputRef = useRef(null);
  
  // Extract doctorId to a constant to satisfy React Compiler's dependency rules
  const doctorId = user?.doctorId;
  
  const fetchAppointments = useCallback(async () => {
    if (doctorId) {
      const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('appointment_date', { ascending: true });
      if (data) setAppointments(data);
    }
  }, [doctorId]);

  const fetchDoctorProfile = useCallback(async () => {
    if (doctorId) {
      const { data } = await supabase.from('doctors').select('*').eq('id', doctorId).single();
      if (data) {
        setDoctorProfile({
          price: data.price ? data.price.toString().replace(/[^0-9]/g, '') : '', 
          upi_id: data.upi_id || '',
          bio: data.bio || '',
          slots: data.slots || [],
          image: data.image || ''
        });
      }
    }
  }, [doctorId]);

  useEffect(() => {
    (async () => {
      fetchAppointments();
      fetchDoctorProfile();
    })();
  }, [fetchAppointments, fetchDoctorProfile]);

  // Handle Approvals
  const handleAction = async (apptId, action) => {
    const newStatus = action === 'accept' ? 'Accepted' : 'Cancelled by Doctor';
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId);
    
    if (error) showToast("Failed to update: " + error.message, "error");
    else {
        showToast(action === 'accept' ? "Request Accepted! Waiting for patient payment." : "Request Rejected.", action === 'accept' ? 'success' : 'info');
        fetchAppointments();
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSavingProfile(true);
    showToast("Uploading profile picture...", "info");
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `doc_${doctorId}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newImageUrl = urlData.publicUrl;

      // Instantly update the database and state
      await supabase.from('doctors').update({ image: newImageUrl }).eq('id', doctorId);
      setDoctorProfile(prev => ({ ...prev, image: newImageUrl }));
      showToast("Profile picture updated successfully!", "success");

    } catch (err) {
      showToast("Failed to upload image: " + err.message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Profile Edit Handlers
  const toggleSlot = (slot) => {
    setDoctorProfile(prev => ({
      ...prev,
      slots: prev.slots.includes(slot) 
        ? prev.slots.filter(s => s !== slot) 
        : [...prev.slots, slot].sort((a, b) => {
            return new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b);
        })
    }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const { error } = await supabase.from('doctors').update({
      price: `₹${doctorProfile.price}`,
      upi_id: doctorProfile.upi_id,
      bio: doctorProfile.bio,
      slots: doctorProfile.slots
    }).eq('id', doctorId);
    
    setIsSavingProfile(false);

    if (error) {
      showToast("Error saving profile: " + error.message, "error");
    } else {
      showToast("Profile updated successfully!", "success");
      setIsEditingProfile(false);
    }
  };

  // Manual Notification Permission Request
  const requestPushPermission = async () => {
    try {
      // Use string variables to hide native imports from Vercel's web bundler
      const corePkg = '@capacitor/core';
      const pushPkg = '@capacitor/push-notifications';

      const { Capacitor } = await import(/* @vite-ignore */ corePkg);
      if (!Capacitor.isNativePlatform()) {
        showToast("Push notifications are only available on the mobile app.", "info");
        return;
      }
      
      const { PushNotifications } = await import(/* @vite-ignore */ pushPkg);
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        PushNotifications.addListener('registration', async (token) => {
           await supabase.from('doctors').update({ push_token: token.value }).eq('id', doctorId);
        });
        showToast("Notifications successfully enabled!", "success");
      } else {
        showToast("Permission denied. Enable it in your phone settings.", "error");
      }
    } catch (err) {
      console.error("Push Notification Error:", err);
      showToast("Could not setup notifications.", "error");
    }
  };

  // Filter lists & Stats
  const pendingRequests = appointments.filter(a => a.status === 'Pending Approval');
  const upcomingAppointments = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Accepted' || a.status === 'Payment Verifying');
  
  const todayString = new Date().toDateString();
  const todayCount = upcomingAppointments.filter(a => new Date(a.appointment_date).toDateString() === todayString).length;

  // Clean Name: remove multiple "Dr." occurrences
  const cleanName = user?.name?.replace(/^(Dr\.\s*)+/i, '');
  const displayName = `Dr. ${cleanName || ''}`;
  
  // Dynamic Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'PT';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-0 font-sans flex flex-col items-center transition-colors duration-300">
      
      {/* EDIT PROFILE FULL-SCREEN MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-bottom-full duration-300 w-full md:max-w-md md:mx-auto shadow-2xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
             <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Settings size={20} className="text-teal-500"/> Profile & Settings
             </h2>
             <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
               <X size={20}/>
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
             
             {/* Profile Picture Uploader */}
             <div className="flex flex-col items-center justify-center mb-4">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-28 h-28 rounded-full border-4 border-white shadow-xl cursor-pointer group bg-slate-200 flex items-center justify-center overflow-hidden"
                >
                  {doctorProfile.image ? (
                    <img src={doctorProfile.image} alt="Profile" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <User size={40} className="text-slate-400 group-hover:opacity-50 transition-opacity" />
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                  
                  {isSavingProfile && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                       <Loader2 size={24} className="text-teal-600 animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-bold mt-3 uppercase tracking-wide">Tap to Change Photo</p>
             </div>

             {/* App Settings Section */}
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                     <BellRing size={16} className="text-teal-500" /> App Permissions
                 </h3>
                 <button onClick={requestPushPermission} className="w-full py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-800/50">
                     Enable Push Notifications
                 </button>
             </div>

             {/* Professional Details Section */}
             <div className="space-y-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">Professional Details</h3>
                 {/* Fee */}
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Consultation Fee (₹)</label>
                   <div className="relative">
                      <IndianRupee size={16} className="absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="number" 
                        value={doctorProfile.price} 
                        onChange={e => setDoctorProfile({...doctorProfile, price: e.target.value})} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-teal-500 text-slate-900 dark:text-white transition-colors" 
                        placeholder="e.g. 500"
                      />
                   </div>
                 </div>

                 {/* UPI ID */}
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">UPI ID (For Payouts)</label>
                   <div className="relative">
                      <CreditCard size={16} className="absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={doctorProfile.upi_id} 
                        onChange={e => setDoctorProfile({...doctorProfile, upi_id: e.target.value})} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-teal-500 text-slate-900 dark:text-white transition-colors" 
                        placeholder="yourname@bank"
                      />
                   </div>
                   <p className="text-[10px] text-slate-400 mt-1 ml-1">Admin will send earnings directly to this UPI.</p>
                 </div>

                 {/* Bio */}
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">About Me (Bio)</label>
                   <div className="relative">
                      <FileText size={16} className="absolute left-3 top-3.5 text-slate-400" />
                      <textarea 
                        value={doctorProfile.bio} 
                        onChange={e => setDoctorProfile({...doctorProfile, bio: e.target.value})} 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-teal-500 text-slate-900 dark:text-white transition-colors min-h-[100px] resize-none" 
                        placeholder="Brief description of your expertise..."
                      />
                   </div>
                 </div>
             </div>

             {/* Slots */}
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <label className="text-xs font-bold text-slate-500 uppercase mb-4 flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                 Manage Availability
                 <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 px-2 py-0.5 rounded font-bold">
                   {doctorProfile.slots.length} Selected
                 </span>
               </label>
               <div className="grid grid-cols-3 gap-2">
                  {STANDARD_SLOTS.map(slot => {
                      const isSelected = doctorProfile.slots.includes(slot);
                      return (
                          <button 
                            key={slot} 
                            onClick={() => toggleSlot(slot)} 
                            className={`py-3 text-xs font-bold rounded-xl border transition-all ${isSelected ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-500'}`}
                          >
                             {slot}
                          </button>
                      )
                  })}
               </div>
               <p className="text-[10px] text-slate-400 mt-3 text-center">Tap times to toggle them on or off for patients.</p>
             </div>
          </div>
          
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 pb-safe">
             <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2">
               {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
               {isSavingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
             </Button>
          </div>
        </div>
      )}


      {/* PREMIUM VIBRANT HEADER */}
      <div className="w-full max-w-md bg-gradient-to-br from-teal-500 via-emerald-600 to-teal-900 rounded-b-[2.5rem] pt-12 pb-24 px-6 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/20 blur-[60px] rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10 text-white mb-6">
          <div className="flex items-center gap-4">
             {/* Display Doctor Profile Picture directly in Header */}
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                {doctorProfile.image ? (
                   <img src={doctorProfile.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                   <User size={30} className="text-white" />
                )}
             </div>
             <div>
                <p className="text-teal-100 text-xs font-bold uppercase tracking-wider mb-1">{greeting},</p>
                <h1 className="text-2xl font-bold tracking-tight drop-shadow-md">{displayName}</h1>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditingProfile(true)} className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/30 transition-all text-white shadow-lg">
              <Settings size={18} />
            </button>
            <button onClick={logout} className="p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full hover:bg-red-500/80 transition-all text-white shadow-lg">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md px-4 -mt-16 relative z-20 flex-1 flex flex-col gap-6">
        
        {/* FLOATING QUICK STATS */}
        <div className="grid grid-cols-3 gap-3">
           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{todayCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</div>
           </div>
           <div className="bg-gradient-to-b from-amber-400 to-orange-500 p-4 rounded-2xl shadow-xl shadow-amber-500/30 border border-amber-400 flex flex-col items-center justify-center text-center transform hover:-translate-y-1 transition-transform">
              <div className="text-2xl font-bold text-white mb-1">{pendingRequests.length}</div>
              <div className="text-[10px] font-bold text-amber-100 uppercase tracking-wider">Pending</div>
           </div>
           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{upcomingAppointments.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
           </div>
        </div>

        {/* PENDING REQUESTS SECTION */}
        {pendingRequests.length > 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Activity size={16} className="text-amber-500" /> Action Required
                    </h2>
                    <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full">{pendingRequests.length} New</span>
                </div>
                
                <div className="space-y-3">
                  {pendingRequests.map(apt => (
                    <div key={apt.id} className="bg-white dark:bg-slate-900 p-1 rounded-3xl shadow-lg shadow-amber-500/5 dark:shadow-none border border-amber-200/50 dark:border-amber-500/20 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-3xl"></div>
                      
                      <div className="p-4 pl-5">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-sm border-2 border-amber-200">
                                    {getInitials(apt.patient_name)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{apt.patient_name}</h3>
                                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                                        <Calendar size={12}/> {new Date(apt.appointment_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1">
                                <Clock size={12} className="text-teal-500"/> {apt.slot}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(apt.id, 'reject')} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700">
                                <X size={16} /> Reject
                            </button>
                            <button onClick={() => handleAction(apt.id, 'accept')} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 transition-all py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                                <Check size={16} /> Accept Request
                            </button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        )}

        {/* UPCOMING SCHEDULE SECTION */}
        <div className="pb-32">
            <div className="flex items-center justify-between mb-4 px-1 mt-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calendar size={16} className="text-teal-500" /> Upcoming Schedule
                </h2>
            </div>
            
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Calendar size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Your schedule is clear.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Confirmed appointments will appear here.</p>
                </div>
              ) : (
                upcomingAppointments.map(apt => {
                  const isAwaitingPayment = apt.status === 'Accepted' || apt.status === 'Payment Verifying';
                  const isCash = apt.payment_mode === 'Cash';
                  
                  let badgeStyles = "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-200 dark:border-green-500/20";
                  let badgeText = "Confirmed";
                  
                  if (isAwaitingPayment) {
                      badgeStyles = "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
                      badgeText = "Awaiting Payment";
                  } else if (isCash) {
                      badgeStyles = "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
                      badgeText = "Cash Collection";
                  }

                  return (
                    <div key={apt.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-md shadow-slate-200/30 border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-900/50 transition-colors flex flex-col gap-3 group">
                      
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-slate-800 border border-teal-100 dark:border-slate-700 flex flex-col items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
                                <span className="text-[10px] font-bold uppercase leading-none mb-1 opacity-70">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                <span className="text-xl font-black leading-none">{new Date(apt.appointment_date).getDate()}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-teal-600 transition-colors">{apt.patient_name}</h3>
                                <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                                    <Clock size={12} className="text-teal-500" /> {apt.slot}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            <span className={`text-[9px] uppercase font-black px-3 py-1.5 rounded-full border tracking-wide ${badgeStyles}`}>
                                {badgeText}
                            </span>
                            {isCash && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">Collect ₹{apt.amount?.replace(/\D/g,'') || 0}</span>}
                        </div>
                      </div>
                      
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </div>
    </div>
  );
}