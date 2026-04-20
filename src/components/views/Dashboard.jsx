import React from 'react';
import { Calendar, Clock, MapPin, IndianRupee, Activity, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';

export default function DashboardView({ appointments, onPayNow, onPayCash }) {
  
  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
         <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
             <Calendar size={48} className="text-teal-300" />
         </div>
         <h2 className="text-2xl font-black text-slate-800 tracking-tight">No Visits Yet</h2>
         <p className="text-slate-500 text-sm mt-2 font-medium">Your booked appointments will automatically appear here once requested.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-in slide-in-from-right duration-300 pb-20">
       <div className="flex items-center gap-3 mb-6 mt-2 px-1">
           <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/30 text-white">
               <Activity size={20} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">My Visits</h2>
       </div>

       {appointments.map((apt) => {
         const isConfirmed = apt.status === 'Confirmed' || apt.payment_status === 'Verified & Paid' || apt.payment_mode === 'Cash';
         const isPendingApproval = apt.status === 'Pending Approval';
         const isAwaitingPayment = apt.status === 'Accepted' && apt.payment_status === 'Unpaid';
         const isVerifying = apt.payment_status === 'Pending Verification';
         const isCancelled = apt.status.includes('Cancelled') || apt.status === 'Rejected';

         return (
           <div key={apt.id} className={`bg-white rounded-3xl p-5 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.1)] border ${isAwaitingPayment ? 'border-amber-300 shadow-amber-500/10' : 'border-slate-100'} transition-all hover:shadow-lg relative overflow-hidden group`}>
             
             {/* Left Status Bar */}
             <div className={`absolute left-0 top-0 w-1.5 h-full ${
                isConfirmed ? 'bg-gradient-to-b from-green-400 to-emerald-500' :
                isAwaitingPayment ? 'bg-gradient-to-b from-amber-400 to-orange-500' :
                isCancelled ? 'bg-gradient-to-b from-red-400 to-rose-500' :
                'bg-gradient-to-b from-slate-300 to-slate-400'
             }`}></div>

             <div className="flex justify-between items-start mb-4 pl-3">
               <div>
                 <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-600 transition-colors tracking-tight">Dr. {apt.doctor_name}</h3>
                 
                 {/* Status Badge */}
                 <div className="mt-1.5 flex flex-wrap gap-1">
                    {isConfirmed && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200"><CheckCircle size={10}/> Confirmed</span>}
                    {isPendingApproval && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"><Clock size={10}/> Pending Approval</span>}
                    {isAwaitingPayment && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200"><Clock size={10}/> Action Required</span>}
                    {isVerifying && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"><Activity size={10}/> Verifying Payment</span>}
                    {isCancelled && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200"><XCircle size={10}/> {apt.status}</span>}
                 </div>
               </div>
               
               <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-tight mb-0.5">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black text-teal-600 leading-tight">{new Date(apt.appointment_date).getDate()}</span>
               </div>
             </div>

             <div className="pl-3 grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Clock size={16} className="text-slate-400" /> {apt.slot}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <IndianRupee size={16} className="text-slate-400" /> ₹{apt.amount?.toString().replace(/\D/g, '')}
                </div>
             </div>

             {/* Action Buttons for Pending Payments */}
             {isAwaitingPayment && (
               <div className="pl-3 mt-4 pt-4 border-t border-slate-100 flex gap-2">
                 <Button onClick={() => onPayNow(apt)} className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:scale-[1.02] shadow-lg shadow-teal-500/20 border-none text-xs py-3 font-bold">Pay via UPI</Button>
                 <Button onClick={() => onPayCash(apt)} variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs py-3 font-bold shadow-sm">Pay Cash at Clinic</Button>
               </div>
             )}
           </div>
         );
       })}
    </div>
  );
}