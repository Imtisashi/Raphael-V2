import React from 'react';
import {
  Star, MapPin, Calendar, Timer, ArrowUpRight, ChevronRight, Shield
} from 'lucide-react';
import { withHaptic } from '../../utils/haptics';
import {
  displayAmount, ratingLabel, shortDate, nextAvailabilityForDoctor, nextSlotFor, specialtyMeta
} from '../../utils/utils';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, haptic = 'light', type = 'button' }) => {
  const baseStyle = "button-lift pressable px-6 py-3.5 rounded-lg font-bold transition-all duration-300 ease-out flex items-center justify-center gap-2 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-4";
  const variants = {
    primary: "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800/90 focus-visible:ring-slate-900/50 focus-visible:ring-offset-slate-900/50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 dark:shadow-cyan-500/10",
    accent: "bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 text-white shadow-lg shadow-[0_4px_6px_-1px_rgba(16,185,129,0.3),0_2px_4px_-2px_rgba(16,185,129,0.2)] hover:brightness-105 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-cyan-500/50",
    secondary: "bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-cyan-200/50 hover:bg-cyan-50/60 focus-visible:ring-cyan-200/50 focus-visible:ring-offset-cyan-200/50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-800/60",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:ring-red-100/50 focus-visible:ring-offset-red-100/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/45",
    ghost: "bg-transparent text-slate-500 hover:text-cyan-700/80 hover:bg-cyan-50/50 focus-visible:ring-cyan-50/50 focus-visible:ring-offset-cyan-50/50 dark:text-slate-400 dark:hover:text-cyan-400/80 dark:hover:bg-cyan-950/20",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:border-cyan-500/50 hover:text-cyan-700/80 focus-visible:ring-slate-200/50 focus-visible:ring-offset-slate-200/50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:text-cyan-400"
  };
  return (
    <button type={type} onClick={withHaptic(onClick, haptic)} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  );
};

export const Badge = ({ children, type = 'info' }) => {
  const styles = {
    info: "bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/40",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
    warning: "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
    error: "bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40",
    dark: "bg-slate-950 text-white border border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${styles[type]}`}>
      {children}
    </span>
  );
};

export const Avatar = ({ name, url, size = "md", specialty }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-xl", lg: "w-24 h-24 text-4xl", xl: "w-28 h-28 text-5xl" };
  const initial = name ? name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D';
  const meta = specialtyMeta(specialty);

  if (url) return <img src={url} alt={name} className={`${sizes[size]} rounded-lg object-cover shadow-md ring-3 ring-white/20`} />;

  return (
    <div className={`${sizes[size]} rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white font-black shadow-lg shadow-slate-900/10 ring-2 ring-white/20 relative overflow-hidden`}>
      <div className="absolute inset-0 pro-avatar-pattern" />
      {initial}
      <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400/80 border-2 border-white/20 rounded-full shadow-sm"></div>
    </div>
  );
};

export const SectionHeader = ({ eyebrow, title, action, onAction }) => (
  <div className="flex items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="text-[11px] font-black uppercase text-cyan-700 dark:text-cyan-400">{eyebrow}</p>}
      <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
    </div>
    {action && (
      <button type="button" onClick={withHaptic(onAction, 'selection')} className="pressable text-sm font-bold text-slate-600 hover:text-cyan-700 flex items-center gap-1 dark:text-slate-400 dark:hover:text-cyan-400">
        {action} <ChevronRight size={15} />
      </button>
    )}
  </div>
);

export const MetricPill = ({ icon: Icon, label, value, tone = 'text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-900/50' }) => (
  <div className={`rounded-lg border px-3 py-2 ${tone}`}>
    <div className="flex items-center gap-2">
      {React.createElement(Icon, { size: 15 })}
      <span className="text-[11px] font-black">{label}</span>
    </div>
    <div className="mt-1 text-lg font-black text-slate-950 dark:text-white">{value}</div>
  </div>
);

export const DoctorCard = ({ doctor, onClick, featured = false }) => {
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;
  const nextAvailability = nextAvailabilityForDoctor(doctor);
  const slotCount = Array.isArray(nextAvailability?.slots) ? nextAvailability.slots.length : 0;
  const availabilityText = nextAvailability?.work_date
    ? `${shortDate(nextAvailability.work_date)} - ${slotCount || 'Open'} slot${slotCount === 1 ? '' : 's'}`
    : 'Calendar opening soon';

  return (
    <button
      type="button"
      onClick={withHaptic(onClick, featured ? 'medium' : 'selection')}
      className={`group doctor-card pro-card w-full text-left ${featured ? 'p-6' : 'p-4'} transition-all duration-300`}
    >
      <div className="flex items-start gap-4">
        <Avatar name={doctor.name} url={doctor.image} specialty={doctor.specialty} size={featured ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-black text-slate-950 dark:text-white leading-tight truncate">{doctor.name}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{doctor.specialty}</p>
            </div>
            <div className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-black ${meta.soft}`}>
              {displayAmount(doctor.price)}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40">
              <Star size={12} className="fill-amber-400 text-amber-400" /> {ratingLabel(doctor.rating)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1 text-slate-600 border border-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
              <MapPin size={12} /> {doctor.district || 'Nagaland'}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 ${meta.soft}`}>
              {React.createElement(Icon, { size: 12 })} {meta.label}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 ${nextAvailability ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'}`}>
              <Calendar size={12} /> {availabilityText}
            </span>
          </div>

          <div className="availability-strip mt-5 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 dark:bg-slate-900/40 dark:border-slate-800">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Timer size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>{nextSlotFor(doctor)}</span>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-black text-cyan-700 dark:text-cyan-400">
              Book <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
