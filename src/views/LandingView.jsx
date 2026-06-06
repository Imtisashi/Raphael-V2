import React, { useState } from 'react';
import {
  Search, Shield, Star, MapPin, ArrowRight, ShieldCheck, Zap, Users,
  Heart, Calendar, CheckCircle2, ChevronRight, Activity, Sparkles, Moon, Sun
} from 'lucide-react';
import { useTheme } from '../providers/themeContext';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { specialtyMeta, uniqueSpecialties, specialtyForInput } from '../utils/utils';
import { Button, Badge, DoctorCard } from '../components/ui/sharedComponents';

export default function LandingView({ setView, doctors, setSearchQuery, onSelectDoctor, onLoginClick }) {
  const { isDark, toggleTheme } = useTheme();
  const [symptom, setSymptom] = useState('');
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!symptom.trim()) return;
    triggerHaptic('selection');
    
    // Resolve specialty or pass query directly
    const resolvedSpecialty = specialtyForInput(symptom);
    setSearchQuery(resolvedSpecialty || symptom);
    
    // Direct guest to search view to see results interactively
    setView('search');
  };

  const handleCategoryClick = (category) => {
    triggerHaptic('selection');
    setSearchQuery(category);
    setView('search');
  };


  // Filter approved doctors to display
  const approvedDoctors = doctors
    .filter(doc => doc.verification_status === 'approved')
    .slice(0, 3);

  const specialties = uniqueSpecialties();

  return (
    <div className="auth-screen app-scroll-region h-full min-h-0 w-full overflow-y-auto px-0 py-0 font-sans view-panel">
      {/* Premium Gradient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/5 rounded-full filter blur-[100px] pointer-events-none animate-pulse duration-[6000ms]"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none animate-pulse duration-[8000ms]"></div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Heart size={18} className="text-white fill-white/10 animate-pulse" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Rapha'l</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={withHaptic(toggleTheme, 'selection')}
            className="pro-icon-button pressable h-10 w-10 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={17} className="text-cyan-400" /> : <Moon size={17} className="text-slate-700" />}
          </button>
          <Button
            onClick={onLoginClick}
            variant="primary"
            className="h-10 px-5 text-sm font-bold shadow-none py-0"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-12 pb-10 text-center relative max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 text-cyan-700 dark:text-cyan-400 mb-6 animate-in fade-in duration-700">
          <ShieldCheck size={14} />
          <span className="text-xs font-black uppercase tracking-wider">ISO 27001 Secured Health Platform</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white leading-[1.05] tracking-tight mb-5">
          Care booking, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500">
            simplified for everyone.
          </span>
        </h1>

        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm max-w-md mx-auto leading-relaxed mb-8">
          Skip the queue. Book consultations with verified doctors, view schedule availability, and settle payouts securely using standard UPI.
        </p>

        {/* Hero Search Bar */}
        <form onSubmit={handleSearchSubmit} className="pro-command-bar p-1.5 flex gap-2 max-w-md mx-auto items-center dark:border-slate-800 dark:bg-slate-900/90 mb-10">
          <div className="flex-1 flex items-center pl-3 gap-2">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Migraine, Cardiologist, Dr. Sharma..."
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <Button
            type="submit"
            variant="accent"
            className="h-11 px-5 py-0 rounded-lg text-sm"
          >
            Find Doctor
          </Button>
        </form>

        {/* Trust Stats */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <div className="bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 p-4 rounded-xl backdrop-blur-sm">
            <Users size={20} className="mx-auto mb-2 text-cyan-500" />
            <strong className="block text-lg font-black text-slate-950 dark:text-white">15+</strong>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Specialists</span>
          </div>
          <div className="bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 p-4 rounded-xl backdrop-blur-sm">
            <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-500" />
            <strong className="block text-lg font-black text-slate-950 dark:text-white">100%</strong>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verified</span>
          </div>
          <div className="bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 p-4 rounded-xl backdrop-blur-sm">
            <Zap size={20} className="mx-auto mb-2 text-amber-500" />
            <strong className="block text-lg font-black text-slate-950 dark:text-white">Instant</strong>
            <span className="text-[10px] font-bold text-slate-400 uppercase">UPI Payout</span>
          </div>
        </div>
      </section>

      {/* Specialties Quick Categories */}
      <section className="px-6 py-8 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">Explore Care</p>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Browse by Specialty</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 stagger-list">
            {specialties.map((spec) => {
              const meta = specialtyMeta(spec);
              const Icon = meta.icon;
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => handleCategoryClick(spec)}
                  className="pressable specialty-tile flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200/60 bg-white shadow-sm hover:border-cyan-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-500/30"
                >
                  <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white mb-2.5 shadow-md`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 text-center leading-tight truncate w-full">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="px-6 py-8">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">Top Rated</p>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Verified Specialists</h2>
            </div>
            <button
              type="button"
              onClick={withHaptic(() => setView('search'), 'selection')}
              className="text-xs font-black text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-1"
            >
              See all <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4 stagger-list">
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
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
                <Activity className="mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-pulse" size={32} />
                <p className="text-sm font-bold text-slate-500">Connecting live doctor directories...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-10 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-wider">Three Simple Steps</p>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">How Rapha'l Works</h2>
          </div>

          <div className="space-y-4 stagger-list">
            {[
              { step: '1', title: 'Find a Specialist', desc: 'Browse through our roster of verified, approved clinical practitioners.' },
              { step: '2', title: 'Schedule a Visit', desc: 'Select an available slot matching your convenience.' },
              { step: '3', title: 'Pay via UPI', desc: 'Submit transaction ID (UTR) to instantly confirm booking with the doctor.' }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-sm items-start">
                <span className="flex-shrink-0 h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-100 dark:border-cyan-900/30">
                  {item.step}
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 max-w-xl mx-auto">
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
            <Heart size={12} className="text-white fill-white/10" />
          </div>
          <span className="text-sm font-black text-slate-950 dark:text-white">Rapha'l Health</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 mb-2">
          &copy; {new Date().getFullYear()} Rapha'l. All rights reserved.
        </p>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 leading-relaxed max-w-xs mx-auto">
          Rapha'l is a patient-doctor transaction registry. Payments are verified by administrators.
        </p>
      </footer>
    </div>
  );
}
