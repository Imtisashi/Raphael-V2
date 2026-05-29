function ProfileView({ user, logout, onSaveProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    district: user?.district || 'Dimapur',
    address: user?.address || '',
    blood_group: user?.blood_group || '',
    allergies: user?.allergies || '',
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      district: user?.district || 'Dimapur',
      address: user?.address || '',
      blood_group: user?.blood_group || '',
      allergies: user?.allergies || '',
    });
  }, [user]);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await onSaveProfile({
        name: form.name.trim() || user?.name,
        phone: form.phone.trim(),
        district: form.district.trim() || 'Dimapur',
        address: form.address.trim(),
        blood_group: form.blood_group.trim(),
        allergies: form.allergies.trim(),
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-slate-800 font-bold text-sm outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100";

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto app-screen pb-28">
      <div className="pro-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-cyan-700 uppercase">Member profile</p>
            <h1 className="text-3xl font-black text-slate-950 mt-1">Account</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(prev => !prev)} className="pro-icon-button">
              {isEditing ? <X size={18} /> : <Edit3 size={18} />}
            </button>
            <button onClick={logout} className="pro-icon-button text-red-600 bg-red-50 border-red-100 hover:bg-red-100"><LogOut size={18} /></button>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} specialty="General Physician" size="lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-950">{user?.name}</h2>
              <Badge type="info"><BadgeCheck size={12} /> {user?.role || 'patient'} account</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Full Name</label>
              {isEditing ? (
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={fieldClass} />
              ) : (
                <div className={fieldClass}>{user?.name || 'N/A'}</div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Email Address</label>
              <div className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-4 text-slate-800 font-bold text-sm break-all">{user?.email || 'N/A'}</div>
            </div>
            {isEditing && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Address</label>
                  <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className={fieldClass} placeholder="Home address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Blood</label>
                    <input value={form.blood_group} onChange={(e) => updateField('blood_group', e.target.value)} className={fieldClass} placeholder="O+" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5">Allergies</label>
                    <input value={form.allergies} onChange={(e) => updateField('allergies', e.target.value)} className={fieldClass} placeholder="None" />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-cyan-700">
                <PhoneCall size={16} />
                {isEditing ? (
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-2 w-full bg-white/70 rounded-md px-2 py-2 text-xs font-black outline-none" placeholder="Phone" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.phone || 'No phone'}</p>
                )}
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
                <MapPinned size={16} />
                {isEditing ? (
                  <input value={form.district} onChange={(e) => updateField('district', e.target.value)} className="mt-2 w-full bg-white/70 rounded-md px-2 py-2 text-xs font-black outline-none" placeholder="District" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.district || 'Dimapur'}</p>
                )}
              </div>
            </div>
            {!isEditing && (user?.address || user?.blood_group || user?.allergies) && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-slate-600 text-xs font-bold space-y-1">
                {user?.address && <p>Address: {user.address}</p>}
                {user?.blood_group && <p>Blood group: {user.blood_group}</p>}
                {user?.allergies && <p>Allergies: {user.allergies}</p>}
              </div>
            )}
            {isEditing && (
              <Button onClick={saveProfile} variant="accent" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}