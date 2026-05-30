function DoctorDetailView({ doctor, setView, selectedSlot, setSelectedSlot, selectedDate, handleBook }) {
  if (!doctor) return null;
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;
  const dateStr = selectedDate ? formatDate(selectedDate) : '';
  const slots = dateStr ? getSlotsForDate(doctor.slots, dateStr) : [];
  const hasFee = numericAmount(doctor.price) > 0;
  const approved = isProviderApproved(doctor);

  return (
    <div className="h-full flex flex-col app-screen">
      <div className="relative shrink-0 px-6 pt-6 pb-7 overflow-hidden pro-detail-hero text-white">
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="relative z-20 p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-lg text-white transition-colors border border-white/20"><ChevronLeft size={20} /></button>

        <div className="relative z-10 mt-8 flex items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-black text-white">
              <Icon size={13} /> {doctor.specialty}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.03]">{doctor.name}</h1>
            <p className="mt-3 text-sm font-semibold text-cyan-50">{doctor.clinic_name || doctor.location || 'Verified Rapha\'l provider'}</p>
          </div>
          <Avatar name={doctor.name} url={doctor.image} specialty={doctor.specialty} size="xl" />
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Rating</p>
            <p className="text-lg font-black">{ratingLabel(doctor.rating)}</p>
          </div>
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Experience</p>
            <p className="text-lg font-black">{doctor.experience || 'Not listed'}</p>
          </div>
          <div className="rounded-lg bg-white/15 border border-white/15 p-3">
            <p className="text-[10px] font-bold text-cyan-50">Next</p>
            <p className="text-lg font-black">{nextSlotFor(doctor).replace(' AM', '').replace(' PM', '')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-36 space-y-5">
        <div className="pro-card p-5">
          <SectionHeader eyebrow="About" title="Specialist profile" />
          <p className="text-slate-600 text-sm leading-relaxed font-semibold mt-3">{doctor.bio || "This provider has not added profile details yet."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-lg border px-3 py-3 ${meta.soft}`}>
              <Shield size={16} />
              <p className="mt-2 text-xs font-black">{approved ? 'Verified provider' : 'Provider under review'}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-amber-700">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <p className="mt-2 text-xs font-black">{doctor.reviews || 0} reviews</p>
            </div>
          </div>
        </div>

        <div className="pro-card p-5 space-y-4">
          <SectionHeader eyebrow={shortDate(selectedDate)} title="Choose a time" />
          <div className="grid grid-cols-3 gap-3">
            {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-3.5 rounded-lg text-xs font-black transition-all duration-300 border outline-none focus:ring-4 ${
                    selectedSlot === slot
                      ? 'bg-slate-950 border-slate-950 text-white shadow-lg shadow-slate-900/15 focus:ring-slate-900/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50/60 focus:ring-cyan-100'
                  }`}
                >
                  {slot}
                </button>
            ))}
            {slots.length === 0 && (
              <div className="col-span-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-500">
                No appointment slots have been added yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-100 p-5 pb-6 z-30 shadow-[0_-20px_50px_rgba(15,23,42,0.10)]">
        <div className="flex justify-between items-center mb-4">
           <div>
             <span className="text-xs font-black text-slate-500 uppercase">Consultation</span>
             <p className="text-sm font-semibold text-slate-500">{selectedSlot || 'Select a slot to continue'}</p>
           </div>
           <span className="text-3xl font-black text-slate-950">{displayAmount(doctor.price)}</span>
        </div>
        <Button variant="accent" className="w-full" onClick={handleBook} disabled={!selectedSlot || !hasFee || !approved}>
           {!approved ? 'Provider Under Review' : !hasFee ? 'Consultation Fee Not Set' : selectedSlot ? `Confirm Booking for ${selectedSlot}` : 'Select a Time Slot'}
        </Button>
      </div>
    </div>
  );
}