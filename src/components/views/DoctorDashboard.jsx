import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Upload, Camera, RefreshCw, ChevronLeft, ChevronRight, List, User, IndianRupee, Plus, X, Bot, Send, MessageSquare, Phone, MapPin, Droplet, AlertTriangle } from 'lucide-react';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabaseClient';

const PatientModal = ({ patientId, onClose }) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchPatient = async () => {
        setLoading(true);
        const { data } = await supabase.from('users').select('*').eq('id', patientId).single();
        if (data) setPatient(data);
        setLoading(false);
    };
    if (patientId) fetchPatient();
  }, [patientId]);

  if (!patient && !loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                <div><h2 className="text-xl font-bold">{loading ? 'Loading...' : patient?.name}</h2><p className="text-slate-400 text-xs">ID: {patientId}</p></div>
                <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full"><X size={20} /></button>
            </div>
            {!loading && patient && (
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3"><div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl"><Phone size={20}/></div><div><p className="text-xs text-slate-400">Phone</p><p className="font-bold text-slate-800 dark:text-white">{patient.phone || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-3"><div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><MapPin size={20}/></div><div><p className="text-xs text-slate-400">Location</p><p className="font-bold text-slate-800 dark:text-white">{patient.district || 'N/A'}</p></div></div>
                    <div className="flex items-center gap-3"><div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl"><Droplet size={20}/></div><div><p className="text-xs text-slate-400">Blood Group</p><p className="font-bold text-slate-800 dark:text-white">{patient.blood_group || 'N/A'}</p></div></div>
                </div>
            )}
        </div>
    </div>
  );
};

export default function DoctorDashboard({ user, logout, setView, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mySlots, setMySlots] = useState([]);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [doctorImage, setDoctorImage] = useState(null); 
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: `Hello Dr. ${user.name?.split(' ')[0] || ''}.` }]);
  const chatEndRef = useRef(null);

  const fetchData = useCallback(async () => {
      setLoading(true);
      const doctorId = user.doctorId || 1;
      const { data: aptData } = await supabase.from('appointments').select('*').eq('doctor_id', doctorId).order('id', { ascending: false });
      const { data: docData } = await supabase.from('doctors').select('slots, image').eq('id', doctorId).single();
      if (aptData) setAppointments(aptData);
      if (docData) {
          if (docData.slots) setMySlots(docData.slots);
          if (docData.image) setDoctorImage(docData.image); 
      }
      setLoading(false);
  }, [user.doctorId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, showChat]);

  const addSlot = async () => { if (!newSlotTime) return; const updatedSlots = [...mySlots, newSlotTime].sort(); setMySlots(updatedSlots); setNewSlotTime(''); await supabase.from('doctors').update({ slots: updatedSlots }).eq('id', user.doctorId); if(showToast) showToast("Slot added"); };
  const removeSlot = async (s) => { const updated = mySlots.filter(x => x !== s); setMySlots(updated); await supabase.from('doctors').update({ slots: updated }).eq('id', user.doctorId); };
  const updateStatus = async (id, st) => { setAppointments(prev => prev.map(a => a.id === id ? {...a, status: st} : a)); await supabase.from('appointments').update({ status: st }).eq('id', id); };
  const handleSendChat = () => { if (!chatInput.trim()) return; const userMsg = { sender: 'user', text: chatInput }; setChatMessages(prev => [...prev, userMsg]); setChatInput(''); setTimeout(() => { setChatMessages(prev => [...prev, { sender: 'ai', text: "I can help check your schedule or earnings." }]); }, 800); };

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
      const { error: dbError } = await supabase.from('doctors').update({ image: data.publicUrl }).eq('id', user.doctorId || 1); 
      if (dbError) throw dbError;
      setDoctorImage(data.publicUrl); 
      if (showToast) showToast('Photo updated!');
    } catch (error) { if (showToast) showToast(error.message, "error"); } finally { setUploading(false); }
  };

  const getDaysInMonth = (date) => { return { days: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), firstDay: new Date(date.getFullYear(), date.getMonth(), 1).getDay() }; };
  const changeMonth = (o) => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + o)));
  const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
  const { days, firstDay } = getDaysInMonth(currentDate);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const filteredAppointments = appointments.filter(apt => { if (viewMode === 'list') return true; if (!apt.appointment_date) return false; return new Date(apt.appointment_date).toDateString() === selectedDate.toDateString(); });
  const totalEarnings = appointments.filter(a => a.status === 'Accepted').length * 500; 

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative transition-colors duration-300">
      {selectedPatientId && <PatientModal patientId={selectedPatientId} onClose={() => setSelectedPatientId(null)} />}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300">{doctorImage ? <img src={doctorImage} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-400" />}</div><div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Dr. Dashboard</h1><p className="text-xs text-slate-500 dark:text-slate-400">Welcome, {user.name}</p></div></div>
        <div className="flex gap-2"><button onClick={() => setView('profile')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"><User size={16} /> Profile</button><button onClick={logout} className="text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors">Logout</button></div>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-5 rounded-2xl text-white shadow-lg"><p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Earnings</p><div className="flex items-center gap-1"><IndianRupee size={24} className="text-teal-400" /><span className="text-3xl font-bold">{totalEarnings.toLocaleString('en-IN')}</span></div></div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4"><h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2"><Clock size={16} className="text-teal-600"/> Manage Schedule</h3><div className="flex gap-2 mb-3"><input type="time" className="flex-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg px-2 py-1 text-sm outline-none text-slate-900 dark:text-white" onChange={(e) => { const [h,m] = e.target.value.split(':'); const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12; setNewSlotTime(`${h12}:${m} ${ampm}`); }} /><button onClick={addSlot} className="bg-teal-600 text-white p-2 rounded-lg"><Plus size={16}/></button></div><div className="flex flex-wrap gap-2">{mySlots.map(slot => (<div key={slot} className="bg-white dark:bg-slate-900 border dark:border-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 flex gap-2">{slot}<button onClick={() => removeSlot(slot)} className="text-red-400"><X size={12} /></button></div>))}</div></div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"><button onClick={() => setViewMode('list')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}><List size={16} /> List</button><button onClick={() => setViewMode('calendar')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex justify-center gap-2 ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow text-teal-700 dark:text-teal-400' : 'text-slate-500'}`}><CalendarIcon size={16} /> Calendar</button></div>
             {viewMode === 'calendar' && (<div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl p-4 shadow-sm"><div className="flex justify-between items-center mb-4"><button onClick={() => changeMonth(-1)} className="dark:text-white"><ChevronLeft size={20} /></button><span className="font-bold dark:text-white">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="dark:text-white"><ChevronRight size={20} /></button></div><div className="grid grid-cols-7 gap-2 text-center text-xs dark:text-slate-400">{['S','M','T','W','T','F','S'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-grid">{Array.from({length: firstDay}).map((_,i)=><div key={i}></div>)}{Array.from({length: days}).map((_,i)=>{ const d=new Date(currentDate.getFullYear(), currentDate.getMonth(), i+1); return <div key={i} onClick={()=>setSelectedDate(d)} className={`calendar-day dark:text-white ${isSameDay(d,selectedDate)?'selected':''}`}>{i+1}</div> })}</div></div>)}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
               <div className="relative group cursor-pointer shrink-0">
                 <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden">{uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div> : <Camera className="text-slate-400" size={20} />}</div>
                 <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
               <div><h3 className="font-bold text-slate-900 dark:text-white text-sm">Update Photo</h3><button className="text-[10px] bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1 mt-1 pointer-events-none"><Upload size={10} /> {uploading ? "Uploading..." : "Select"}</button></div>
            </div>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto pb-24">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">{viewMode === 'calendar' ? `Schedule: ${selectedDate.toDateString()}` : 'Patient Queue'}<button onClick={() => { setLoading(true); fetchData(); }} className="ml-auto text-teal-600 p-2"><RefreshCw size={20} /></button></h2>
            {loading ? <div className="text-center py-20 text-slate-400">Loading...</div> : filteredAppointments.length === 0 ? <div className="text-center py-20 text-slate-400">No appointments.</div> : (
              <div className="space-y-4">
                {filteredAppointments.map(apt => (
                  <div key={apt.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedPatientId(apt.patient_id)}>
                         <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg uppercase">{apt.patient_name ? apt.patient_name[0] : '?'}</div>
                         <div><h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">{apt.patient_name} <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-normal">View Profile</span></h3><Badge type={apt.status}>{apt.status}</Badge></div>
                      </div>
                      <div className="text-right"><div className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">{apt.slot}</div></div>
                    </div>
                    {apt.status === 'Payment Verifying' ? (<div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs p-3 rounded-xl border border-amber-200 dark:border-amber-800">Payment under admin verification.</div>) : apt.status === 'Confirmed' || apt.status === 'Pending' ? (<div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800"><button onClick={() => updateStatus(apt.id, 'Declined')} className="flex justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20">Decline</button><button onClick={() => updateStatus(apt.id, 'Accepted')} className="flex justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-teal-600 text-white hover:opacity-90">Accept</button></div>) : null}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {showChat && (<div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-80 md:w-96 flex flex-col border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden"><div className="bg-slate-900 dark:bg-slate-800 text-white p-4 flex justify-between items-center"><span className="font-bold text-sm">Assistant</span><button onClick={() => setShowChat(false)}><X size={18} /></button></div><div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">{chatMessages.map((msg, i) => (<div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user' ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800 dark:text-slate-200'}`}>{msg.text}</div></div>))}<div ref={chatEndRef} /></div><div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 bg-slate-100 dark:bg-slate-800 dark:text-white border-none rounded-xl px-4 py-2" /><button onClick={handleSendChat}><Send size={18} className="text-teal-600" /></button></div></div>)}
        <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full shadow-2xl bg-slate-800 text-white hover:bg-teal-600"><Bot size={24} /></button>
      </div>
    </div>
  );
}