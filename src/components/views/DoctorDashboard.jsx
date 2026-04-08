import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Users, Activity, Settings, LogOut, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../ui/Button';

export default function DoctorDashboard({ user, logout, showToast }) {
  const [appointments, setAppointments] = useState([]);
  
  // Extract doctorId to a constant to satisfy React Compiler's dependency rules
  const doctorId = user?.doctorId;
  
  const fetchAppointments = useCallback(async () => {
    if (doctorId) {
      const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('id', { ascending: false });
      if (data) setAppointments(data);
    }
  }, [doctorId]);

  useEffect(() => {
    (async () => {
      if (doctorId) {
        const { data } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('id', { ascending: false });
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

  // Filter lists
  const pendingRequests = appointments.filter(a => a.status === 'Pending Approval');
  const upcomingAppointments = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Accepted' || a.status === 'Payment Verifying');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-teal-600 rounded-b-[2.5rem] p-8 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 relative z-10 text-white">
          <div><p className="text-teal-100 text-sm">Welcome back,</p><h1 className="text-2xl font-bold">Dr. {user.name}</h1></div>
          <button onClick={logout} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="w-full max-w-md p-6 -mt-8 relative z-20 space-y-6">
        
        {/* PENDING REQUESTS SECTION */}
        {pendingRequests.length > 0 && (
            <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Pending Requests</h2>
                <div className="space-y-4">
                  {pendingRequests.map(apt => (
                    <div key={apt.id} className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-amber-400">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-slate-800">{apt.patient_name}</h3>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">New Request</span>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(apt.appointment_date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock size={14}/> {apt.slot}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAction(apt.id, 'accept')} className="flex-1 bg-green-600 hover:bg-green-700 border-none py-2 text-xs">Accept</Button>
                        <Button onClick={() => handleAction(apt.id, 'reject')} className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 border-none py-2 text-xs">Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
        )}

        {/* UPCOMING SCHDULE */}
        <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 mt-2">Upcoming Schedule</h2>
            <div className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
                  <Activity size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No confirmed appointments yet.</p>
                </div>
              ) : (
                upcomingAppointments.map(apt => (
                  <div key={apt.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">{apt.patient_name}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {apt.status === 'Confirmed' ? 'Confirmed' : 'Awaiting Payment'}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                      <span className="flex items-center gap-1"><Calendar size={14} className="text-teal-500"/> {new Date(apt.appointment_date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={14} className="text-teal-500"/> {apt.slot}</span>
                    </div>
                    {apt.payment_mode === 'Cash' && <p className="text-xs font-bold text-amber-600 text-right mt-1">Collect Cash at Clinic</p>}
                  </div>
                ))
              )}
            </div>
        </div>
      </div>
    </div>
  );
}