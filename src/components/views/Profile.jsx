import React, { useState, useEffect } from 'react';
import { User, Camera, Save, DollarSign, Stethoscope, Mail, Phone, MapPin, Droplet, AlertCircle, LogOut, Building, IndianRupee } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient'; 
import Button from '../ui/Button'; 

export default function ProfileView({ user, logout, showToast }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [role] = useState(user?.role || 'patient');
  
  // Common States
  const [district, setDistrict] = useState('Dimapur');

  // Doctor Specific States
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [image, setImage] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [upiId, setUpiId] = useState('');

  // Patient Specific States
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');

  const nagalandDistricts = [
    "Chümoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", 
    "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", 
    "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto"
  ];

  // 1. FETCH DATA ON MOUNT
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      const userId = user.id; 

      // Fetch User Details
      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userData) {
        setName(userData.name || '');
        setPhone(userData.phone || '');
        setAddress(userData.address || '');
        setBloodGroup(userData.blood_group || 'O+');
        setAllergies(userData.allergies || '');
        if (userData.district) setDistrict(userData.district);
      }

      // Fetch Doctor Details
      if (role === 'doctor' && user.doctorId) {
        const { data: docData } = await supabase.from('doctors').select('*').eq('id', user.doctorId).single();
        if (docData) {
          setBio(docData.bio || '');
          setPrice(docData.price ? docData.price.replace('₹', '') : '');
          setSpecialty(docData.specialty || '');
          setImage(docData.image || '');
          setClinicName(docData.clinic_name || '');
          setUpiId(docData.upi_id || '');
          if (docData.district) setDistrict(docData.district);
        }
      }
    };

    fetchProfileData();
  }, [role, user]);

  // 2. SAVE DATA
  const handleUpdate = async () => {
    setLoading(true);
    try {
      // Update User Table
      const { error: userError } = await supabase.from('users').update({ 
        name,
        phone,
        address,
        blood_group: bloodGroup,
        allergies,
        district
      }).eq('id', user?.id);

      if (userError) throw userError;

      // Update Doctor Table
      if (role === 'doctor') {
        const { error: docError } = await supabase.from('doctors').update({
          name,
          bio,
          price: `₹${price}`,
          specialty,
          image,
          district,
          clinic_name: clinicName,
          upi_id: upiId, // Saves UPI ID
          location: `${clinicName}, ${district}` 
        }).eq('id', user?.doctorId);
        if (docError) throw docError;
      }

      if (showToast) showToast("Profile saved successfully!");
      else alert("Profile saved!");
    } catch (err) {
      if (showToast) showToast("Error saving profile: " + err.message, "error");
      else alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setImage(data.publicUrl);
    } catch (error) {
      if (showToast) showToast('Error uploading image: ' + error.message, "error");
      else alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <User className="text-teal-600" /> Edit Profile
      </h1>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Profile Image (Doctor Only) */}
        {role === 'doctor' && (
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                {image ? <img src={image} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-400" />}
              </div>
              <label className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-teal-700 transition-colors">
                <Camera size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-2">{uploading ? "Uploading..." : "Change Photo"}</p>
          </div>
        )}

        {/* Common Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            {/* FIX: Removed bg-white, kept bg-slate-50 for consistency */}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <div className="flex items-center gap-2 w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed">
               <Mail size={16} /> {user?.email || 'user@medicore.com'}
            </div>
          </div>
          
          {/* Location District (Common) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">District (Nagaland)</label>
            <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                    {nagalandDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
          </div>
        </div>

        {/* Patient Specific Personal Details */}
        {role === 'patient' && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Personal Details</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                    <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3.5 text-slate-400" />
                        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="Phone Number" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blood Group</label>
                    <div className="relative">
                        <Droplet size={14} className="absolute left-3 top-3.5 text-slate-400" />
                        <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm appearance-none">
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="House No, Colony, etc." />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medical Notes / Allergies</label>
                <div className="relative">
                    <AlertCircle size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm min-h-[80px]" placeholder="E.g. Peanuts, Penicillin..." />
                </div>
            </div>
          </div>
        )}

        {/* Doctor Specific Fields */}
        {role === 'doctor' && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Professional Details</h3>
            
            {/* Clinic Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clinic / Hospital Name</label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. City Wellness Centre" />
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UPI ID (For Payments)</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. yourname@upi" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">This ID will be used for patient transactions.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Specialty</label>
              <div className="relative">
                <Stethoscope size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Consultation Fee (₹)</label>
              <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]" placeholder="Tell patients about your experience..." />
            </div>
          </div>
        )}

        <Button onClick={handleUpdate} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Changes"}
        </Button>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 border-t border-slate-100">
            <Button onClick={logout} variant="danger" className="w-full flex items-center justify-center gap-2">
                <LogOut size={18} /> Log Out
            </Button>
        </div>
      </div>
    </div>
  );
}