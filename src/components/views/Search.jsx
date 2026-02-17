import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Stethoscope, Star, MapPin } from 'lucide-react';
import { SYMPTOM_MAP } from '../../data/mockData';

export default function SearchView({ searchQuery, setSearchQuery, doctors, setView, setSelectedDoctor, activeCategory, setActiveCategory }) {
  
  const filteredDoctors = useMemo(() => {
    let results = doctors;

    // 1. Category Filter
    if (activeCategory && activeCategory !== 'All') {
      results = results.filter(d => d.specialty === activeCategory);
    }

    // 2. Text Search with AI Mapping
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const detectedSpecialty = Object.keys(SYMPTOM_MAP).find(key => lowerQuery.includes(key));
      
      if (detectedSpecialty) {
        const targetSpecialty = SYMPTOM_MAP[detectedSpecialty];
        results = results.filter(d => d.specialty === targetSpecialty);
      } else {
        results = results.filter(d => 
          d.name.toLowerCase().includes(lowerQuery) || 
          d.specialty.toLowerCase().includes(lowerQuery)
        );
      }
    }
    return results;
  }, [doctors, searchQuery, activeCategory]);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 p-4 border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronRight className="rotate-180 text-slate-600" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              autoFocus
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredDoctors.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <Stethoscope size={48} className="mx-auto mb-4 text-slate-300" />
            <p>No matches found.</p>
          </div>
        ) : (
          filteredDoctors.map(doctor => (
            <div 
              key={doctor.id}
              onClick={() => { setSelectedDoctor(doctor); setView('detail'); }}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-100 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex gap-4">
                <img src={doctor.image} alt={doctor.name} className="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-bold text-slate-900">{doctor.name}</h3>
                    <span className="text-teal-600 font-bold text-sm">{doctor.price}</span>
                  </div>
                  <p className="text-sm text-slate-500">{doctor.specialty}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400"/> {doctor.rating}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {doctor.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}