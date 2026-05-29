function HomeView({ setView, setSearchQuery, doctors, setSelectedDoctor, onOpenNotifications, unreadCount = 0 }) {
  const [symptomInput, setSymptomInput] = useState('');
  const [routing, setRouting] = useState(false);
  const featuredDoctors = doctors.slice(0, 3);
  const specialties = uniqueSpecialties();

  const routeToCare = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;

    setSearchQuery(specialtyForInput(query) || query);
    setRouting(true);
    window.setTimeout(() => {
      setRouting(false);
      setView('search');
    }, 220);
  }, [setSearchQuery, setView, symptomInput]);

  const searchDirectly = useCallback((value) => {
    const query = String(value ?? symptomInput).trim();
    if (!query) return;
    setSearchQuery(query);
    setView('search');
  }, [setSearchQuery, setView, symptomInput]);

  return (
    <div className="relative space-y-6 pb-28 flex-1 app-screen min-h-full">
      <div className="pro-home-hero px-6 pt-8 pb-6">
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <Badge type="success"><BadgeCheck size={12} /> Verified network</Badge>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] text-slate-950">
              Book trusted care from live provider records.
            </h1>
          </div>
          <button type="button" onClick={onOpenNotifications} className="pro-icon-button relative">
            <Bell size={19} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-red-500 px-1 text-[10px] font-black leading-5 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            searchDirectly();
          }}
          className="relative z-10 pro-command-bar"
        >
          <Search className="absolute left-4 top-4 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search doctors, symptoms, specialties"
            value={symptomInput}
            className="w-full h-14 pl-12 pr-14 rounded-lg bg-white text-slate-900 placeholder-slate-400 outline-none font-semibold"
            onChange={(e) => setSymptomInput(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-2 p-2.5 rounded-lg bg-slate-950 text-white hover:bg-slate-800 transition-colors">
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
          {[
            { prompt: 'fever', icon: Activity },
            { prompt: 'chest pain', icon: HeartPulse },
            { prompt: 'skin rash', icon: Sparkles },
          ].map(({ prompt, icon: Icon }) => (
            <button key={prompt} onClick={() => routeToCare(prompt)} className="quick-chip">
              {React.createElement(Icon, { size: 14 })} {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <MetricPill icon={Users} label="Doctors" value={doctors.length} tone="text-cyan-700 bg-cyan-50 border-cyan-100" />
          <MetricPill icon={ClipboardCheck} label="Booking" value="Live" tone="text-indigo-700 bg-indigo-50 border-indigo-100" />
          <MetricPill icon={Wallet} label="Pay" value="UPI" tone="text-emerald-700 bg-emerald-50 border-emerald-100" />
        </div>

        <div className="pro-card p-5 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase">Care finder</p>
              <h2 className="text-2xl font-black text-slate-950 mt-1">Find the right specialty</h2>
              <p className="text-sm font-semibold text-slate-500 mt-2">
                Search symptoms, specialties, districts, or provider names across real available records.
              </p>
            </div>
            <button onClick={() => routeToCare()} className="h-14 w-14 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
              {routing ? <Loader2 size={22} className="animate-spin" /> : <ArrowRight size={22} />}
            </button>
          </div>
        </div>

        <section className="space-y-3">
          <SectionHeader eyebrow="Explore" title="Care specialties" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {specialties.map((specialty) => {
              const meta = specialtyMeta(specialty);
              const Icon = meta.icon;
              return (
                <button
                  key={specialty}
                  onClick={() => { setSearchQuery(specialty); setView('search'); }}
                  className="min-w-[112px] pro-card p-4"
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.tone} text-white flex items-center justify-center mb-3 shadow-md shadow-slate-900/10`}>
                    <Icon size={19} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm text-slate-950">{meta.label}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate">{specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader eyebrow="Recommended" title="Top specialists" action="See all" onAction={() => setView('search')} />
          <div className="grid gap-3">
            {featuredDoctors.map((doctor, index) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                featured={index === 0}
                onClick={() => { setSelectedDoctor(doctor); setView('detail'); }}
              />
            ))}
            {featuredDoctors.length === 0 && (
              <div className="pro-card border-dashed p-6 text-center">
                <Users size={32} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-lg font-black text-slate-900">No live providers yet</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">Add doctors in Supabase or register a provider account to populate this list.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}