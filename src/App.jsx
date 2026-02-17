import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient'; 
import { analyzeSymptoms } from './lib/aiLogic'; 
import { generateReceipt } from './utils/pdfGenerator';
// REMOVED external SEO library to fix build error
import LoginView from './components/views/Login';
import HomeView from './components/views/Home';
import SearchView from './components/views/Search';
import DoctorDetailView from './components/views/Detail';
import DashboardView from './components/views/Dashboard';
import DoctorDashboard from './components/views/DoctorDashboard';
import AdminDashboard from './components/views/AdminDashboard';
import ProfileView from './components/views/Profile';
import { CheckCircle, Zap, Search, Calendar, User, LogOut, ShieldCheck, X, AlertCircle, Settings, Sun, Moon, Type, Download } from 'lucide-react';
import Button from './components/ui/Button';

// --- CONFIGURATION ---
// STRICTLY READ FROM ENVIRONMENT VARIABLES
const ADMIN_UPI_HANDLE = import.meta.env.VITE_ADMIN_UPI_HANDLE;
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || "Rapha'l Health Platform";

// --- CUSTOM SEO COMPONENT (No Install Needed) ---
const SEO = ({ title, description }) => {
  useEffect(() => {
    document.title = title;
    
    // Helper to set meta tags safely
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
    setMeta('keywords', 'Raphael Nagaland, Doctor Booking, Kohima, Dimapur');
  }, [title, description]);

  return null;
};

// --- SETTINGS MODAL ---
const SettingsModal = ({ onClose, settings, setSettings }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <Settings className="text-teal-500" size={20} /> Settings
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
             <X size={20} className="text-slate-500 dark:text-slate-400" />
           </button>
        </div>
        
        <div className="space-y-6">
           {/* Theme */}
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Appearance</label>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                 <button 
                   onClick={() => setSettings({...settings, theme: 'light'})} 
                   className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium ${settings.theme === 'light' ? 'bg-white shadow text-teal-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                 >
                   <Sun size={16}/> Light
                 </button>
                 <button 
                   onClick={() => setSettings({...settings, theme: 'dark'})} 
                   className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium ${settings.theme === 'dark' ? 'bg-slate-700 shadow text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                 >
                   <Moon size={16}/> Dark
                 </button>
              </div>
           </div>

           {/* Font Size */}
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Accessibility</label>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2"><Type size={16}/> Larger Text</span>
                 <button 
                   onClick={() => setSettings({...settings, largeText: !settings.largeText})}
                   className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${settings.largeText ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                 >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.largeText ? 'translate-x-6' : ''}`} />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// Global Toast Component
const Toast = ({ notification, onClose }) => {
  if (!notification) return null;
  return (
    <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
      notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'
    }`}>
      {notification.type === 'success' ? <CheckCircle size={20} className="text-green-400 shrink-0" /> : <AlertCircle size={20} className="text-white shrink-0" />}
      <p className="font-semibold text-sm flex-1">{notification.message}</p>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 p-1"><X size={16} /></button>
    </div>
  );
};

// Payment Modal
const PaymentModal = ({ doctor, amount, onClose, onConfirm }) => {
  const [txnId, setTxnId] = useState('');
  
  const PLATFORM_FEE = 50;
  const cleanAmount = amount ? parseInt(amount.toString().replace(/[^0-9]/g, '')) : 0;
  const consultationFee = isNaN(cleanAmount) ? 0 : cleanAmount;
  const totalPayable = consultationFee + PLATFORM_FEE;

  const upiLink = `upi://pay?pa=${ADMIN_UPI_HANDLE}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${totalPayable}&cu=INR&tn=Booking for ${doctor.name}`;
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=200`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="bg-teal-600 p-6 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Confirm Booking</h2>
          <p className="text-teal-100 text-sm">Scan to pay securely</p>
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

          <a href={upiLink} className="text-teal-600 text-sm font-bold hover:underline md:hidden">
            Click to Pay (Mobile)
          </a>

          <div className="w-full mt-2">
            <input 
              type="text" 
              placeholder="Enter 12-digit UTR" 
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-center focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="flex gap-3 w-full mt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button 
              onClick={() => onConfirm(txnId, totalPayable)} 
              disabled={txnId.length < 4} 
              className="flex-1"
            >
              Verify & Book
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Success View with Receipt Download
const SuccessView = ({ selectedDoctor, selectedSlot, selectedDate, setView, lastBooking }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in">
    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
      <CheckCircle size={48} />
    </div>
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Confirmed!</h1>
    <p className="text-slate-500 dark:text-slate-400 mb-8">
      Booked with {selectedDoctor?.name}<br/>
      <span className="font-bold text-teal-600">
        {selectedDate instanceof Date ? selectedDate.toLocaleDateString() : selectedDate} at {selectedSlot}
      </span>
    </p>
    <div className="space-y-3 w-full">
      <Button 
        onClick={() => generateReceipt(lastBooking)} 
        variant="secondary" 
        className="w-full flex items-center justify-center gap-2 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100"
      >
        <Download size={18} /> Download Receipt
      </Button>
      <Button onClick={() => setView('dashboard')} className="w-full">View Appointments</Button>
      <Button onClick={() => setView('home')} variant="ghost" className="w-full">Done</Button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null); 
  const [view, setView] = useState('home');
  const [doctors, setDoctors] = useState([]); 
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [notification, setNotification] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  
  // --- SETTINGS STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState({ theme: 'light', largeText: false });

  // Apply Settings Effect
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    if (appSettings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Text Size
    if (appSettings.largeText) {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [appSettings]);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleLogin = (userData) => {
    const token = Math.random().toString(36).substring(2);
    setSessionToken(token);
    setUser({ ...userData, token });
    setView('home'); 
    showToast(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    setSessionToken(null);
    setView('home');
    setAppointments([]);
    showToast("Logged out successfully.");
  }, [showToast]);

  const secureNavigate = useCallback((targetView) => {
    if (!user) return; 
    setView(targetView);
  }, [user]);

  // Effects
  useEffect(() => {
    if (searchQuery.length > 2) {
      const aiRecommendation = analyzeSymptoms(searchQuery);
      if (aiRecommendation) {
        const timer = setTimeout(() => {
          setActiveCategory(prev => prev === 'All' ? aiRecommendation : prev);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from('doctors').select('*');
      if (data) setDoctors(data);
      if (error) console.error("Error fetching doctors:", error);
    };
    fetchDoctors();
  }, [user, view]); 

  useEffect(() => {
    if (user && user.role === 'patient') {
      const fetchMyVisits = async () => {
        const { data } = await supabase.from('appointments').select('*').eq('patient_name', user.name).order('id', { ascending: false });
        if (data) setAppointments(data);
      };
      fetchMyVisits();
    }
  }, [user, view]);

  // Security: Auto-Logout
  useEffect(() => {
    if (!user) return;
    let inactivityTimer;
    const timeout = 120000;
    const logoutUser = () => {
      handleLogout();
      showToast("Session timed out.", "error");
    };
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(logoutUser, timeout);
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [user, handleLogout, showToast]);

  // -- BOOKING FLOW --
  const initiateBooking = async () => {
    if (!selectedSlot || !selectedDoctor) return;

    // Race Condition Check
    const { data: existing } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', selectedDoctor.id)
      .eq('slot', selectedSlot);

    const isTaken = existing?.some(a => new Date(a.appointment_date).toDateString() === selectedDate.toDateString());

    if (isTaken) {
        showToast("Slot just booked by someone else.", "error");
        setView('search'); 
        setTimeout(() => setView('detail'), 100); 
        return;
    }

    // Always show payment (Platform Fee)
    setShowPayment(true);
  };

  const finalizeBooking = async (txnId = null, totalAmount = null) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const bookingPayload = {
      doctor_id: selectedDoctor.id,
      doctor_name: selectedDoctor.name,
      patient_name: user.name || "Guest",
      slot: selectedSlot,
      appointment_date: selectedDate.toISOString(), 
      status: txnId ? "Payment Verifying" : "Pending",
      payment_status: txnId ? "Pending Verification" : "Pending",
      transaction_id: txnId,
      amount: totalAmount ? `₹${totalAmount}` : selectedDoctor.price
    };

    if (user.id && typeof user.id === 'string' && uuidRegex.test(user.id)) {
        bookingPayload.patient_id = user.id;
    }

    const { data, error } = await supabase.from('appointments').insert(bookingPayload).select().single();

    setShowPayment(false);

    if (error) {
      console.error("Booking Error:", error);
      showToast("Booking failed: " + error.message, "error");
    } else {
      setLastBooking(data);
      secureNavigate('success');
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
  
  // -- SETTINGS MODAL RENDER --
  const renderSettings = showSettings && (
    <SettingsModal 
      onClose={() => setShowSettings(false)} 
      settings={appSettings} 
      setSettings={setAppSettings} 
    />
  );

  // Apply theme classes to main container to ensure settings work
  const themeClass = appSettings.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';

  if (view === 'profile') {
    return (
      <>
        <SEO title="My Profile | Rapha'l" description="Manage your profile" />
        <Toast notification={notification} onClose={() => setNotification(null)} />
        {renderSettings}
        <div className={`min-h-screen ${themeClass} pb-20 md:pb-0 transition-colors duration-300`}> 
            <div className={`w-full md:max-w-md mx-auto relative shadow-none md:shadow-2xl min-h-screen ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}> 
                <div className="absolute top-4 right-4 z-20">
                   <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform"><Settings size={20}/></button>
                </div>
                <ProfileView user={user} logout={handleLogout} showToast={showToast} />
                {user.role === 'patient' && (
                    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 p-4 flex justify-around items-center z-40 fixed bottom-0 left-0 right-0 w-full md:absolute md:w-full">
                        <button onClick={() => secureNavigate('home')} className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"><Zap size={24} /><span className="text-[10px] font-bold">Discover</span></button>
                        <button onClick={() => secureNavigate('search')} className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"><Search size={24} /><span className="text-[10px] font-bold">Find</span></button>
                        <button onClick={() => secureNavigate('dashboard')} className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"><Calendar size={24} /><span className="text-[10px] font-bold">Visits</span></button>
                        <button onClick={() => secureNavigate('profile')} className="flex flex-col items-center gap-1 text-teal-600 dark:text-teal-400"><User size={24} className="fill-current" /><span className="text-[10px] font-bold">Profile</span></button>
                    </div>
                )}
                {user.role === 'doctor' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-center w-full md:absolute md:w-full z-50">
                    <Button onClick={() => secureNavigate('home')}>Back to Dashboard</Button>
                </div>
                )}
            </div>
        </div>
      </>
    );
  }
  
  if (user.role === 'doctor') {
    return (
        <>
            <SEO title="Doctor Dashboard" description="Manage schedule and patients" />
            <Toast notification={notification} onClose={() => setNotification(null)} />
            {renderSettings}
            <DoctorDashboard user={user} logout={handleLogout} setView={setView} showToast={showToast} />
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
        <Toast notification={notification} onClose={() => setNotification(null)} />
        {renderSettings}
        {showPayment && selectedDoctor && (
            <PaymentModal 
                doctor={selectedDoctor} 
                amount={selectedDoctor.price ? selectedDoctor.price.replace(/[^0-9]/g, '') : '0'} 
                onClose={() => setShowPayment(false)} 
                onConfirm={finalizeBooking} 
            />
        )}
        <div className={`min-h-screen ${themeClass} pb-20 md:pb-0 transition-colors duration-300`}>
        <div className={`w-full md:max-w-md mx-auto min-h-screen relative shadow-none md:shadow-2xl overflow-hidden flex flex-col ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="bg-slate-900 text-[10px] text-slate-500 py-2 px-4 flex justify-between items-center select-none sticky top-0 z-30">
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-teal-500"/> RAPHA'L v12.1 LIVE</span>
            <div className="flex items-center gap-3">
               <span className="font-mono opacity-50">{sessionToken ? sessionToken.substring(0, 8) : '...'}...</span>
               <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-white"><Settings size={14}/></button>
            </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
            {view === 'home' && <HomeView setView={secureNavigate} setSearchQuery={setSearchQuery} doctors={doctors} setSelectedDoctor={setSelectedDoctor} />}
            {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={secureNavigate} setSelectedDoctor={setSelectedDoctor} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />}
            {view === 'detail' && (
                <DoctorDetailView 
                doctor={selectedDoctor} 
                setView={secureNavigate} 
                selectedSlot={selectedSlot} 
                setSelectedSlot={setSelectedSlot} 
                selectedDate={selectedDate} 
                setSelectedDate={setSelectedDate} 
                handleBook={initiateBooking} 
                />
            )}
            {view === 'dashboard' && <DashboardView appointments={appointments} />}
            {view === 'success' && <SuccessView selectedDoctor={selectedDoctor} selectedSlot={selectedSlot} selectedDate={selectedDate} setView={secureNavigate} lastBooking={lastBooking} />}
            </div>
            {!['detail', 'success'].includes(view) && (
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 p-3 flex justify-around items-center z-50 fixed bottom-0 left-0 right-0 w-full md:absolute md:w-full">
                <button onClick={() => secureNavigate('home')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'home' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Zap size={24} className={view === 'home' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Discover</span></button>
                <button onClick={() => secureNavigate('search')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'search' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Search size={24} className={view === 'search' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Find</span></button>
                <button onClick={() => secureNavigate('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Calendar size={24} className={view === 'dashboard' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Visits</span></button>
                <button onClick={() => secureNavigate('profile')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'profile' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><User size={24} className={view === 'profile' ? 'fill-current' : ''} /><span className="text-[10px] font-bold">Profile</span></button>
            </div>
            )}
        </div>
        </div>
    </>
  );
}