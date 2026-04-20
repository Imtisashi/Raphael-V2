import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../ui/Button'; 
import Badge from '../ui/Badge'; 

export default function DoctorDetailView({ doctor, setView, selectedSlot, setSelectedSlot, handleBook, selectedDate, setSelectedDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const activeDate = selectedDate || new Date();
  const activeDateString = activeDate.toDateString();

  useEffect(() => {
    if (!doctor) return;
    const fetchTakenSlots = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('slot, appointment_date')
        .eq('doctor_id', doctor.id);

      if (data) {
        const taken = data
          .filter(a => new Date(a.appointment_date).toDateString() === activeDateString)
          .map(a => a.slot);
        setBookedSlots(taken);
      }
    };
    fetchTakenSlots();
  }, [doctor, activeDateString]);

  useEffect(() => {
    if (!doctor) return;
    const getReviews = async () => {
       const { data } = await supabase.from('reviews').select('*').eq('doctor_id', doctor.id);
       if(data) setReviews(data);
    }
    getReviews();
  }, [doctor]);

  if (!doctor) return null;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const isSelected = (d) => d.toDateString() === activeDateString;
  
  const handleDateClick = (d) => {
    if (setSelectedDate) {
        setSelectedDate(d);
        setSelectedSlot(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in slide-in-from-right duration-300">
      
      {/* VIBRANT HEADER IMAGE AREA */}
      <div className="relative h-56 bg-slate-900 shrink-0 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/60 to-slate-900/95 z-10"></div>
        <img src={doctor.image} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
        
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="absolute top-4 left-4 z-20 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all shadow-lg">
           <ChevronRight className="rotate-180" />
        </button>
        
        <div className="absolute -bottom-12 left-6 z-20 flex items-end">
          <img src={doctor.image} className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl bg-white object-cover" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-16 px-6 pb-6 space-y-6">
        
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">{doctor.name}</h1>
           <p className="text-teal-600 font-bold text-sm mb-4">{doctor.specialty}</p>
           <div className="flex flex-wrap gap-2 mb-2">
             <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{doctor.experience} Exp</span>
             <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"><Star size={10} className="fill-amber-700"/> {doctor.rating} Rating</span>
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-900 mb-2 tracking-tight">About Specialist</h3>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">{doctor.bio || "No bio available."}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 tracking-tight"><Calendar size={18} className="text-teal-500" /> Select Date</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><ChevronLeft size={16} /></button>
                <span className="font-bold text-sm text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><ChevronRight size={16} /></button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-[10px] font-black text-slate-400">{d}</span>)}
             </div>
             <div className="grid grid-template-columns-7 grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: days }).map((_, i) => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                    const isPast = d < new Date().setHours(0,0,0,0);
                    return (
                        <div key={i} onClick={() => !isPast && handleDateClick(d)} className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isSelected(d) ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/40 scale-105' : isPast ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-teal-50 hover:text-teal-700 text-slate-700 cursor-pointer bg-white border border-slate-100'}`}>{i + 1}</div>
                    );
                })}
             </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 tracking-tight"><Clock size={18} className="text-teal-500" /> Available Times</h3>
          <div className="grid grid-cols-3 gap-3">
            {doctor.slots && doctor.slots.length > 0 ? (
                doctor.slots.map(slot => {
                  const isTaken = bookedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => !isTaken && setSelectedSlot(slot)}
                      disabled={isTaken}
                      className={`py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden ${isTaken ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100 opacity-60' : selectedSlot === slot ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/30 border-none' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-500 hover:bg-teal-50'}`}
                    >
                      {slot}
                      {isTaken && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-[1px]"><span className="text-[9px] font-black text-red-500 rotate-[-12deg] border-2 border-red-200 px-1 rounded-md bg-white shadow-sm">BOOKED</span></div>}
                    </button>
                  );
                })
            ) : (<div className="col-span-3 text-center py-4 text-slate-400 text-sm font-medium italic">No slots available for this day.</div>)}
          </div>
        </div>

        {/* REVIEWS SECTION */}
        {reviews.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-900 mb-3 tracking-tight">Patient Reviews</h3>
              <div className="space-y-3">
                {reviews.map(r => (
                   <div key={r.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-slate-800">{r.patient_name}</span>
                        <span className="text-amber-500 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">★ {r.rating}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{r.comment}</p>
                   </div>
                ))}
              </div>
            </div>
        )}
      </div>

      {/* FIXED BOTTOM ACTION BAR - Will naturally sit at the bottom without overlapping */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 pb-safe shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] mt-auto z-30 relative">
        <Button className={`w-full py-4 text-sm font-bold shadow-xl transition-all ${selectedSlot ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`} onClick={handleBook} disabled={!selectedSlot}>
          {selectedSlot ? `Book for ${activeDateString} at ${selectedSlot}` : 'Select Date & Time'}
        </Button>
      </div>
    </div>
  );
}