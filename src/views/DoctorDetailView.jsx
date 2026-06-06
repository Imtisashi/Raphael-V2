import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Shield, Star } from 'lucide-react';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import {
  doctorWorkingDates, specialtyMeta, formatDate, slotsForDoctorDate,
  numericAmount, isProviderApproved, doctorCanBookDate, ratingLabel,
  nextAvailabilityForDoctor, shortDate, subtractMonths, addMonths,
  generateMonthDays, isSameDay, isPastDate, parseDateOnly, displayAmount
} from '../utils/utils';
import { Avatar, Button, SectionHeader } from '../components/ui/sharedComponents';

export default function DoctorDetailView({ doctor, setView, selectedSlot, setSelectedSlot, selectedDate, setSelectedDate, handleBook, user }) {
  const [calendarMonth, setCalendarMonth] = useState(() => selectedDate || new Date());
  const availableDates = useMemo(() => doctorWorkingDates(doctor), [doctor]);
  const availableCount = availableDates.length;

  if (!doctor) return null;
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;
  const dateStr = selectedDate ? formatDate(selectedDate) : '';
  const slots = dateStr ? slotsForDoctorDate(doctor, dateStr) : [];
  const hasFee = numericAmount(doctor.price) > 0;
  const approved = isProviderApproved(doctor);
  const selectedDateIsOpen = dateStr && doctorCanBookDate(doctor, dateStr);

  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden app-screen">
      <div className="relative shrink-0 px-6 pt-6 pb-7 overflow-hidden pro-detail-hero text-white">
        <button type="button" onClick={withHaptic(() => { setSelectedSlot(null); setView('search'); }, 'selection')} className="pressable relative z-20 p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-lg text-white transition-colors border border-white/20"><ChevronLeft size={20} strokeWidth={2.2} /></button>

        <div className="relative z-10 mt-8 flex items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-black text-white">
              <Icon size={13} strokeWidth={2.2} /> {doctor.specialty}
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
            <p className="text-lg font-black">{nextAvailabilityForDoctor(doctor)?.work_date ? shortDate(nextAvailabilityForDoctor(doctor).work_date) : 'None'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto app-scroll-region px-5 py-6 pb-36 space-y-5">
        <div className="pro-card p-5">
          <SectionHeader eyebrow="About" title="Specialist profile" />
          <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed font-semibold mt-3">{doctor.bio || "This provider has not added profile details yet."}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`rounded-lg border px-3 py-3 ${meta.soft}`}>
              <Shield size={16} strokeWidth={2.2} />
              <p className="mt-2 text-xs font-black">{approved ? 'Verified provider' : 'Provider under review'}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 px-3 py-3">
              <Star size={16} strokeWidth={2.2} className="fill-amber-400 text-amber-400" />
              <p className="mt-2 text-xs font-black">{doctor.reviews || 0} reviews</p>
            </div>
          </div>
        </div>

        <div className="pro-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <SectionHeader eyebrow={`${availableCount} working dates`} title="Choose a date" />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={withHaptic(() => setCalendarMonth(prev => subtractMonths(prev, 1)), 'selection')}
                className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
              >
                <ChevronLeft size={16} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={withHaptic(() => setCalendarMonth(prev => addMonths(prev, 1)), 'selection')}
                className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
              >
                <ChevronRight size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">Green dates are open</p>
          </div>
          <div className="calendar-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid patient-calendar">
            {generateMonthDays(calendarMonth).map((day, index) => {
              const dateKey = formatDate(day);
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isOpen = doctorCanBookDate(doctor, dateKey) && !isPastDate(day);
              return (
                <button
                  key={`${dateKey}-${index}`}
                  type="button"
                  disabled={!isOpen}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedDate(parseDateOnly(dateKey));
                    setCalendarMonth(parseDateOnly(dateKey));
                    setSelectedSlot(null);
                  }}
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isOpen ? 'available' : 'blocked'} ${!isCurrentMonth ? 'muted' : ''}`}
                >
                  <span>{day.getDate()}</span>
                  {isOpen && <span className="calendar-dot" />}
                </button>
              );
            })}
          </div>
          {availableCount === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-5 text-center text-sm font-bold text-slate-500">
              This provider has not published working dates yet.
            </div>
          )}
        </div>

        <div className="pro-card p-5 space-y-4">
          <SectionHeader eyebrow={selectedDate ? shortDate(selectedDate) : 'No date'} title="Choose a time" />
          <div className="grid grid-cols-3 gap-3 stagger-list">
            {slots.map(slot => (
                <button 
                  key={slot} 
                  type="button"
                  onClick={() => { triggerHaptic('selection'); setSelectedSlot(slot); }}
                  className={`pressable py-3.5 rounded-lg text-xs font-black transition-all duration-300 border outline-none focus:ring-4 ${
                    selectedSlot === slot 
                      ? 'bg-slate-950 border-slate-950 text-white shadow-lg shadow-slate-900/15 focus:ring-slate-900/20 dark:bg-cyan-500 dark:border-cyan-500 dark:text-slate-950'
                      : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-300 hover:border-cyan-300 hover:bg-cyan-50/60 focus:ring-cyan-100 dark:focus:ring-cyan-950'
                  }`}
                >
                  {slot}
                </button>
            ))}
            {slots.length === 0 && (
              <div className="col-span-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-4 py-5 text-center text-sm font-bold text-slate-500">
                {selectedDateIsOpen ? 'No time slots are open for this date.' : 'Select a green working date to see available times.'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="booking-bar absolute bottom-0 left-0 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-900 p-5 pb-6 z-30 shadow-[0_-20px_50px_rgba(15,23,42,0.10)]">
        <div className="flex justify-between items-center mb-4">
           <div>
             <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Consultation</span>
             <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{selectedSlot || 'Select a slot to continue'}</p>
           </div>
           <span className="text-3xl font-black text-slate-950 dark:text-white">{displayAmount(doctor.price)}</span>
        </div>
        <Button variant="accent" className="w-full" haptic="success" onClick={handleBook} disabled={!selectedSlot || !selectedDateIsOpen || !hasFee || !approved}>
           {!approved ? 'Provider Under Review' : !hasFee ? 'Consultation Fee Not Set' : !selectedDateIsOpen ? 'Select an Available Date' : selectedSlot ? (user ? `Confirm Booking for ${selectedSlot}` : `Login to Book for ${selectedSlot}`) : 'Select a Time Slot'}
        </Button>
      </div>
    </div>
  );
}
