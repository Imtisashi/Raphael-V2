import React, { useState, useMemo } from 'react';
import { Clock, Activity, Calendar, ClipboardCheck, IndianRupee, FileText, Wallet } from 'lucide-react';
import { withHaptic } from '../utils/haptics';
import {
  DEFAULT_PLATFORM_FEE_PERCENT, formatEventTime, APPOINTMENT_EVENT_META,
  paymentReceiverFor, cleanUtr, displayAmount, isPaymentSubmitted,
  isPaymentVerified, appointmentStatusMessage, appointmentSteps
} from '../utils/utils';
import { generateReceipt } from '../utils/pdfGenerator';
import { Button } from '../components/ui/sharedComponents';

function AppointmentTimeline({ events = [], limit = 3, compact = false }) {
  const visibleEvents = events.slice(0, limit);
  if (!visibleEvents.length) return null;

  return (
    <div className={`rounded-lg border border-slate-100 bg-white/80 dark:bg-slate-900/60 dark:border-slate-800 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="mb-3 flex items-center gap-2">
        <Clock size={14} className="text-cyan-700 dark:text-cyan-400" />
        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Activity</p>
      </div>
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const meta = APPOINTMENT_EVENT_META[event.event_type] || { icon: Activity, tone: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800' };
          const Icon = meta.icon;
          return (
            <div key={event.id} className="flex gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-black text-slate-900 dark:text-white break-words">{event.title}</p>
                  <span className="shrink-0 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500">{formatEventTime(event.created_at)}</span>
                </div>
                <p className={`${compact ? 'truncate' : ''} mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400`}>{event.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardView({ appointments, appointmentEvents = {}, doctors = [], onOpenUpi, onSubmitPayment, onPayCash, platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT }) {
  const [utrInputs, setUtrInputs] = useState({});
  const doctorLookup = useMemo(() => new Map(doctors.map(doctor => [String(doctor.id), doctor])), [doctors]);
  const setUtrFor = (id, value) => setUtrInputs(prev => ({ ...prev, [id]: value }));

  if (!appointments.length) return (
    <div className="p-6 text-center flex flex-col items-center justify-center h-full app-screen pb-28">
      <div className="pro-card p-8 w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6 mx-auto shadow-lg shadow-cyan-500/20"><Calendar size={36} className="text-white" /></div>
        <h2 className="text-2xl font-black text-slate-950 dark:text-white mb-2">No visits yet</h2>
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">Booked appointments, approvals, and payment status will appear here.</p>
      </div>
    </div>
  );
  
  return (
    <div className="p-5 space-y-5 app-screen min-h-full pb-32">
       <div className="pro-card p-5">
         <div className="flex items-center justify-between">
           <div>
             <p className="text-xs font-black text-cyan-700 dark:text-cyan-400 uppercase">Care timeline</p>
             <h2 className="text-3xl font-black text-slate-950 dark:text-white mt-1">My visits</h2>
           </div>
           <div className="h-12 w-12 bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950 rounded-lg flex items-center justify-center">
             <ClipboardCheck size={22} />
           </div>
         </div>
       </div>
       
       {appointments.map(apt => {
          const canSubmitPayment = apt.status === 'Accepted' && ['Unpaid', 'Rejected'].includes(apt.payment_status || 'Unpaid');
          const enteredUtr = utrInputs[apt.id] ?? apt.transaction_id ?? '';
          const receiverDoctor = doctorLookup.get(String(apt.doctor_id));
          const receiver = paymentReceiverFor(receiverDoctor);
          const paymentReceiver = apt.payment_receiver_upi || receiver.upi;
          const receiverLabel = paymentReceiver || 'Payment receiver not configured';
          return (
            <div key={apt.id} className="pro-card p-5">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{apt.doctor_name}</h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg mt-2 ${
                     apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                     apt.status === 'Accepted' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400' :
                     apt.status === 'Cancelled' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                     'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                  }`}>{apt.status}</span>
                </div>
                <div className="bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950 px-4 py-2 rounded-lg text-center shadow-sm">
                   <span className="text-[10px] font-black text-cyan-100 dark:text-cyan-950/70 block uppercase">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                   <span className="text-xl font-black text-white dark:text-slate-950">{new Date(apt.appointment_date).getDate()}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2 text-sm font-bold text-slate-600 dark:text-slate-350">
                 <span className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800"><Clock size={16} className="text-cyan-500"/> {apt.slot}</span>
                 <span className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800"><IndianRupee size={16} className="text-emerald-500"/> {displayAmount(apt.amount)}</span>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                 Payment: {apt.payment_status || 'Unpaid'}
                 {apt.transaction_id ? <span className="block mt-1 text-slate-700 dark:text-slate-300">UTR: {apt.transaction_id}</span> : null}
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  {appointmentSteps(apt).map((step, index) => (
                    <div key={step.label} className="flex-1">
                      <div className={`h-2 rounded-full ${step.done ? (step.danger ? 'bg-red-400' : 'bg-emerald-400') : step.disabled ? 'bg-slate-100 dark:bg-slate-850' : 'bg-slate-200 dark:bg-slate-800'}`} />
                      <p className={`mt-2 text-[10px] font-black ${step.done ? (step.danger ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400') : 'text-slate-400 dark:text-slate-500'}`}>{index + 1}. {step.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <FileText size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <p>{appointmentStatusMessage(apt)}</p>
                </div>
              </div>
              <div className="mt-4">
                <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={4} />
              </div>
              
              {canSubmitPayment && (
                <div className="mt-6 rounded-lg border border-cyan-100 dark:border-cyan-950/60 bg-cyan-50/70 dark:bg-cyan-950/20 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-black uppercase text-cyan-700 dark:text-cyan-400">Payment required</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-1">
                      {paymentReceiver
                        ? `Pay to ${receiverLabel}, then submit the UTR number shown in your UPI app.`
                        : 'Payment receiver is not configured yet. Ask the clinic or choose cash at clinic.'}
                    </p>
                  </div>
                  <Button onClick={() => onOpenUpi(apt)} variant="accent" className="w-full text-sm py-3 shadow-none" disabled={!paymentReceiver}>
                    <Wallet size={16} /> Open UPI App
                  </Button>
                  <div className="flex gap-2">
                    <input
                      value={enteredUtr}
                      onChange={(event) => setUtrFor(apt.id, cleanUtr(event.target.value))}
                      placeholder="Enter UTR / transaction ID"
                      className="min-w-0 flex-1 rounded-lg border border-cyan-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 text-sm font-black uppercase text-slate-900 dark:text-white outline-none focus:border-cyan-300 dark:focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-950"
                    />
                    <button
                      type="button"
                      onClick={() => onSubmitPayment(apt, enteredUtr)}
                      disabled={!paymentReceiver}
                      className={`rounded-lg bg-slate-950 dark:bg-cyan-500 dark:text-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 dark:hover:bg-cyan-400 ${!paymentReceiver ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Submit
                    </button>
                  </div>
                  <button type="button" onClick={withHaptic(() => onPayCash(apt), 'selection')} className="pressable w-full text-center text-xs font-black text-slate-500 dark:text-slate-450 hover:text-cyan-700">
                    Paying cash at clinic instead
                  </button>
                </div>
              )}
              {isPaymentSubmitted(apt) && (
                <div className="mt-6 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-400">
                  Admin verification is pending. You will be notified after the UTR is matched.
                </div>
              )}
              {isPaymentVerified(apt) && (
                <Button onClick={() => generateReceipt(apt, platformFeePercent)} variant="secondary" className="mt-6 w-full text-sm py-3">
                  <FileText size={16} /> Download Receipt
                </Button>
              )}
            </div>
          );
       })}
    </div>
  );
}
