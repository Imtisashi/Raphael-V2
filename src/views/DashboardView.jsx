function DashboardView({ appointments, appointmentEvents = {}, doctors = [], onOpenUpi, onSubmitPayment, onPayCash, platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT }) {
  const [utrInputs, setUtrInputs] = useState({});
  const doctorLookup = useMemo(() => new Map(doctors.map(doctor => [String(doctor.id), doctor])), [doctors]);
  const setUtrFor = (id, value) => setUtrInputs(prev => ({ ...prev, [id]: value }));

  if (!appointments.length) return (
    <div className="p-6 text-center flex flex-col items-center justify-center h-full app-screen pb-28">
      <div className="pro-card p-8 w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6 mx-auto shadow-lg shadow-cyan-500/20"><Calendar size={36} className="text-white" /></div>
        <h2 className="text-2xl font-black text-slate-950 mb-2">No visits yet</h2>
        <p className="text-slate-500 font-semibold text-sm">Booked appointments, approvals, and payment status will appear here.</p>
      </div>
    </div>
  );

  return (
    <div className="p-5 space-y-5 app-screen min-h-full pb-32">
       <div className="pro-card p-5">
         <div className="flex items-center justify-between">
           <div>
             <p className="text-xs font-black text-cyan-700 uppercase">Care timeline</p>
             <h2 className="text-3xl font-black text-slate-950 mt-1">My visits</h2>
           </div>
           <div className="h-12 w-12 bg-slate-950 text-white rounded-lg flex items-center justify-center">
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
                 <h3 className="text-lg font-black text-slate-950">{apt.doctor_name}</h3>
                 <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg mt-2 ${
                    apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    apt.status === 'Accepted' ? 'bg-cyan-50 text-cyan-700' :
                    apt.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                 }`}>{apt.status}</span>
               </div>
               <div className="bg-slate-950 text-white px-4 py-2 rounded-lg text-center shadow-sm">
                  <span className="text-[10px] font-black text-cyan-100 block uppercase">{new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-xl font-black text-white">{new Date(apt.appointment_date).getDate()}</span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-2 text-sm font-bold text-slate-600">
                <span className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100"><Clock size={16} className="text-cyan-500"/> {apt.slot}</span>
                <span className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100"><IndianRupee size={16} className="text-emerald-500"/> {displayAmount(apt.amount)}</span>
             </div>
             <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                Payment: {apt.payment_status || 'Unpaid'}
                {apt.transaction_id ? <span className="block mt-1 text-slate-700">UTR: {apt.transaction_id}</span> : null}
             </div>

             <div className="mt-4 rounded-lg border border-slate-100 bg-white p-3">
               <div className="flex items-center justify-between gap-2">
                 {appointmentSteps(apt).map((step, index) => (
                   <div key={step.label} className="flex-1">
                     <div className={`h-2 rounded-full ${step.done ? (step.danger ? 'bg-red-400' : 'bg-emerald-400') : step.disabled ? 'bg-slate-100' : 'bg-slate-200'}`} />
                     <p className={`mt-2 text-[10px] font-black ${step.done ? (step.danger ? 'text-red-600' : 'text-emerald-700') : 'text-slate-400'}`}>{index + 1}. {step.label}</p>
                   </div>
                 ))}
               </div>
               <div className="mt-4 flex items-start gap-2 text-xs font-bold text-slate-600">
                 <FileText size={15} className="text-cyan-600 shrink-0 mt-0.5" />
                 <p>{appointmentStatusMessage(apt)}</p>
               </div>
             </div>
             <div className="mt-4">
               <AppointmentTimeline events={appointmentEvents[String(apt.id)] || []} limit={4} />
             </div>

             {canSubmitPayment && (
               <div className="mt-6 rounded-lg border border-cyan-100 bg-cyan-50/70 p-4 space-y-3">
                 <div>
                   <p className="text-xs font-black uppercase text-cyan-700">Payment required</p>
                   <p className="text-sm font-bold text-slate-700 mt-1">
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
                     className="min-w-0 flex-1 rounded-lg border border-cyan-100 bg-white px-3 py-3 text-sm font-black uppercase text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                   />
                   <button
                     type="button"
                     onClick={() => onSubmitPayment(apt, enteredUtr)}
                     disabled={!paymentReceiver}
                     className={`rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 ${!paymentReceiver ? 'cursor-not-allowed opacity-50' : ''}`}
                   >
                     Submit
                   </button>
                 </div>
                 <button onClick={() => onPayCash(apt)} className="w-full text-center text-xs font-black text-slate-500 hover:text-cyan-700">
                   Paying cash at clinic instead
                 </button>
               </div>
             )}
             {isPaymentSubmitted(apt) && (
               <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
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