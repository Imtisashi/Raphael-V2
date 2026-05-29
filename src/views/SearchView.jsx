function SearchView({ searchQuery, setSearchQuery, doctors, setView, setSelectedDoctor, activeCategory, setActiveCategory }) {
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
      <div className="sticky top-0 bg-white/95 backdrop-blur-xl z-20 pt-4 pb-4 px-5 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView('home')} className="pro-icon-button"><ChevronLeft size={20}/></button>
          <div className="flex-1 relative group pro-command-bar shadow-none">
            <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Find your doctor..." className="w-full bg-white rounded-lg py-3 pl-11 pr-4 outline-none font-semibold text-sm" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', ...Array.from(new Set(Object.values(SYMPTOM_MAP)))].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-xs font-black whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-slate-950 text-white border-slate-950 shadow-md shadow-slate-900/15' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <SectionHeader eyebrow={`${filteredDoctors.length} matches`} title={searchQuery ? `Results for ${searchQuery}` : 'Browse specialists'} />
        {filteredDoctors.length === 0 && (
           <div className="text-center py-16 pro-card border-dashed">
             <Search size={34} className="mx-auto text-slate-300 mb-4" />
             <h3 className="text-lg font-black text-slate-800">No specialists found</h3>
             <p className="text-sm font-semibold text-slate-500 mt-2">Try a symptom like fever, chest pain, rash, headache, or joint pain.</p>
           </div>
        )}
        {filteredDoctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} onClick={() => { setSelectedDoctor(doctor); setView('detail'); }} />
        ))}
      </div>
    </div>
  );
}