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

  // Fetch Booked Slots
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

  // Fetch Reviews
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
    <div className="h-full flex flex-col bg-white animate-in slide-in-from-right duration-300">
      <div className="relative h-48 bg-slate-900 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-900/50 to-slate-900/90 z-10"></div>
        <img src={doctor.image} className="w-full h-full object-cover opacity-50" />
        <button onClick={() => { setSelectedSlot(null); setView('search'); }} className="absolute top-4 left-4 z-20 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"><ChevronRight className="rotate-180" /></button>
        <div className="absolute -bottom-12 left-6 z-20">
          <img src={doctor.image} className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl bg-white object-cover" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-14 px-6 pb-32">
        <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
        <p className="text-teal-600 font-medium mb-4">{doctor.specialty}</p>
        <div className="flex gap-4 mb-6">
          <Badge type="info">{doctor.experience} Exp</Badge>
          <Badge type="warning">{doctor.rating} Rating</Badge>
        </div>
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 mb-2">About</h3>
          <p className="text-slate-500 text-sm leading-relaxed">{doctor.bio || "No bio available."}</p>
        </div>
        
        {/* Calendar */}
        <div className="mb-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar size={18} className="text-teal-500" /> Select Date</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
                <span className="font-bold text-sm text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
             </div>
             <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-[10px] font-bold text-slate-400">{d}</span>)}
             </div>
             <div className="grid grid-template-columns-7 grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: days }).map((_, i) => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                    const isPast = d < new Date().setHours(0,0,0,0);
                    return (
                        <div key={i} onClick={() => !isPast && handleDateClick(d)} className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${isSelected(d) ? 'bg-teal-600 text-white shadow-md' : isPast ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-700 cursor-pointer'}`}>{i + 1}</div>
                    );
                })}
             </div>
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-teal-500" /> Available Times</h3>
          <div className="grid grid-cols-3 gap-3">
            {doctor.slots && doctor.slots.length > 0 ? (
                doctor.slots.map(slot => {
                  const isTaken = bookedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => !isTaken && setSelectedSlot(slot)}
                      disabled={isTaken}
                      className={`py-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden ${isTaken ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100' : selectedSlot === slot ? 'bg-teal-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-500'}`}
                    >
                      {slot}
                      {isTaken && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-[1px]"><span className="text-[9px] font-bold text-red-500 rotate-[-12deg] border border-red-200 px-1 rounded bg-white shadow-sm">BOOKED</span></div>}
                    </button>
                  );
                })
            ) : (<div className="col-span-3 text-center py-4 text-slate-400 text-sm italic">No slots available for this day.</div>)}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="font-bold text-slate-900 mb-3">Patient Reviews</h3>
          {reviews.length === 0 ? <p className="text-xs text-slate-400 italic">No reviews yet.</p> : (
            reviews.map(r => (
               <div key={r.id} className="bg-slate-50 p-3 rounded-lg mb-2">
                  <div className="flex justify-between"><span className="font-bold text-xs">{r.patient_name}</span><span className="text-amber-500 text-xs">★ {r.rating}</span></div>
                  <p className="text-xs text-slate-600 mt-1">{r.comment}</p>
               </div>
            ))
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-30">
        <Button className="w-full" onClick={handleBook} disabled={!selectedSlot}>{selectedSlot ? `Book for ${activeDateString} at ${selectedSlot}` : 'Select Date & Time'}</Button>
      </div>
    </div>
  );
}