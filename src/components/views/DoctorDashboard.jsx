import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Users, Activity, Settings, LogOut, CheckCircle, XCircle, Check, X, User, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../ui/Button';

export default function DoctorDashboard({ user, logout, showToast }) {
  const [appointments, setAppointments] = useState([]);
  
  // Extract doctorId to a constant to satisfy React Compiler's dependency rules
  const doctorId = user?.doctorId;
  
  const fetchAppointments = useCallback(async () => {
    if (doctorId) {
      const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('appointment_date', { ascending: true });
      if (data) setAppointments(data);
    }
  }, [doctorId]);

  useEffect(() => {
    (async () => {
      if (doctorId) {
        const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('appointment_date', { ascending: true });
        if (data) setAppointments(data);
      }
    })();
  }, [doctorId]);

  // Handle Approvals
  const handleAction = async (apptId, action) => {
    const newStatus = action === 'accept' ? 'Accepted' : 'Cancelled by Doctor';
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId);
    
    if (error) showToast("Failed to update: " + error.message, "error");
    else {
        showToast(action === 'accept' ? "Request Accepted! Waiting for patient payment." : "Request Rejected.");
        fetchAppointments();
    }
  };

  // Filter lists & Stats
  const pendingRequests = appointments.filter(a => a.status === 'Pending Approval');
  const upcomingAppointments = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Accepted' || a.status === 'Payment Verifying');
  
  const todayString = new Date().toDateString();
  const todayCount = upcomingAppointments.filter(a => new Date(a.appointment_date).toDateString() === todayString).length;

  // Fix "Dr. Dr." issue
  const displayName = user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || ''}`;
  
  // Dynamic Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Helper for Patient Initials
  const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'PT';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-0 font-sans flex flex-col items-center transition-colors duration-300">
      
      {/* PREMIUM HEADER */}
      <div className="w-full max-w-md bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 rounded-b-[2.5rem] pt-12 pb-20 px-6 shadow-2xl relative overflow-hidden shrink-0">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-teal-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10 text-white mb-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-inner">
                <User size={28} className="text-teal-300" />
             </div>
             <div>
                <p className="text-teal-200/80 text-xs font-bold uppercase tracking-wider mb-1">{greeting},</p>
                <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
             </div>
          </div>
          <button onClick={logout} className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all text-slate-300">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md px-4 -mt-14 relative z-20 flex-1 flex flex-col gap-6">
        
        {/* FLOATING QUICK STATS */}
        <div className="grid grid-cols-3 gap-3">
           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{todayCount}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</div>
           </div>
           <div className="bg-gradient-to-b from-teal-500 to-teal-600 p-4 rounded-2xl shadow-xl shadow-teal-500/30 border border-teal-400 flex flex-col items-center justify-center text-center transform hover:-translate-y-1 transition-transform">
              <div className="text-2xl font-bold text-white mb-1">{pendingRequests.length}</div>
              <div className="text-[10px] font-bold text-teal-100 uppercase tracking-wider">Pending</div>
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
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-3xl"></div>
                      
                      <div className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                                    {getInitials(apt.patient_name)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{apt.patient_name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Calendar size={10}/> {new Date(apt.appointment_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1">
                                <Clock size={12} className="text-teal-500"/> {apt.slot}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button onClick={() => handleAction(apt.id, 'reject')} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700">
                                <X size={14} /> Reject
                            </button>
                            <button onClick={() => handleAction(apt.id, 'accept')} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                                <Check size={14} /> Accept Request
                            </button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        )}

        {/* UPCOMING SCHEDULE SECTION */}
        <div className="pb-10">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calendar size={16} className="text-teal-500" /> Upcoming Schedule
                </h2>
            </div>
            
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Calendar size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Your schedule is clear.</p>
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
                    <div key={apt.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-teal-100 dark:hover:border-teal-900/50 transition-colors flex flex-col gap-3 group">
                      
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <span className="text-[10px] font-bold uppercase leading-none mb-0.5">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                <span className="text-lg font-black leading-none">{new Date(apt.appointment_date).getDate()}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 transition-colors">{apt.patient_name}</h3>
                                <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <Clock size={12} className="text-slate-400" /> {apt.slot}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-full border tracking-wide ${badgeStyles}`}>
                                {badgeText}
                            </span>
                            {isCash && <span className="text-[10px] font-bold text-amber-500">Collect ₹{apt.amount?.replace(/\D/g,'') || 0}</span>}
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