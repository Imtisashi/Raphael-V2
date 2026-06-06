import React, { useState, useCallback } from 'react';
import {
  Search, ArrowRight, Activity, HeartPulse, Sparkles, Users, ClipboardCheck, Wallet, BadgeCheck
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  uniqueSpecialties, doctorCanBookDate, formatDate, nextAvailabilityForDoctor,
  doctorWorkingDates, specialtyForInput, specialtyMeta
} from '../utils/utils';
import { Button, Badge, MetricPill, SectionHeader, DoctorCard } from '../components/ui/sharedComponents';

export default function HomeView({ setView, setSearchQuery, doctors, onSelectDoctor, unreadCount = 0 }) {
  const [symptomInput, setSymptomInput] = useState('');
  const featuredDoctors = doctors.slice(0, 3);
  const specialties = uniqueSpecialties();
  const openToday = doctors.filter((doctor) => doctorCanBookDate(doctor, formatDate(new Date()))).length;
  const openSoon = doctors.filter((doctor) => nextAvailabilityForDoctor(doctor)).length;
  const liveSlotCount = doctors.reduce((total, doctor) => (
    total + doctorWorkingDates(doctor).reduce((sum, day) => sum + (Array.isArray(day.slots) ? day.slots.length : 0), 0)
  ), 0);

  const routeToCare = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;
    triggerHaptic('selection');
    setSearchQuery(specialtyForInput(query) || query);
    setView('search');
  }, [setSearchQuery, setView, symptomInput]);

  const searchDirectly = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;
    triggerHaptic('selection');
    setSearchQuery(query);
    setView('search');
  }, [setSearchQuery, setView, symptomInput]);

  return (
    <div className="relative space-y-5 pb-28 flex-1 app-screen min-h-full">
      <div className="pro-home-hero px-5 pt-7 pb-5">
        <div className="relative z-10 flex justify-between items-start mb-5">
          <div>
            <Badge type="success"><BadgeCheck size={12} strokeWidth={2.2} /> Verified network</Badge>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white">
              Book trusted care.
            </h1>
          </div>
        </div>

        <div className="relative z-10 mb-4 grid grid-cols-3 gap-2 hero-stat-strip">
          <div className="dark:bg-slate-900/40 dark:border-slate-700">
            <span className="dark:text-slate-400">Today</span>
            <strong className="dark:text-white">{openToday || openSoon}</strong>
          </div>
          <div className="dark:bg-slate-900/40 dark:border-slate-700">
            <span className="dark:text-slate-400">Slots</span>
            <strong className="dark:text-white">{liveSlotCount}</strong>
          </div>
          <div className="dark:bg-slate-900/40 dark:border-slate-700">
            <span className="dark:text-slate-400">Updates</span>
            <strong className="dark:text-white">{unreadCount}</strong>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            searchDirectly();
          }}
          className="relative z-10 flex gap-2"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} strokeWidth={2.2} />
            <input
              type="text"
              placeholder="Search doctors, symptoms, specialties"
              value={symptomInput}
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none text-sm transition-colors duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              onChange={(e) => setSymptomInput(e.target.value)}
            />
          </div>
          <button type="submit" className="pressable h-12 w-12 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 transition-colors duration-200 flex items-center justify-center shrink-0">
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </form>

        <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
          {[
            { prompt: 'fever', icon: Activity },
            { prompt: 'chest pain', icon: HeartPulse },
            { prompt: 'skin rash', icon: Sparkles },
          ].map(({ prompt, icon: Icon }) => (
            <button type="button" key={prompt} onClick={() => routeToCare(prompt)} className="quick-chip pressable dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors duration-200">
              {React.createElement(Icon, { size: 14, strokeWidth: 2.2 })} {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-5">
        <div className="grid grid-cols-3 gap-2.5">
          <MetricPill icon={Users} label="Doctors" value={doctors.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-900/30" />
          <MetricPill icon={ClipboardCheck} label="Booking" value="Live" tone="text-indigo-700 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/30" />
          <MetricPill icon={Wallet} label="Pay" value="UPI" tone="text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/30" />
        </div>

        <section className="space-y-3">
          <SectionHeader eyebrow="Explore" title="Care specialties" />
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {specialties.map((specialty) => {
              const meta = specialtyMeta(specialty);
              const Icon = meta.icon;
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => { triggerHaptic('selection'); setSearchQuery(specialty); setView('search'); }}
                  className="specialty-tile min-w-[100px] rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-3.5 transition-all duration-200 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/5 dark:hover:border-cyan-700 group"
                >
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${meta.tone} text-white flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={17} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{meta.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader eyebrow="Recommended" title="Top specialists" action="See all" onAction={() => setView('search')} />
          <div className="grid gap-3 stagger-list">
            {featuredDoctors.map((doctor, index) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                featured={index === 0}
                onClick={() => onSelectDoctor(doctor)}
              />
            ))}
            {featuredDoctors.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 text-center">
                <Users size={28} strokeWidth={2.2} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">No providers yet</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Register a provider account to populate this list.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
