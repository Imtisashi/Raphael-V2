import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Loader2, CheckCircle } from 'lucide-react';
import AppShell from './components/AppShell';
import NotificationCenter from './components/NotificationCenter';
import LandingView from './views/LandingView';
import LoginScreen from './views/LoginView';
import AdminDashboard from './views/AdminDashboardView';
import DoctorDashboard from './views/DoctorDashboardView';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import DoctorDetailView from './views/DoctorDetailView';
import DashboardView from './views/DashboardView';
import ProfileView from './views/ProfileView';
import { Button } from './components/ui/sharedComponents';
import { hasSupabaseConfig, supabase, supabaseConfigStatus } from './lib/supabaseClient';
import { triggerHaptic } from './utils/haptics';
import { routeForRole } from './utils/navigation';
import appIcon from '../icons/icon-128.webp';

import {
  DEFAULT_PLATFORM_FEE_PERCENT, PUSH_CHANNEL_ID,
  formatDate, friendlyNetworkError,
  dispatchPushNotifications,
  uniqueSpecialties, getStoredDeviceId, disableStoredPushDevice,
  USER_PROFILE_FIELDS, notifyDevice, withTimeout, loadUserProfile, saveUserProfile,
  nextBookableDateForDoctor, decorateDoctor, mergeDoctors, browserTimeZone,
  doctorCanBookDate, fetchAppointmentEventsFor, cleanUtr, paymentReceiverFor,
  numericAmount, ADMIN_NAME, normalizeEmail
} from './utils/utils';

const APP_ICON = appIcon;

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const viewRef = React.useRef(view);
  const selectedDoctorRef = React.useRef(selectedDoctor);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { selectedDoctorRef.current = selectedDoctor; }, [selectedDoctor]);
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => {
     if (typeof window !== 'undefined' && 'Notification' in window) return Notification.permission;
     return Capacitor.isNativePlatform() ? 'prompt' : 'unsupported';
  });
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [platformFeePercent, setPlatformFeePercent] = useState(DEFAULT_PLATFORM_FEE_PERCENT);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
     width: typeof window === 'undefined' ? 430 : window.innerWidth,
     height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const unreadNotificationCount = notifications.filter(item => !item.read_at).length;
  const isCompactNav = viewport.width < 560 || (viewport.width / Math.max(viewport.height, 1)) < 0.72;

  const showToast = useCallback((msg, type='success') => {
     triggerHaptic(type === 'error' ? 'error' : type === 'info' ? 'selection' : 'success');
     setNotification({msg, type});
     setTimeout(() => setNotification(null), 3500);
  }, []);

  const enableDeviceNotifications = useCallback(async () => {
     try {
        if (Capacitor.isNativePlatform()) {
           let granted = false;
           if (Capacitor.isPluginAvailable('LocalNotifications')) {
              const localPermission = await LocalNotifications.requestPermissions();
              granted = localPermission.display === 'granted';
           }
           if (Capacitor.isPluginAvailable('PushNotifications')) {
              const pushPermission = await PushNotifications.requestPermissions();
              granted = granted || pushPermission.receive === 'granted';
              if (pushPermission.receive === 'granted') await PushNotifications.register().catch(() => undefined);
           }
           setNotificationPermission(granted ? 'granted' : 'denied');
           showToast(granted ? 'Device notifications enabled.' : 'Notifications were not enabled.', granted ? 'success' : 'error');
           return;
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
           const permission = await Notification.requestPermission();
           setNotificationPermission(permission);
           showToast(permission === 'granted' ? 'Browser notifications enabled.' : 'Notifications were not enabled.', permission === 'granted' ? 'success' : 'error');
           return;
        }

        setNotificationPermission('unsupported');
        showToast('This browser does not support notifications.', 'error');
     } catch {
        showToast('Unable to enable notifications on this device.', 'error');
     }
  }, [showToast]);

  useEffect(() => {
     const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
     handleResize();
     window.addEventListener('resize', handleResize);
     window.addEventListener('orientationchange', handleResize);
     return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
     };
  }, []);

  useEffect(() => {
     setMobileMenuOpen(false);
  }, [view, user?.role]);

  const fetchDoctors = useCallback(async () => {
     if (!supabase) {
        setDoctors([]);
        return;
     }

     try {
        const { data, error } = await supabase
          .from('doctors')
          .select()
          .order('created_at', { ascending: false });
        if (error) throw error;
        const doctorRows = data || [];
        const doctorIds = doctorRows.map(doctor => doctor.id).filter(Boolean);
        let schedulesByDoctor = new Map();

        if (doctorIds.length) {
          const { data: scheduleRows, error: scheduleError } = await supabase
            .from('doctor_working_dates')
            .select('id, doctor_id, work_date, slots, is_available')
            .in('doctor_id', doctorIds)
            .eq('is_available', true)
            .gte('work_date', formatDate(new Date()))
            .order('work_date', { ascending: true });

          if (scheduleError && !['42P01', 'PGRST205'].includes(scheduleError.code)) throw scheduleError;
          schedulesByDoctor = (scheduleRows || []).reduce((map, row) => {
            const key = String(row.doctor_id);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
            return map;
          }, new Map());
        }

        setDoctors(mergeDoctors(doctorRows.map(doctor => decorateDoctor(doctor, schedulesByDoctor.get(String(doctor.id)) || []))));
     } catch (err) {
        setDoctors([]);
        showToast(friendlyNetworkError(err, 'Unable to load doctors.'), 'error');
     }
  }, [showToast]);

  const fetchPlatformFeePercent = useCallback(async () => {
     if (!supabase) {
        setPlatformFeePercent(DEFAULT_PLATFORM_FEE_PERCENT);
        return;
     }

     try {
        const { data, error } = await supabase.rpc('platform_fee_percent');
        if (error) throw error;
        const nextFee = Number(data);
        setPlatformFeePercent(Number.isFinite(nextFee) ? nextFee : DEFAULT_PLATFORM_FEE_PERCENT);
     } catch {
        setPlatformFeePercent(DEFAULT_PLATFORM_FEE_PERCENT);
     }
  }, []);

  useEffect(() => {
     let active = true;

     const loadData = async (sessionUser) => {
        if (!sessionUser) {
           if (active) {
              setUser(null);
              // Instead of redirecting to login screen automatically, default to landing homepage or let guests stay in search/detail.
              if (viewRef.current !== 'login' && viewRef.current !== 'search' && viewRef.current !== 'detail') setView('landing');
              setLoadingAuth(false);
           }
           return;
        }

        try {
           const profile = await loadUserProfile(sessionUser);
           if (profile && active) {
              setUser(profile);
              if (profile.role === 'patient' && selectedDoctorRef.current) {
                 setView('detail');
              } else {
                 setView(routeForRole(profile.role));
              }
              fetchDoctors();
           }
        } catch (err) {
           if (active) {
              showToast(err.message || 'Unable to load your profile.', 'error');
              setUser(null);
              if (viewRef.current !== 'search' && viewRef.current !== 'detail') setView('landing');
           }
        }
        if (active) setLoadingAuth(false);
     };

     fetchDoctors();
     fetchPlatformFeePercent();

     if (!supabase) {
        setLoadingAuth(false);
        return () => { active = false; };
     }

     withTimeout(supabase.auth.getSession(), 2500)
       .then(({ data: { session } }) => {
          if (active) loadData(session?.user);
       })
       .catch(() => {
          if (active) {
             setLoadingAuth(false);
             if (viewRef.current !== 'search' && viewRef.current !== 'detail' && viewRef.current !== 'login') setView('landing');
          }
       });

     const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (active) loadData(session?.user);
     });
     
     return () => { 
        active = false; 
        subscription.unsubscribe(); 
     };
  }, [fetchDoctors, fetchPlatformFeePercent, showToast]);

  const fetchPatientAppointments = useCallback(async () => {
     if (user?.id) {
        if (!supabase) {
           setAppointments([]);
           setAppointmentEvents({});
           return;
        }

        try {
           const { data, error } = await supabase.from('appointments').select().eq('patient_id', user.id).order('created_at', { ascending: false });
           if (error) throw error;
           const rows = data || [];
           setAppointments(rows);
           try {
             setAppointmentEvents(await fetchAppointmentEventsFor(rows.map(appointment => appointment.id)));
           } catch {
             setAppointmentEvents({});
           }
        } catch (err) {
           setAppointments([]);
           setAppointmentEvents({});
           showToast(friendlyNetworkError(err, 'Unable to load appointments.'), 'error');
        }
     }
  }, [showToast, user]);

  const fetchNotifications = useCallback(async () => {
     if (!user?.id || !supabase) {
        setNotifications([]);
        return;
     }

     try {
        const { data, error } = await supabase
          .from('notifications')
          .select()
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(40);
        if (error) throw error;
        setNotifications(data || []);
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to load notifications.'), 'error');
     }
  }, [showToast, user]);

  useEffect(() => {
     fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
     if (!supabase || !user?.id || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) {
        return undefined;
     }

     let active = true;
     const listenerHandles = [];

     const savePushToken = async (tokenValue) => {
        const token = String(tokenValue || '').trim();
        if (!token || !active) return;

        const now = new Date().toISOString();
        const platform = Capacitor.getPlatform();
        const deviceId = getStoredDeviceId();
        await supabase
          .from('device_tokens')
          .update({ enabled: false, updated_at: now })
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
          .neq('token', token);
        const { error } = await supabase
          .from('device_tokens')
          .upsert({
             user_id: user.id,
             token,
             platform,
             device_id: deviceId,
             enabled: true,
             last_seen_at: now,
             updated_at: now,
          }, { onConflict: 'user_id,token' });
        if (error) throw error;

        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id);
     };

     const setupPushNotifications = async () => {
        listenerHandles.push(await PushNotifications.addListener('registration', ({ value }) => {
           savePushToken(value).catch(() => undefined);
        }));
        listenerHandles.push(await PushNotifications.addListener('registrationError', () => undefined));
        listenerHandles.push(await PushNotifications.addListener('pushNotificationReceived', (pushNotification) => {
           if (!active) return;
           showToast(pushNotification.title || 'New booking update', 'info');
           fetchNotifications();
           if (user.role === 'patient') fetchPatientAppointments();
        }));
        listenerHandles.push(await PushNotifications.addListener('pushNotificationActionPerformed', () => {
           if (!active) return;
           setNotificationsOpen(true);
           fetchNotifications();
           if (user.role === 'patient') fetchPatientAppointments();
        }));

        if (Capacitor.getPlatform() === 'android') {
           await PushNotifications.createChannel({
              id: PUSH_CHANNEL_ID,
              name: 'Booking updates',
              description: 'Doctor booking, payment, and payout updates',
              importance: 5,
              visibility: 1,
           }).catch(() => undefined);
        }

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') {
           permission = await PushNotifications.requestPermissions();
        }
        setNotificationPermission(permission.receive === 'granted' ? 'granted' : 'denied');
        if (permission.receive === 'granted') {
           await PushNotifications.register();
        }
     };

     setupPushNotifications().catch(() => undefined);

     return () => {
        active = false;
        listenerHandles.forEach((handle) => handle.remove());
     };
  }, [fetchNotifications, fetchPatientAppointments, showToast, user]);

  useEffect(() => {
     if (!supabase || !user?.id) return undefined;

     const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
           'postgres_changes',
           { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
           (payload) => {
              const nextNotification = payload.new;
              if (!nextNotification) return;
              setNotifications(prev => [nextNotification, ...prev.filter(item => item.id !== nextNotification.id)].slice(0, 40));
              showToast(nextNotification.title, 'info');
              notifyDevice(nextNotification.title, nextNotification.body, APP_ICON);
              if (user.role === 'patient') fetchPatientAppointments();
           }
        )
        .on(
           'postgres_changes',
           { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
           (payload) => {
              const updatedNotification = payload.new;
              if (!updatedNotification) return;
              setNotifications(prev => prev.map(item => item.id === updatedNotification.id ? updatedNotification : item));
           }
        )
        .subscribe();

     return () => {
        supabase.removeChannel(channel);
     };
  }, [fetchPatientAppointments, showToast, user]);

  const markNotificationRead = useCallback(async (item) => {
     if (!item || item.read_at) return;
     const readAt = new Date().toISOString();
     setNotifications(prev => prev.map(notificationItem => (
        notificationItem.id === item.id ? { ...notificationItem, read_at: readAt } : notificationItem
     )));
     if (!supabase) return;
     try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: readAt })
          .eq('id', item.id);
        if (error) throw error;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update notification.'), 'error');
        fetchNotifications();
     }
  }, [fetchNotifications, showToast]);

  const markAllNotificationsRead = useCallback(async () => {
     const unreadIds = notifications.filter(item => !item.read_at).map(item => item.id);
     if (!unreadIds.length) return;
     const readAt = new Date().toISOString();
     setNotifications(prev => prev.map(item => item.read_at ? item : { ...item, read_at: readAt }));
     if (!supabase) return;
     try {
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: readAt })
          .in('id', unreadIds);
        if (error) throw error;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update notifications.'), 'error');
        fetchNotifications();
     }
  }, [fetchNotifications, notifications, showToast]);

  useEffect(() => {
     if (user?.id && user.role === 'patient' && view === 'dashboard') {
        fetchPatientAppointments();
     }
  }, [fetchPatientAppointments, user, view]);

  const handleLogin = (userData) => {
     setUser(userData);
     if (userData.role === 'patient' && selectedDoctor) {
        setView('detail');
     } else {
        setView(routeForRole(userData.role));
     }
  };

  const openDoctorDetail = useCallback((doctor) => {
     const decoratedDoctor = decorateDoctor(doctor);
     setSelectedDoctor(decoratedDoctor);
     setSelectedSlot(null);
     setSelectedDate(nextBookableDateForDoctor(decoratedDoctor) || new Date());
     setView('detail');
  }, []);

  const handleLogout = async () => {
     if (supabase) {
        try {
           await disableStoredPushDevice(user?.id);
           await supabase.auth.signOut();
        } catch {
           // Clear local UI state even if the live sign-out request fails.
        }
     }
     setUser(null);
     setView('landing');
  };

  const handleSaveProfile = async (profilePatch, doctorPatch = null) => {
     if (!user) return null;

     const cleanProfilePatch = Object.fromEntries(
        Object.entries(profilePatch || {}).filter(([, value]) => value !== undefined)
     );

     if (!supabase) {
        showToast('Live backend is not configured.', 'error');
        return null;
     }

     try {
        let updatedProvider = null;
        const { data, error } = await supabase
          .from('users')
          .update(cleanProfilePatch)
          .eq('id', user.id)
          .select(USER_PROFILE_FIELDS)
          .single();
        if (error) throw error;

        if (doctorPatch && user.doctorId) {
           const { data: updatedDoctor, error: doctorError } = await supabase
             .from('doctors')
             .update(doctorPatch)
             .eq('id', user.doctorId)
             .select()
             .single();
           if (doctorError) throw doctorError;
           if (updatedDoctor) {
              updatedProvider = updatedDoctor;
              setDoctors(prev => mergeDoctors([updatedDoctor], prev));
           }
        }

        const savedProfile = { ...user, ...data };
        setUser(savedProfile);
        const needsProviderReview = doctorPatch && updatedProvider?.verification_status === 'pending';
        showToast(needsProviderReview ? 'Profile updated. Admin review is required before patients can book again.' : 'Profile updated.', needsProviderReview ? 'info' : 'success');
        return savedProfile;
     } catch (err) {
        showToast(friendlyNetworkError(err, 'Unable to update profile.'), 'error');
        throw err;
     }
  };

  const initiateBooking = async () => {
     if (!selectedSlot || !selectedDoctor) return;
     if (!user) {
        setView('login');
        showToast("Please log in or register to book this appointment.", "info");
        return;
     }
     if (!doctorCanBookDate(selectedDoctor, selectedDate)) {
          showToast("Choose an available working date before booking.", "error");
          return;
     }
     if (!supabase) {
          showToast("Live backend is not configured.", "error");
          return;
     }

     try {
          const { error } = await supabase.rpc('create_appointment_request', {
            p_doctor_id: selectedDoctor.id,
            p_slot: selectedSlot,
            p_appointment_date: formatDate(selectedDate),
            p_patient_time_zone: browserTimeZone(),
          });
          if (error) throw error;
          showToast("Booking request sent successfully!", "success");
          dispatchPushNotifications();
          setView('success');
     } catch (err) {
          showToast(friendlyNetworkError(err, "Unable to send booking request."), 'error');
     }
  };

  const handlePayCash = async (appt) => {
     if (!supabase) {
          showToast("Live backend is not configured.", "error");
          return;
     }

     try {
          const { error } = await supabase.rpc('submit_appointment_payment', {
            p_appointment_id: appt.id,
            p_payment_mode: 'Cash',
            p_transaction_id: null,
            p_receiver_upi: 'Cash at clinic',
          });
          if (error) throw error;
          showToast("Cash payment request sent for admin verification.", "info");
          dispatchPushNotifications();
          fetchPatientAppointments();
     } catch (err) {
          showToast(friendlyNetworkError(err, "Unable to update payment mode."), "error");
     }
  };

  const handleOpenUpi = async (appt) => {
      let doctor = doctors.find((item) => String(item.id) === String(appt.doctor_id));
      if (!doctor && supabase) {
        try {
          const { data } = await supabase
            .from('doctors')
            .select('name, upi_id')
            .eq('id', appt.doctor_id)
            .maybeSingle();
          doctor = data;
        } catch {
          doctor = null;
        }
      }
      const amount = numericAmount(appt.amount);
      const receiver = paymentReceiverFor(doctor);

      if (!receiver.upi) {
        showToast('No UPI handle is configured for this payment yet.', 'error');
        return;
      }

      const params = new URLSearchParams({
        pa: receiver.upi,
        pn: receiver.name || ADMIN_NAME,
        am: amount.toString(),
        cu: 'INR',
        tn: `Raphael appointment ${appt.id}`,
      });
      window.location.href = `upi://pay?${params.toString()}`;
      showToast(`UPI opened. Submit the UTR after paying ${receiver.type === 'clinic' ? 'the clinic' : 'the doctor'}.`, 'info');
  };

  const handleSubmitPayment = async (appt, utrValue) => {
      const utr = cleanUtr(utrValue);
      if (utr.length < 6) {
        showToast('Enter a valid UTR or transaction ID after paying.', 'error');
        return;
      }

      if (!supabase) {
        showToast("Live backend is not configured.", "error");
        return;
      }

      let doctor = doctors.find((item) => String(item.id) === String(appt.doctor_id));
      if (!doctor) {
        try {
          const { data } = await supabase
            .from('doctors')
            .select('name, upi_id')
            .eq('id', appt.doctor_id)
            .maybeSingle();
          doctor = data;
        } catch {
          doctor = null;
        }
      }
      const receiver = paymentReceiverFor(doctor);
      if (!receiver.upi) {
        showToast('No UPI handle is configured for this payment yet.', 'error');
        return;
      }

      try {
        const { error } = await supabase.rpc('submit_appointment_payment', {
          p_appointment_id: appt.id,
          p_payment_mode: 'UPI',
          p_transaction_id: utr,
          p_receiver_upi: receiver.upi,
        });
        if (error) throw error;
        showToast("UTR submitted. Admin will verify the payment.", "info");
        dispatchPushNotifications();
        fetchPatientAppointments();
      } catch (err) {
        showToast(friendlyNetworkError(err, "Unable to submit payment proof."), "error");
      }
  };

  const doctorProfile = user?.doctorId
    ? doctors.find((doctor) => String(doctor.id) === String(user.doctorId))
    : null;

  useEffect(() => {
     if (!selectedDoctor?.id) return;
     const refreshedDoctor = doctors.find((doctor) => String(doctor.id) === String(selectedDoctor.id));
     if (refreshedDoctor) setSelectedDoctor(refreshedDoctor);
  }, [doctors, selectedDoctor?.id]);

  if (loadingAuth) {
     return (
       <div className="min-h-screen flex items-center justify-center app-canvas">
         <div className="pro-card p-6 flex items-center gap-4 dark:border-slate-800 dark:bg-slate-950">
           <img src={APP_ICON} alt="Rapha'l" className="w-12 h-12 rounded-lg object-cover" />
           <Loader2 className="animate-spin text-cyan-500" size={28} strokeWidth={2.2} />
         </div>
       </div>
     );
  }

  return (
     <AppShell
       notification={notification}
       isCompactNav={isCompactNav}
       view={view}
       user={user}
       mobileMenuOpen={mobileMenuOpen}
       setView={setView}
       onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
       onCloseMobileMenu={() => setMobileMenuOpen(false)}
       onOpenNotifications={() => setNotificationsOpen(true)}
       onLogout={handleLogout}
       unreadNotificationCount={unreadNotificationCount}
       notificationCenter={user ? (
         <NotificationCenter
           open={notificationsOpen}
           notifications={notifications}
           onClose={() => setNotificationsOpen(false)}
           onMarkRead={markNotificationRead}
           onMarkAllRead={markAllNotificationsRead}
           notificationPermission={notificationPermission}
           onEnableDeviceNotifications={enableDeviceNotifications}
         />
       ) : null}
     >
            {view === 'landing' && (
              <LandingView
                setView={setView}
                doctors={doctors}
                setSearchQuery={setSearchQuery}
                onSelectDoctor={openDoctorDetail}
                onLoginClick={() => setView('login')}
              />
            )}
            {view === 'login' && (
              <LoginScreen
                onLogin={handleLogin}
                setView={setView}
                selectedDoctor={selectedDoctor}
                showToast={showToast}
                supabase={supabase}
                hasSupabaseConfig={hasSupabaseConfig}
                supabaseConfigStatus={supabaseConfigStatus}
                loadUserProfile={loadUserProfile}
                saveUserProfile={saveUserProfile}
                normalizeEmail={normalizeEmail}
                friendlyNetworkError={friendlyNetworkError}
                specialtyOptions={uniqueSpecialties()}
                appIcon={APP_ICON}
              />
            )}
            {view === 'admin' && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide app-scroll-region view-panel">
                <AdminDashboard user={user} logout={handleLogout} doctors={doctors} showToast={showToast} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} onDoctorsChanged={fetchDoctors} platformFeePercent={platformFeePercent} onPlatformFeeChanged={setPlatformFeePercent} />
              </div>
            )}
            {view === 'doctor_dashboard' && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide app-scroll-region view-panel">
                <DoctorDashboard user={user} doctor={doctorProfile} logout={handleLogout} showToast={showToast} onSaveProfile={handleSaveProfile} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} onAvailabilityChanged={fetchDoctors} />
              </div>
            )}
            
            {['home', 'dashboard', 'profile', 'success'].includes(view) && user && user.role === 'patient' && (
               <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
                  <div key={view} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide app-scroll-region view-panel">
                     {view === 'home' && <HomeView setView={setView} setSearchQuery={setSearchQuery} doctors={doctors} onSelectDoctor={openDoctorDetail} onOpenNotifications={() => setNotificationsOpen(true)} unreadCount={unreadNotificationCount} />}
                     {view === 'dashboard' && <DashboardView appointments={appointments} appointmentEvents={appointmentEvents} doctors={doctors} onOpenUpi={handleOpenUpi} onSubmitPayment={handleSubmitPayment} onPayCash={handlePayCash} platformFeePercent={platformFeePercent} />}
                     {view === 'profile' && <ProfileView user={user} logout={handleLogout} onSaveProfile={handleSaveProfile} />}
                     {view === 'success' && (
                        <div className="flex flex-col items-center justify-center text-center p-6 h-full app-screen">
                           <div className="pro-card p-8 w-full dark:border-slate-800 dark:bg-slate-950">
                             <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6 mx-auto shadow-xl shadow-emerald-500/20 animate-in zoom-in-75 duration-300"><CheckCircle size={48} strokeWidth={2.2} className="text-white" /></div>
                             <h1 className="text-3xl font-black mb-3 text-slate-950 dark:text-white">Request sent</h1>
                             <p className="text-slate-500 dark:text-slate-400 font-semibold mb-8">Your booking request is waiting for the doctor to approve it.</p>
                             <Button onClick={() => setView('dashboard')} variant="accent" className="w-full mb-3 shadow-none">View Appointments</Button>
                             <Button onClick={() => setView('home')} variant="secondary" className="w-full">Back to Home</Button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}
            {['search', 'detail'].includes(view) && (
               <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
                  <div key={view} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide app-scroll-region view-panel">
                     {view === 'search' && <SearchView searchQuery={searchQuery} setSearchQuery={setSearchQuery} doctors={doctors} setView={setView} onSelectDoctor={openDoctorDetail} activeCategory={activeCategory} setActiveCategory={setActiveCategory} user={user} />}
                     {view === 'detail' && <DoctorDetailView key={selectedDoctor?.id || 'detail'} doctor={selectedDoctor} setView={setView} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleBook={initiateBooking} user={user} />}
                  </div>
               </div>
            )}
     </AppShell>
  );
}
