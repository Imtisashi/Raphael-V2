import React from 'react';
import { Calendar, Clock, MapPin, User, Download, CheckCircle, AlertCircle, Loader2, XCircle, RefreshCw, CreditCard, Banknote } from 'lucide-react';
import { generateReceipt } from '../../utils/pdfGenerator';

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    cash: "bg-emerald-100 text-emerald-800 border border-emerald-200"
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles[type] || styles.info}`}>
      {children}
    </span>
  );
};

export default function DashboardView({ appointments = [], onPayNow, onPayCash }) {
  const safeAppointments = appointments || [];

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <Calendar className="text-teal-600" /> My Visits
      </h1>
      
      {safeAppointments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
          <Calendar size={64} className="mb-4 text-slate-300" />
          <p>No upcoming appointments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeAppointments.map(apt => {
            // Determine Status UI
            let statusType = 'info';
            if (apt.status === 'Confirmed' && apt.payment_mode === 'Cash') statusType = 'cash';
            else if (apt.status === 'Confirmed') statusType = 'success';
            else if (apt.status === 'Pending Approval') statusType = 'warning';
            else if (apt.status === 'Accepted' || apt.status === 'Payment Verifying') statusType = 'info';
            else if (apt.status.includes('Cancelled') || apt.status === 'Payment Rejected') statusType = 'error';

            return (
              <div key={apt.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg flex flex-col gap-4">
                 
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold"><User size={20} /></div>
                     <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">Dr. {apt.doctor_name}</h3>
                       <Badge type={statusType}>
                         {apt.payment_mode === 'Cash' ? 'Confirmed (Cash)' : apt.status}
                       </Badge>
                     </div>
                   </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                     <Calendar size={16} className="text-teal-500" />
                     {apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'Date Pending'}
                   </div>
                   <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                     <Clock size={16} className="text-teal-500" />
                     {apt.slot}
                   </div>
                 </div>

                 {/* STATE 1: PENDING DOCTOR */}
                 {apt.status === 'Pending Approval' && (
                    <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700 flex items-center gap-2 border border-amber-100">
                       <Loader2 size={14} className="animate-spin shrink-0" />
                       Waiting for Doctor to accept your request.
                    </div>
                 )}

                 {/* STATE 2: DOCTOR ACCEPTED, NEEDS PAYMENT */}
                 {apt.status === 'Accepted' && (
                     <button onClick={() => onPayNow(apt)} className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-teal-700 shadow-md">
                        <CreditCard size={18} /> Pay Now to Confirm
                     </button>
                 )}

                 {/* STATE 3: ADMIN VERIFYING */}
                 {apt.status === 'Payment Verifying' && (
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex items-center gap-2 border border-blue-100">
                       <Loader2 size={14} className="animate-spin shrink-0" />
                       Admin is verifying your UTR. Please wait.
                    </div>
                 )}

                 {/* STATE 4: PAYMENT REJECTED (RETRY OR CASH) */}
                 {apt.status === 'Payment Rejected' && (
                    <div className="space-y-3">
                        <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700 flex items-start gap-2 border border-red-100">
                            <XCircle size={16} className="shrink-0 mt-0.5" />
                            <div><span className="font-bold block">Payment Invalid</span>The UTR you entered was incorrect.</div>
                        </div>
                        
                        {apt.utr_retries < 2 ? (
                            <button onClick={() => onPayNow(apt)} className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700 shadow-md">
                                <RefreshCw size={14} /> Retry UPI Payment
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-500 text-center font-medium">You have exceeded retry limits. You can pay by cash at the clinic instead.</p>
                                <button onClick={() => onPayCash(apt)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md">
                                    <Banknote size={18} /> Confirm with Cash Payment
                                </button>
                            </div>
                        )}
                    </div>
                 )}
                 
                 {/* STATE 5: CONFIRMED (ALLOW RECEIPT) */}
                 {apt.status === 'Confirmed' && apt.payment_mode !== 'Cash' && (
                   <button onClick={() => generateReceipt(apt)} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-md">
                     <Download size={14} /> Download Invoice
                   </button>
                 )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}