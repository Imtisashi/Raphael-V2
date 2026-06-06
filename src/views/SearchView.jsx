import React, { useMemo } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { specialtyForInput, SYMPTOM_MAP } from '../utils/utils';
import { SectionHeader, DoctorCard } from '../components/ui/sharedComponents';

export default function SearchView({ searchQuery, setSearchQuery, doctors, setView, onSelectDoctor, activeCategory, setActiveCategory, user }) {
  const filteredDoctors = useMemo(() => {
    let results = doctors;
    if (activeCategory && activeCategory !== 'All') results = results.filter(d => d.specialty === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const detectedSpecialty = specialtyForInput(q);
      if (detectedSpecialty) results = results.filter(d => d.specialty === detectedSpecialty);
      else results = results.filter(d => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || (d.district && d.district.toLowerCase().includes(q)));
    }
    return results;
  }, [doctors, searchQuery, activeCategory]);

  return (
    <div className="h-full flex flex-col app-screen min-h-screen pb-28">
      <div className="sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl z-20 pt-4 pb-4 px-5 border-b border-slate-100 dark:border-slate-900 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={withHaptic(() => setView(user ? 'home' : 'landing'), 'selection')} className="pro-icon-button pressable h-10 w-10 shrink-0 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"><ChevronLeft size={20}/></button>
          <div className="flex-1 relative group pro-command-bar dark:border-slate-800 dark:bg-slate-900/90 shadow-none">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find your doctor..." className="w-full bg-white dark:bg-transparent rounded-lg py-3 pl-11 pr-4 outline-none font-semibold text-sm text-slate-900 dark:text-white" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', ...Array.from(new Set(Object.values(SYMPTOM_MAP)))].map(cat => (
            <button type="button" key={cat} onClick={() => { triggerHaptic('selection'); setActiveCategory(cat); }} className={`pressable px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-slate-950 text-white border-slate-950 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-500 shadow-md shadow-slate-900/15' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/30'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 stagger-list">
        <SectionHeader eyebrow={`${filteredDoctors.length} matches`} title={searchQuery ? `Results for ${searchQuery}` : 'Browse specialists'} />
        {filteredDoctors.length === 0 && (
           <div className="text-center py-16 pro-card border-dashed">
             <Search size={34} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
             <h3 className="text-lg font-black text-slate-800 dark:text-white">No specialists found</h3>
             <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">Try a symptom like fever, chest pain, rash, headache, or joint pain.</p>
           </div>
        )}
        {filteredDoctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} onClick={() => onSelectDoctor(doctor)} />
        ))}
      </div>
    </div>
  );
}
