import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient'; 
import LoginView from './components/views/Login';
import HomeView from './components/views/Home';
import SearchView from './components/views/Search';
import DoctorDetailView from './components/views/Detail';
import DashboardView from './components/views/Dashboard';
import DoctorDashboard from './components/views/DoctorDashboard';
import AdminDashboard from './components/views/AdminDashboard';
import ProfileView from './components/views/Profile';
import { CheckCircle, Zap, Search, Calendar, User, LogOut, ShieldCheck, X, AlertCircle, Settings, Sun, Moon, Type, Bell } from 'lucide-react';
import Button from './components/ui/Button';

const ADMIN_UPI_HANDLE = import.meta.env.VITE_ADMIN_UPI_HANDLE;
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "Rapha'l Health Platform";

// --- CUSTOM SEO COMPONENT ---
const SEO = ({ title, description }) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    setMeta('description', description);
  }, [title, description]);
  return null;
};

// --- SETTINGS MODAL ---
const SettingsModal = ({ onClose, settings, setSettings }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="text-teal-500" size={20} /> Settings</h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-500 dark:text-slate-400" /></button>
        </div>
        <div className="space-y-6">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Appearance</label>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                 <button onClick={() => setSettings({...settings, theme: 'light'})} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium ${settings.theme === 'light' ? 'bg-white shadow text-teal-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Sun size={16}/> Light</button>
                 <button onClick={() => setSettings({...settings, theme: 'dark'})} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium ${settings.theme === 'dark' ? 'bg-slate-700 shadow text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Moon size={16}/> Dark</button>
              </div>
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Accessibility</label>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2"><Type size={16}/> Larger Text</span>
                 <button onClick={() => setSettings({...settings, largeText: !settings.largeText})} className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${settings.largeText ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.largeText ? 'translate-x-6' : ''}`} />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// UPGRADED TOAST FOR NOTIFICATIONS
const Toast = ({ notification, onClose }) => {
  if (!notification) return null;
  
  let bgColor = 'bg-slate-800 text-white';
  let Icon = Bell;
  let iconColor = 'text-blue-400';

  if (notification.type === 'error') {
    bgColor = 'bg-red-500 text-white';
    Icon = AlertCircle;
    iconColor = 'text-white';
  } else if (notification.type === 'success') {
    bgColor = 'bg-slate-800 text-white border border-slate-700';
    Icon = CheckCircle;
    iconColor = 'text-green-400';
  } else if (notification.type === 'info') {
    bgColor = 'bg-blue-600 text-white shadow-blue-900/50';
    Icon = Bell;
    iconColor = 'text-white animate-bounce';
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${bgColor}`}>
      <Icon size={20} className={`${iconColor} shrink-0`} />
      <p className="font-semibold text-sm flex-1">{notification.message}</p>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 p-1 bg-black/10 rounded-full"><X size={16} /></button>
    </div>
  );
};

// PAYMENT MODAL
const PaymentModal = ({ appointment, onClose, onConfirm }) => {
  const [txnId, setTxnId] = useState('');
  const PLATFORM_FEE = 50;
  const cleanAmount = appointment.amount ? parseInt(appointment.amount.toString().replace(/[^0-9]/g, '')) : 0;
  const consultationFee = isNaN(cleanAmount) ? 0 : cleanAmount;
  const totalPayable = consultationFee + PLATFORM_FEE;

  const upiLink = `upi://pay?pa=${ADMIN_UPI_HANDLE}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${totalPayable}&cu=INR&tn=Booking for ${appointment.doctor_name}`;
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=200`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="bg-teal-600 p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Pay & Confirm</h2>
          <p className="text-teal-100 text-sm">Dr. {appointment.doctor_name} accepted your request!</p>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2"><span>Dr. Fee</span><span>₹{consultationFee}</span></div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2"><span>Platform Fee</span><span>₹{PLATFORM_FEE}</span></div>
            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white"><span>Total Payable</span><span>₹{totalPayable}</span></div>
          </div>
          <div className="bg-white p-2 rounded-xl border-2 border-slate-100 shadow-inner"><img src={qrUrl} alt="Payment QR" className="w-48 h-48" /></div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Scan using any UPI App</p>
            <p className="text-[10px] text-slate-300 mt-1">{ADMIN_UPI_HANDLE}</p>
          </div>
          <a href={upiLink} className="text-teal-600 text-sm font-bold hover:underline md:hidden">Click to Pay (Mobile)</a>
          <div className="w-full mt-2">
            <input type="text" placeholder="Enter 12-digit UTR" value={txnId} onChange={(e) => setTxnId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={() => onConfirm(appointment, txnId)} disabled={txnId.length < 4} className="flex-1">Verify UTR</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuccessView = ({ setView }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in">
    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
      <Calendar size={48} />
    </div>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Request Sent!</h1>
    <p className="text-slate-500 dark:text-slate-400 mb-8">
      Your booking request has been sent to the doctor. You will be notified once they approve it.
    </p>
    <div className="space-y-3 w-full">
      <Button onClick={() => setView('dashboard')} className="w-full">Check Status</Button>
      <Button onClick={() => setView('home')} variant="ghost" className="w-full">Back to Home</Button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [doctors, setDoctors] = useState([]); 
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState({ theme: 'light', largeText: false });
  
  const [payingAppt, setPayingAppt] = useState(null);

  // Check for saved user session on initial load
  useEffect(() => {
    (async () => {
      const savedSession = localStorage.getItem('raphal_user_session');
      if (savedSession) {
        try {
          const parsedUser = JSON.parse(savedSession);
          setUser(parsedUser);
        } catch {
          console.error("Invalid session data");
        }
      }
    })();
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    // Keep info notifications slightly longer to read
    const duration = type === 'info' ? 6000 : 4000;
    setTimeout(() => setNotification(null), duration);
  }, []);

  const fetchMyVisits = useCallback(async () => {
    if (user && user.role === 'patient') {
      const { data } = await supabase.from('appointments').select('*').eq('patient_name', user.name).order('id', { ascending: false });
      if (data) setAppointments(data);
    }
  }, [user]);

  // --- SUPABASE REALTIME NOTIFICATIONS ---
  useEffect(() => {
    if (!user) return;

    // Create a unique channel for notifications
    const notificationChannel = supabase.channel('realtime_appointments');

    // 1. Listen for NEW Bookings (Fires for Doctors & Admins)
    notificationChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, (payload) => {
      const newAppt = payload.new;
      
      // Notify Admin
      if (user.role === 'admin') {
        showToast(`New booking request: ${newAppt.patient_name} -> Dr. ${newAppt.doctor_name}`, 'info');
      } 
      // Notify Specific Doctor
      else if (user.role === 'doctor' && user.doctorId === newAppt.doctor_id) {
        showToast(`🔔 New appointment request from ${newAppt.patient_name}!`, 'info');
      }
    });

    // 2. Listen for UPDATES (Fires for Patients when Dr. Accepts/Rejects)
    notificationChannel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload) => {
      const updatedAppt = payload.new;
      
      if (user.role === 'patient' && user.name === updatedAppt.patient_name) {
         if (updatedAppt.status === 'Accepted') {
            showToast(`Good news! Dr. ${updatedAppt.doctor_name} accepted your request. Please pay to confirm.`, 'info');
            fetchMyVisits(); // Auto refresh their dashboard
         } else if (updatedAppt.status === 'Cancelled by Doctor') {
            showToast(`Dr. ${updatedAppt.doctor_name} rejected your booking request.`, 'error');
            fetchMyVisits();
         } else if (updatedAppt.payment_status === 'Verified & Paid') {
            showToast(`Admin verified your payment! Booking Confirmed.`, 'success');
            fetchMyVisits();
         }
      }
    });

    // Subscribe to the channel
    notificationChannel.subscribe();

    // Cleanup on unmount or user change
    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [user, showToast, fetchMyVisits]); // Re-run if user or dependencies change


  useEffect(() => {
    const root = document.documentElement;
    if (appSettings.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    if (appSettings.largeText) root.style.fontSize = '18px';
    else root.style.fontSize = '16px';
  }, [appSettings]);


  const handleLogin = (userData, rememberMe = true) => {
    setUser(userData);
    if (rememberMe) {
      localStorage.setItem('raphal_user_session', JSON.stringify(userData));
    }
    setView('home'); 
    showToast(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('raphal_user_session');
    setView('home');
    setAppointments([]);
    showToast("Logged out successfully.");
  }, [showToast]);

  const secureNavigate = useCallback((targetView) => {
    if (!user) return; 
    setView(targetView);
  }, [user]);


  useEffect(() => {
    (async () => {
      if (user && user.role === 'patient') {
        const { data } = await supabase.from('appointments').select('*').eq('patient_name', user.name).order('id', { ascending: false });
        if (data) setAppointments(data);
      }
    })();
  }, [user, view]);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('doctors').select('*');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, []); 

  // --- NEW BOOKING LOGIC (NO INSTANT PAYMENT) ---
  const initiateBooking = async () => {
    if (!selectedSlot || !selectedDoctor) return;

    // Check if slot taken
    const { data: existing } = await supabase.from('appointments').select('*')
      .eq('doctor_id', selectedDoctor.id).eq('slot', selectedSlot)
      .neq('status', 'Cancelled by Doctor').neq('status', 'Cancelled');

    const isTaken = existing?.some(a => new Date(a.appointment_date).toDateString() === selectedDate.toDateString());

    if (isTaken) {
        showToast("Slot is currently unavailable.", "error");
        return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const bookingPayload = {
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      patient_name: user.name || "Guest",
      slot: selectedSlot,
      appointment_date: selectedDate.toISOString(), 
      status: "Pending Approval", 
      payment_status: "Unpaid",
      amount: selectedDoctor.price,
      utr_retries: 0,
      payment_mode: 'UPI'
    };

    if (user.id && typeof user.id === 'string' && uuidRegex.test(user.id)) bookingPayload.patient_id = user.id;

    const { error } = await supabase.from('appointments').insert(bookingPayload);
    if (error) {
      showToast("Booking request failed: " + error.message, "error");
    } else {
      secureNavigate('success');
    }
  };

  // --- PAYMENT SUBMISSION ---
  const handleSubmitPayment = async (appointment, txnId) => {
    const { error } = await supabase.from('appointments').update({
        status: "Payment Verifying",
        payment_status: "Pending Verification",
        transaction_id: txnId
    }).eq('id', appointment.id);

    setPayingAppt(null);
    if (error) showToast("Error: " + error.message, "error");
    else {
        showToast("Payment sent to Admin for verification!", "info");
        fetchMyVisits();
    }
  };

  // --- CASH FALLBACK LOGIC ---
  const handlePayCash = async (appointment) => {
    if(window.confirm("Do you want to confirm this booking and pay via Cash at the clinic?")) {
        const { error } = await supabase.from('appointments').update({
            status: "Confirmed",
            payment_status: "Cash",
            payment_mode: "Cash"
        }).eq('id', appointment.id);

        if (error) showToast("Error: " + error.message, "error");
        else {
            showToast("Booking Confirmed! Pay at the clinic.");
            fetchMyVisits();
        }
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (user?.role !== 'admin') return; 
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (!error) {
        setDoctors(prev => prev.filter(d => d.id !== id));
        showToast("Doctor removed.");
    }
  };

  if (!user) return (
    <>
      <SEO title="Rapha'l Health - Login" description="Secure login to Rapha'l Health" />
      <Toast notification={notification} onClose={() => setNotification(null)} />
      <LoginView onLogin={handleLogin} showToast={showToast} />
    </>
  );
  
  const renderSettings = showSettings && <SettingsModal onClose={() => setShowSettings(false)} settings={appSettings} setSettings={setAppSettings} />;
  const themeClass = appSettings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';

  if (view === 'profile') {
    return (
      <>
        <SEO title="My Profile | Rapha'l" description="Manage your profile" />
        <Toast notification={notification} onClose={() => setNotification(null)} />
        {renderSettings}
        <div className={`min-h-screen ${themeClass} pb-20 md:pb-0 transition-colors duration-300`}> 
            <div className={`w-full md:max-w-md mx-auto relative shadow-none md:shadow-2xl min-h-screen ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}> 
                <div className="absolute top-4 right-4 z-20"><button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"><Settings size={20}/></button></div>
                <ProfileView user={user} logout={handleLogout} showToast={showToast} />
                {user.role === 'patient' && (
                    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 p-4 flex justify-around items-center z-40 fixed bottom-0 left-0 right-0 w-full md:absolute md:w-full">
                        <button onClick={() => secureNavigate('home')} className="flex flex-col items-center gap-1 text-slate-400"><Zap size={24} /><span className="text-[10px] font-bold">Discover</span></button>
                        <button onClick={() => secureNavigate('search')} className="flex flex-col items-center gap-1 text-slate-400"><Search size={24} /><span className="text-[10px] font-bold">Find</span></button>
                        <button onClick={() => secureNavigate('dashboard')} className="flex flex-col items-center gap-1 text-slate-400"><Calendar size={24} /><span className="text-[10px] font-bold">Visits</span></button>
                        <button onClick={() => secureNavigate('profile')} className="flex flex-col items-center gap-1 text-teal-600"><User size={24} className="fill-current" /><span className="text-[10px] font-bold">Profile</span></button>
                    </div>
                )}
                {user.role === 'doctor' && <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex justify-center w-full z-50"><Button onClick={() => secureNavigate('home')}>Back</Button></div>}
            </div>
        </div>
      </>
    );
  }
  
  if (user.role === 'doctor') {
    return (
        <>
            <SEO title="Doctor Dashboard" description="Manage schedule" />
            <Toast notification={notification} onClose={() => setNotification(null)} />
            {renderSettings}
            <DoctorDashboard user={user} logout={handleLogout} showToast={showToast} />
        </>
    );
  }
  
  if (user.role === 'admin') {
    return (
        <>
            <SEO title="Admin Console" description="Rapha'l Administration" />
            <Toast notification={notification} onClose={() => setNotification(null)} />
            {renderSettings}
            <AdminDashboard doctors={doctors} logout={handleLogout} onDelete={handleDeleteDoctor} />
        </>
    );
  }

  return (
    <>
        <SEO title="Rapha'l Health" description="Book doctors in Nagaland" />
        <Toast notification={notification} onClose={() => setNotification(null)} />
        {renderSettings}
        
        {payingAppt && (
            <PaymentModal appointment={payingAppt} onClose={() => setPayingAppt(null)} onConfirm={handleSubmitPayment} />
        )}

        <div className={`min-h-screen ${themeClass} pb-20 md:pb-0 transition-colors duration-300`}>
        <div className={`w-full md:max-w-md mx-auto min-h-screen relative shadow-none md:shadow-2xl overflow-hidden flex flex-col ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="bg-slate-900 text-[10px] text-slate-500 py-2 px-4 flex justify-between items-center sticky top-0 z-30">
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-teal-500"/> RAPHA'L v14.0 <span className="ml-2 bg-teal-500/20 text-teal-400 px-2 rounded-full flex items-center gap-1"><Bell size={8}/> Realtime Active</span></span>
                <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white"><Settings size={14}/></button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
            {view === 'home' && <HomeView setView={secureNavigate} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
            {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={secureNavigate} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
            {view === 'detail' && <DoctorDetailView doctor={selectedDoctor} setView={secureNavigate} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleBook={initiateBooking} />}
            
            {/* Pass Handlers to Dashboard */}
            {view === 'dashboard' && <DashboardView appointments={appointments} onPayNow={setPayingAppt} onPayCash={handlePayCash} />}
            
            {view === 'success' && <SuccessView setView={secureNavigate} />}
            </div>
            {!['detail', 'success'].includes(view) && (
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-3 flex justify-around items-center z-50 fixed bottom-0 left-0 right-0 w-full md:absolute md:w-full">
                <button onClick={() => secureNavigate('home')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'home' ? 'text-teal-600' : 'text-slate-400'}`}><Zap size={24} className={view === 'home' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Discover</span></button>
                <button onClick={() => secureNavigate('search')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'search' ? 'text-teal-600' : 'text-slate-400'}`}><Search size={24} className={view === 'search' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Find</span></button>
                <button onClick={() => secureNavigate('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-teal-600' : 'text-slate-400'}`}><Calendar size={24} className={view === 'dashboard' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Visits</span></button>
                <button onClick={() => secureNavigate('profile')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'profile' ? 'text-teal-600' : 'text-slate-400'}`}><User size={24} className={view === 'profile' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Profile</span></button>
            </div>
            )}
        </div>
        </div>
    </>
  );
}