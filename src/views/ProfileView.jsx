import React, { useState, useEffect } from 'react';
import { X, Edit3, LogOut, BadgeCheck, PhoneCall, MapPinned, Save, Loader2 } from 'lucide-react';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { Avatar, Badge, Button } from '../components/ui/sharedComponents';

export default function ProfileView({ user, logout, onSaveProfile }) {
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

  const fieldClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-5 py-4 text-slate-800 dark:text-white font-bold text-sm outline-none focus:border-cyan-300 dark:focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-950";

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto app-screen pb-28">
      <div className="pro-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-cyan-700 dark:text-cyan-400 uppercase">Member profile</p>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white mt-1">Account</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { triggerHaptic('selection'); setIsEditing(prev => !prev); }} className="pro-icon-button pressable border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
              {isEditing ? <X size={18} strokeWidth={2.2} /> : <Edit3 size={18} strokeWidth={2.2} />}
            </button>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} specialty="General Physician" size="lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">{user?.name}</h2>
              <Badge type="info"><BadgeCheck size={12} strokeWidth={2.2} /> {user?.role || 'patient'} account</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Full Name</label>
              {isEditing ? (
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={fieldClass} />
              ) : (
                <div className={fieldClass}>{user?.name || 'N/A'}</div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Email Address</label>
              <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-5 py-4 text-slate-800 dark:text-slate-350 font-bold text-sm break-all">{user?.email || 'N/A'}</div>
            </div>
            {isEditing && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Address</label>
                  <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className={fieldClass} placeholder="Home address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Blood</label>
                    <input value={form.blood_group} onChange={(e) => updateField('blood_group', e.target.value)} className={fieldClass} placeholder="O+" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Allergies</label>
                    <input value={form.allergies} onChange={(e) => updateField('allergies', e.target.value)} className={fieldClass} placeholder="None" />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-cyan-100 dark:border-cyan-950/60 bg-cyan-50 dark:bg-cyan-950/20 p-4 text-cyan-700 dark:text-cyan-400">
                <PhoneCall size={16} strokeWidth={2.2} />
                {isEditing ? (
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-2 w-full bg-white/70 dark:bg-slate-850 rounded-md px-2 py-2 text-xs font-black outline-none text-slate-900 dark:text-white" placeholder="Phone" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.phone || 'No phone'}</p>
                )}
              </div>
              <div className="rounded-lg border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-emerald-700 dark:text-emerald-400">
                <MapPinned size={16} strokeWidth={2.2} />
                {isEditing ? (
                  <input value={form.district} onChange={(e) => updateField('district', e.target.value)} className="mt-2 w-full bg-white/70 dark:bg-slate-850 rounded-md px-2 py-2 text-xs font-black outline-none text-slate-900 dark:text-white" placeholder="District" />
                ) : (
                  <p className="mt-2 text-xs font-black">{user?.district || 'Dimapur'}</p>
                )}
              </div>
            </div>
            {!isEditing && (user?.address || user?.blood_group || user?.allergies) && (
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 text-slate-600 dark:text-slate-400 text-xs font-bold space-y-1">
                {user?.address && <p>Address: {user.address}</p>}
                {user?.blood_group && <p>Blood group: {user.blood_group}</p>}
                {user?.allergies && <p>Allergies: {user.allergies}</p>}
              </div>
            )}
            {isEditing && (
              <Button onClick={saveProfile} variant="accent" haptic="success" className="w-full mt-6" disabled={saving}>
                {saving ? <Loader2 size={16} strokeWidth={2.2} className="animate-spin" /> : <Save size={16} strokeWidth={2.2} />} Save Profile
              </Button>
            )}
            <button onClick={withHaptic(logout, 'warning')} className="pressable flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100/60 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950/30 dark:hover:bg-red-950/40">
              <LogOut size={16} strokeWidth={2.2} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
