import React, { useState, useEffect } from 'react';
import { Users, Activity, Shield, Trash2, CheckCircle, FileText, Download, IndianRupee, AlertTriangle, LogOut, Clock, XCircle, Loader2, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { generateAdminReport } from '../../utils/pdfGenerator';
import Button from '../ui/Button';

export default function AdminDashboard({ logout, doctors, onDelete, onPayout }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingPayouts: 0 });
  const [loading, setLoading] = useState(true);
  
  // Helper for manual refresh (e.g. after approval)
  const refreshData = async () => {
    const { data: appts } = await supabase.from('appointments').select('*').order('id', { ascending: false });
    if (appts) {
        setAppointments(appts);
        // Calculate totals only from 'Confirmed' and 'Paid' appointments
        const validAppts = appts.filter(a => a.status === 'Confirmed');
        // Total calculation removed as it was unused
        const platformRevenue = validAppts.length * 50;
        
        // Payouts calculation: Only count appointments that are NOT yet paid out
        const unpaidAppts = validAppts.filter(a => !a.is_paid_out);
        const payouts = unpaidAppts.reduce((sum, a) => {
            const amt = parseInt(a.amount?.replace(/[^0-9]/g, '')) || 0;
            return sum + (amt - 50);
        }, 0);

        setStats({ totalRevenue: platformRevenue, pendingPayouts: payouts });
    }
  };

  // Initial Fetch Effect
  useEffect(() => { 
      let mounted = true;
      const initFetch = async () => {
        const { data: appts } = await supabase.from('appointments').select('*').order('id', { ascending: false });
        if (mounted && appts) {
            setAppointments(appts);
            const validAppts = appts.filter(a => a.status === 'Confirmed');
            // Total calculation removed as it was unused
            const platformRevenue = validAppts.length * 50;
            const unpaidAppts = validAppts.filter(a => !a.is_paid_out);
            const payouts = unpaidAppts.reduce((sum, a) => {
                const amt = parseInt(a.amount?.replace(/[^0-9]/g, '')) || 0;
                return sum + (amt - 50);
            }, 0);
            setStats({ totalRevenue: platformRevenue, pendingPayouts: payouts });
            setLoading(false);
        }
      };
      initFetch();
      return () => { mounted = false; };
  }, []);

  const handleVerifyPayment = async (apptId) => {
    if (window.confirm("Confirm that you received the payment in your bank account?")) {
        const { error } = await supabase.from('appointments').update({ 
            status: "Confirmed", 
            payment_status: "Verified & Paid" 
        }).eq('id', apptId);
        
        if (!error) refreshData();
    }
  };

  const handleRejectPayment = async (apptId) => {
    if (window.confirm("Reject this transaction?")) {
        const { error } = await supabase.from('appointments').update({ 
            status: "Cancelled", 
            payment_status: "Rejected" 
        }).eq('id', apptId);
        
        if (!error) refreshData();
    }
  };
  
  // Wrapper for payout to refresh UI after
  const handlePayoutClick = async (docId) => {
      await onPayout(docId);
      setTimeout(refreshData, 500); // Wait a bit for DB propagation then refresh
  };

  const handleExportPDF = () => {
    const payoutData = doctors.map(doc => {
       const docAppts = appointments.filter(a => a.doctor_id === doc.id);
       const totalCollected = docAppts.reduce((sum, a) => sum + (parseInt(a.amount?.replace(/\D/g,'')) || 0), 0);
       const platformShare = docAppts.length * 50;
       return { doctorName: doc.name, totalAppointments: docAppts.length, totalCollected, platformShare, doctorShare: totalCollected - platformShare };
    });
    generateAdminReport(payoutData);
  };

  const pendingPayments = appointments.filter(a => a.payment_status === 'Pending Verification' || a.status === 'Payment Verifying');

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin" size={32}/></div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500 rounded-lg"><Shield size={24} className="text-white" /></div>
          <div><h1 className="text-xl font-bold">Admin Console</h1><p className="text-xs text-slate-400">System Status: <span className="text-green-400">Online</span></p></div>
        </div>
        <button onClick={logout} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md transition-all flex items-center gap-1"><LogOut size={12}/> Logout</button>
      </div>

      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-2 mb-2 text-blue-400"><Users size={18} /><span className="text-xs font-bold uppercase tracking-wider">Revenue</span></div>
          <div className="text-3xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-xl">
           <div className="flex items-center gap-2 mb-2 text-teal-400"><Activity size={18} /><span className="text-xs font-bold uppercase tracking-wider">Payable</span></div>
           <div className="text-3xl font-bold text-white">₹{stats.pendingPayouts.toLocaleString()}</div>
        </div>
      </div>

      {/* PENDING VERIFICATIONS */}
      {pendingPayments.length > 0 && (
          <div className="px-6 mb-6">
            <h2 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Payments Needing Verification ({pendingPayments.length})</h2>
            <div className="space-y-2">
                {pendingPayments.map(appt => (
                    <div key={appt.id} className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-sm font-bold text-amber-200">UTR: {appt.transaction_id}</p>
                            <p className="text-xs text-slate-400">Amount: {appt.amount} • From: {appt.patient_name}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleVerifyPayment(appt.id)} className="text-xs py-1 px-3 bg-green-600 hover:bg-green-700">Approve</Button>
                            <Button onClick={() => handleRejectPayment(appt.id)} className="text-xs py-1 px-3 bg-red-600 hover:bg-red-700">Reject</Button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}
      
      <div className="px-6 mb-4">
         <Button onClick={handleExportPDF} className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 border-none shadow-lg shadow-teal-900/50">
            <FileText size={18} /> Download Payout Report (PDF)
         </Button>
      </div>

      <div className="flex-1 bg-white rounded-t-3xl p-6 text-slate-900 overflow-hidden flex flex-col">
        <h2 className="font-bold text-lg mb-4 flex justify-between items-center">
          Active Doctors <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{doctors.length} Registered</span>
        </h2>
        
        <div className="overflow-y-auto flex-1 space-y-3 pb-10">
            {doctors.map(doc => {
               // Filter for this doctor's appointments
               const docAppts = appointments.filter(a => a.doctor_id === doc.id && a.status === 'Confirmed');
               // Only sum up those NOT yet paid out
               const unpaidAppts = docAppts.filter(a => !a.is_paid_out);
               
               const netPay = unpaidAppts.reduce((sum, a) => {
                   const amt = parseInt(a.amount?.replace(/[^0-9]/g, '')) || 0;
                   return sum + (amt - 50);
               }, 0);

               return (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group shadow-sm">
                    <div className="flex items-center gap-3">
                    <img src={doc.image} className="w-12 h-12 rounded-full object-cover bg-slate-200 border-2 border-white shadow-md" />
                    <div>
                        <h3 className="font-bold text-sm text-slate-900">{doc.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><IndianRupee size={10}/> Pending: <span className={netPay > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}>₹{netPay.toLocaleString()}</span></p>
                    </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {netPay > 0 && (
                           <button 
                             onClick={() => handlePayoutClick(doc.id)} 
                             className="p-2 bg-teal-100 text-teal-700 hover:bg-teal-200 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold"
                             title="Mark as Paid"
                           >
                             <CheckSquare size={14}/> Pay
                           </button>
                       )}
                       <button onClick={() => onDelete(doc.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                </div>
               )
            })}
        </div>
      </div>
    </div>
  );
}