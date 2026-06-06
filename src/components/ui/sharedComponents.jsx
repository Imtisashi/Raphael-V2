import React from 'react';
import {
  Star, MapPin, Calendar, Timer, ArrowUpRight, ChevronRight, Shield
} from 'lucide-react';
import { withHaptic } from '../../utils/haptics';
import {
  displayAmount, ratingLabel, shortDate, nextAvailabilityForDoctor, nextSlotFor, specialtyMeta
} from '../../utils/utils';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, haptic = 'light', type = 'button' }) => {
  const baseStyle = "pressable px-5 py-3 rounded-lg font-semibold transition-all duration-200 ease-out flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400",
    accent: "bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-200 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40",
    ghost: "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800",
    outline: "bg-transparent border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
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
    dark: "bg-slate-900 text-white border border-slate-800 dark:bg-slate-800 dark:text-slate-100"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${styles[type]}`}>
      {children}
    </span>
  );
};

export const Avatar = ({ name, url, size = "md", specialty }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-12 h-12 text-lg", lg: "w-20 h-20 text-3xl", xl: "w-24 h-24 text-4xl" };
  const initial = name ? name.replace('Dr. ', '').charAt(0).toUpperCase() : 'D';
  const meta = specialtyMeta(specialty);

  if (url) return <img src={url} alt={name} className={`${sizes[size]} rounded-lg object-cover`} />;

  return (
    <div className={`${sizes[size]} rounded-lg bg-gradient-to-br ${meta.tone} flex items-center justify-center text-white font-semibold relative overflow-hidden`}>
      {initial}
    </div>
  );
};

export const SectionHeader = ({ eyebrow, title, action, onAction }) => (
  <div className="flex items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="text-[11px] font-medium uppercase text-cyan-600 dark:text-cyan-400 tracking-wide">{eyebrow}</p>}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
    </div>
    {action && (
      <button type="button" onClick={withHaptic(onAction, 'selection')} className="pressable text-sm font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors duration-200">
        {action} <ChevronRight size={15} />
      </button>
    )}
  </div>
);

export const MetricPill = ({ icon: Icon, label, value, tone = 'text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/40 dark:border-cyan-900/50' }) => (
  <div className={`rounded-lg border px-3 py-2 ${tone}`}>
    <div className="flex items-center gap-2">
      {React.createElement(Icon, { size: 15 })}
      <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
    </div>
    <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</div>
  </div>
);

export const DoctorCard = ({ doctor, onClick, featured = false }) => {
  const meta = specialtyMeta(doctor.specialty);
  const Icon = meta.icon;
  const nextAvailability = nextAvailabilityForDoctor(doctor);
  const slotCount = Array.isArray(nextAvailability?.slots) ? nextAvailability.slots.length : 0;
  const availabilityText = nextAvailability?.work_date
    ? `${shortDate(nextAvailability.work_date)} · ${slotCount || 'Open'} slot${slotCount === 1 ? '' : 's'}`
    : 'Calendar opening soon';

  return (
    <button
      type="button"
      onClick={withHaptic(onClick, featured ? 'medium' : 'selection')}
      className={`group w-full text-left ${featured ? 'p-5' : 'p-4'} rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5 dark:hover:border-slate-700 dark:hover:shadow-none`}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={doctor.name} url={doctor.image} specialty={doctor.specialty} size={featured ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white leading-tight truncate">{doctor.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doctor.specialty}</p>
            </div>
            <div className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.soft}`}>
              {displayAmount(doctor.price)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40">
              <Star size={11} className="fill-amber-400 text-amber-400" /> {ratingLabel(doctor.rating)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-slate-600 border border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <MapPin size={11} /> {doctor.district || 'Nagaland'}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 ${nextAvailability ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
              <Calendar size={11} /> {availabilityText}
            </span>
          </div>

          <div className="mt-3.5 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3.5 py-2.5 dark:bg-slate-800/50 dark:border-slate-800 transition-colors duration-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Timer size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>{nextSlotFor(doctor)}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
              Book <ArrowUpRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
