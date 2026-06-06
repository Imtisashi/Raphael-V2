import React, { useState } from 'react';
import {
  Search, ArrowRight, Heart, ChevronRight, Activity, Moon, Sun
} from 'lucide-react';
import { useTheme } from '../providers/themeContext';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { specialtyMeta, uniqueSpecialties, specialtyForInput } from '../utils/utils';
import { Button, DoctorCard } from '../components/ui/sharedComponents';

export default function LandingView({ setView, doctors, setSearchQuery, onSelectDoctor, onLoginClick }) {
  const { isDark, toggleTheme } = useTheme();
  const [symptom, setSymptom] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!symptom.trim()) return;
    triggerHaptic('selection');
    const resolvedSpecialty = specialtyForInput(symptom);
    setSearchQuery(resolvedSpecialty || symptom);
    setView('search');
  };

  const handleCategoryClick = (category) => {
    triggerHaptic('selection');
    setSearchQuery(category);
    setView('search');
  };

  const approvedDoctors = doctors
    .filter(doc => doc.verification_status === 'approved')
    .slice(0, 3);

  const specialties = uniqueSpecialties();

  return (
    <div className="auth-screen app-scroll-region h-full min-h-0 w-full overflow-y-auto px-0 py-0 font-sans view-panel">

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center">
            <Heart size={16} strokeWidth={2.2} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Rapha'l</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={withHaptic(toggleTheme, 'selection')}
            className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-700 dark:bg-slate-900/60"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={16} strokeWidth={2.2} className="text-amber-400" /> : <Moon size={16} strokeWidth={2.2} className="text-slate-600" />}
          </button>
          <Button
            onClick={onLoginClick}
            variant="primary"
            className="h-9 px-4 text-sm font-semibold shadow-none py-0"
          >
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-10 pb-8 relative max-w-xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
          Find and book
          <span className="block text-cyan-600 dark:text-cyan-400">
            trusted doctors.
          </span>
        </h1>

        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md leading-relaxed mb-6">
          Browse verified specialists, check real-time availability, and book appointments with secure UPI payments.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md items-center mb-6">
          <div className="flex-1 relative">
            <Search size={18} strokeWidth={2.2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search doctors, symptoms, specialties..."
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-colors duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <button
            type="submit"
            className="pressable h-11 w-11 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center shrink-0 transition-colors duration-200"
          >
            <ArrowRight size={18} strokeWidth={2.2} />
          </button>
        </form>

        {/* Quick stats from real data */}
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            {doctors.filter(d => d.verification_status === 'approved').length} verified doctors
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>UPI payments</span>
        </div>
      </section>

      {/* Specialties */}
      <section className="px-6 py-6 border-t border-slate-100 dark:border-slate-800/60">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Specialties</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {specialties.map((spec) => {
              const meta = specialtyMeta(spec);
              const Icon = meta.icon;
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => handleCategoryClick(spec)}
                  className="pressable flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/5 dark:hover:border-cyan-700 group"
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white mb-2 transition-transform duration-200 group-hover:scale-105`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight truncate w-full">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className="px-6 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Available doctors</h2>
            <button
              type="button"
              onClick={withHaptic(() => setView('search'), 'selection')}
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-0.5 transition-colors duration-200"
            >
              View all <ChevronRight size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div className="space-y-3">
            {approvedDoctors.length > 0 ? (
              approvedDoctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  onClick={() => {
                    triggerHaptic('medium');
                    onSelectDoctor(doc);
                  }}
                />
              ))
            ) : (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30">
                <Activity className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={28} strokeWidth={2.2} />
                <p className="text-sm text-slate-500">Loading doctor directory...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-8 border-t border-slate-100 dark:border-slate-800/60">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How it works</h2>

          <div className="space-y-3">
            {[
              { step: '1', title: 'Find a doctor', desc: 'Browse verified specialists by name, specialty, or symptom.' },
              { step: '2', title: 'Book a slot', desc: 'Pick an available date and time from the doctor\'s live calendar.' },
              { step: '3', title: 'Pay via UPI', desc: 'Complete payment and submit your transaction ID to confirm.' }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3.5 p-3.5 rounded-xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 items-start transition-colors duration-200 hover:border-slate-200 dark:hover:border-slate-700">
                <span className="flex-shrink-0 h-7 w-7 rounded-md bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-semibold text-sm border border-cyan-100 dark:border-cyan-900/30">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-slate-100 dark:border-slate-800/60 max-w-xl mx-auto">
        <div className="flex justify-center items-center gap-2 mb-3">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center">
            <Heart size={10} strokeWidth={2.2} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Rapha'l Health</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 mb-1">
          &copy; {new Date().getFullYear()} Rapha'l. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed max-w-xs mx-auto">
          Payments are verified by administrators.
        </p>
      </footer>
    </div>
  );
}
