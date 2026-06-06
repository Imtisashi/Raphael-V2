import React from 'react';
import {
  Bell,
  Calendar,
  LogOut,
  Moon,
  Search,
  Shield,
  Stethoscope,
  Sun,
  User,
  Zap,
} from 'lucide-react';
import { useTheme } from '../providers/themeContext';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { routeForRole } from '../utils/navigation';

const patientNavItems = [
  { id: 'home', icon: Zap, label: 'Home' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'dashboard', icon: Calendar, label: 'Visits' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
];

function MobileCommandMenu({
  open,
  role,
  view,
  setView,
  onClose,
  onOpenNotifications,
  onLogout,
  unreadCount = 0,
}) {
  const { isDark, toggleTheme } = useTheme();
  if (!role) return null;

  const roleHome = routeForRole(role);
  const items = role === 'patient'
    ? [
        { id: 'home', icon: Zap, label: 'Home', action: () => setView('home') },
        { id: 'search', icon: Search, label: 'Search', action: () => setView('search') },
        { id: 'dashboard', icon: Calendar, label: 'Visits', action: () => setView('dashboard') },
        { id: 'profile', icon: User, label: 'Profile', action: () => setView('profile') },
      ]
    : [
        {
          id: roleHome,
          icon: role === 'admin' ? Shield : Stethoscope,
          label: role === 'admin' ? 'Admin' : 'Provider',
          action: () => setView(roleHome),
        },
      ];

  const runAction = (action) => {
    triggerHaptic('selection');
    action();
    onClose();
  };

  return (
    <div className={`pointer-events-none absolute inset-0 z-[70] transition-all duration-300 ${open ? 'visible' : 'invisible'}`}>
      <button
        type="button"
        aria-label="Close menu"
        onClick={withHaptic(onClose, 'selection')}
        className={`pointer-events-auto absolute inset-0 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/55 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      <div className={`mobile-menu-surface pointer-events-auto absolute left-4 right-4 top-16 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950 transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => runAction(item.action)}
            className={`pressable flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors duration-200 ${
              view === item.id
                ? 'bg-slate-950 text-white dark:bg-cyan-400 dark:text-slate-950'
                : 'text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => runAction(onOpenNotifications)}
          className="pressable relative flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
        >
          <Bell size={18} />
          Notifications
          {unreadCount > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => runAction(toggleTheme)}
          className="pressable flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          type="button"
          onClick={() => runAction(onLogout)}
          className="pressable flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

function PatientBottomNavigation({ view, setView, onOpenNotifications, unreadCount = 0 }) {
  return (
    <div className="absolute bottom-0 w-full px-5 pb-5 pt-2 z-40 pointer-events-none">
      <nav
        aria-label="Primary"
        className="nav-glass bg-white/95 backdrop-blur-2xl border border-slate-200 p-2 rounded-xl flex justify-around items-center shadow-[0_20px_50px_rgba(15,23,42,0.14)] pointer-events-auto dark:border-slate-700 dark:bg-slate-950/88"
      >
        {patientNavItems.map((item) => {
          const isActive = view === item.id;
          const handleClick = () => {
            triggerHaptic('selection');
            if (item.id === 'alerts') {
              onOpenNotifications();
              return;
            }
            setView(item.id);
          };

          return (
            <button
              type="button"
              key={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={handleClick}
              className={`pressable relative flex min-h-11 w-16 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-all duration-300 ${
                isActive
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-900/15 dark:bg-cyan-400 dark:text-slate-950'
                  : 'text-slate-500 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-200'
              }`}
            >
              <item.icon size={22} strokeWidth={2.2} className={isActive ? 'animate-in zoom-in-75 duration-200' : ''} />
              {item.id === 'alerts' && unreadCount > 0 && <span className="absolute right-2 top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              <span className="text-[9px] font-extrabold uppercase">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function GlobalNavigation({
  isCompactNav,
  user,
  view,
  mobileMenuOpen,
  setView,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onOpenNotifications,
  onLogout,
  unreadCount,
}) {
  if (!user || view === 'login') return null;

  return (
    <>
      {isCompactNav && (
        <MobileCommandMenu
          open={mobileMenuOpen}
          role={user.role}
          view={view}
          setView={setView}
          onToggle={onToggleMobileMenu}
          onClose={onCloseMobileMenu}
          onOpenNotifications={onOpenNotifications}
          onLogout={onLogout}
          unreadCount={unreadCount}
        />
      )}
      {!isCompactNav && user.role === 'patient' && !['detail', 'success'].includes(view) && (
        <PatientBottomNavigation
          view={view}
          setView={setView}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
        />
      )}
    </>
  );
}
