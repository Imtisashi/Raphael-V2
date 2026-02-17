import React from 'react';
import { Calendar, Clock, MapPin, User, Download, CheckCircle, AlertCircle, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { generateReceipt } from '../../utils/pdfGenerator';

const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700"
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${styles[type] || styles.info}`}>
      {children}
    </span>
  );
};

export default function DashboardView({ appointments = [], onRetry }) {
  const safeAppointments = appointments || [];

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Calendar className="text-teal-600" /> My Appointments
      </h1>
      
      {safeAppointments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
          <Calendar size={64} className="mb-4 text-slate-300" />
          <p>No upcoming appointments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeAppointments.map(apt => {
            // Determine status type for Badge
            let statusType = 'info';
            if (apt.status === 'Confirmed' || apt.status === 'Accepted') statusType = 'success';
            else if (apt.status === 'Payment Verifying') statusType = 'warning';
            else if (apt.status === 'Payment Rejected') statusType = 'error';

            return (
              <div key={apt.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col gap-4">
                 {/* Header */}
                 <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                       <User size={20} />
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-900">{apt.doctor_name || 'Doctor'}</h3>
                       <Badge type={statusType}>
                         {apt.status}
                       </Badge>
                     </div>
                   </div>
                 </div>

                 {/* Date & Time Pill */}
                 <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2 text-slate-600 font-medium">
                     <Calendar size={16} className="text-teal-500" />
                     {apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'Date Pending'}
                   </div>
                   <div className="flex items-center gap-2 text-slate-900 font-bold">
                     <Clock size={16} className="text-teal-500" />
                     {apt.slot}
                   </div>
                 </div>

                 {/* STATUS MESSAGES */}
                 {apt.status === 'Payment Verifying' && (
                    <div className="bg-amber-50 p-3 rounded-lg text-xs text-amber-700 flex items-center gap-2 border border-amber-100">
                       <Loader2 size={14} className="animate-spin" />
                       <div>
                         <span className="font-bold block">Verifying Payment</span>
                         Admin is checking your UTR.
                       </div>
                    </div>
                 )}

                 {/* REJECTED STATUS + RETRY BUTTON */}
                 {apt.status === 'Payment Rejected' && (
                    <div className="space-y-3">
                        <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700 flex items-start gap-2 border border-red-100">
                            <XCircle size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold block">Payment Rejected</span>
                                {apt.payment_status?.replace('Rejected: ', '') || "Invalid transaction details."}
                            </div>
                        </div>
                        <button 
                            onClick={() => onRetry(apt)}
                            className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-md"
                        >
                            <RefreshCw size={14} /> Retry Payment
                        </button>
                    </div>
                 )}
                 
                 {/* DOWNLOAD RECEIPT (Only if Confirmed) */}
                 {(apt.status === 'Confirmed' || apt.status === 'Accepted') && (
                   <button 
                     onClick={() => generateReceipt(apt)}
                     className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
                   >
                     <Download size={14} /> Download Tax Invoice
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