import React from 'react';
import { 
  CheckCircle, 
  X, 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Zap, 
  Search, 
  Calendar, 
  User, 
  Shield, 
  Stethoscope, 
  LogOut 
} from 'lucide-react';
import GlobalNavigation from './GlobalNavigation';
import { useTheme } from '../providers/themeContext';

function MobileHeader({
  mobileMenuOpen,
  onToggleMobileMenu,
  unreadCount,
  onOpenNotifications,
}) {
  return (
    <header className="w-full h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-150 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md z-[55] transition-colors duration-250 dark:border-slate-800">
      {/* Left: Hamburger menu toggle */}
      <button
        type="button"
        aria-label="Toggle navigation menu"
        onClick={onToggleMobileMenu}
        className="pressable p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
      >
        {mobileMenuOpen ? <X size={20} strokeWidth={2.2} /> : <Menu size={20} strokeWidth={2.2} />}
      </button>

      {/* Center: App name 'Raphael' */}
      <div className="font-display font-extrabold text-base tracking-widest text-slate-900 dark:text-white uppercase select-none">
        Raphael
      </div>

      {/* Right: Notification bell */}
      <button
        type="button"
        aria-label="View notifications"
        onClick={onOpenNotifications}
        className="pressable p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors relative"
      >
        <Bell size={20} strokeWidth={2.2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[9px] font-black text-white leading-none dark:bg-cyan-500 dark:text-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}

function DesktopSidebar({
  user,
  view,
  setView,
  onLogout,
  onOpenNotifications,
  unreadCount,
}) {
  const { isDark, toggleTheme } = useTheme();

  if (!user) return null;

  // Define sidebar items based on role
  const getSidebarItems = () => {
    switch (user.role) {
      case 'patient':
        return [
          { id: 'home', label: 'Home', icon: Zap, action: () => setView('home') },
          { id: 'search', label: 'Search Doctors', icon: Search, action: () => setView('search') },
          { id: 'dashboard', label: 'My Visits', icon: Calendar, action: () => setView('dashboard') },
          { id: 'profile', label: 'Profile', icon: User, action: () => setView('profile') },
        ];
      case 'doctor':
        return [
          { id: 'doctor_dashboard', label: 'Dashboard', icon: Stethoscope, action: () => setView('doctor_dashboard') },
        ];
      case 'admin':
        return [
          { id: 'admin', label: 'Admin Panel', icon: Shield, action: () => setView('admin') },
        ];
      default:
        return [];
    }
  };

  const items = getSidebarItems();

  return (
    <aside className="w-64 border-r border-slate-150 bg-slate-50/50 dark:bg-slate-900/40 dark:border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Sidebar Header: Branding */}
      <div className="h-16 flex items-center px-6 border-b border-slate-150 dark:border-slate-800 gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-cyan-600 dark:bg-cyan-500 flex items-center justify-center text-white dark:text-slate-950 shadow-sm shadow-cyan-600/10">
          <Stethoscope size={18} strokeWidth={2.2} />
        </div>
        <span className="font-display font-extrabold text-lg tracking-wider text-slate-900 dark:text-white uppercase">
          Raphael
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
        {items.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-250 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
              }`}
            >
              <item.icon size={18} strokeWidth={2.2} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Notifications Item */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white transition-all duration-250"
        >
          <div className="flex items-center gap-3">
            <Bell size={18} strokeWidth={2.2} />
            <span>Notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-cyan-600 dark:bg-cyan-500 dark:text-slate-950 px-2 py-0.5 text-[10px] font-black text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-150 dark:border-slate-800 space-y-4">
        {/* User profile preview */}
        <div className="flex items-center gap-3 px-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
            {user.name ? user.name.replace('Dr. ', '').charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-slate-450 dark:text-slate-500 capitalize truncate">
              {user.role}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex-1 flex items-center justify-center h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun size={18} strokeWidth={2.2} /> : <Moon size={18} strokeWidth={2.2} />}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/45 transition-colors text-xs font-bold"
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function DesktopLayout({
  user,
  view,
  setView,
  onLogout,
  onOpenNotifications,
  unreadCount,
  children,
}) {
  const showSidebar = user && view !== 'login';

  if (!showSidebar) {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {children}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex h-full overflow-hidden">
      <DesktopSidebar
        user={user}
        view={view}
        setView={setView}
        onLogout={onLogout}
        onOpenNotifications={onOpenNotifications}
        unreadCount={unreadCount}
      />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-950">
        {children}
      </div>
    </div>
  );
}

export default function AppShell({
  children,
  notification,
  isCompactNav,
  view,
  user,
  mobileMenuOpen,
  setView,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onOpenNotifications,
  onLogout,
  unreadNotificationCount,
  notificationCenter,
}) {
  const showHeader = user && view !== 'login';

  return (
    <div className="h-[100dvh] min-h-0 app-canvas font-sans text-slate-900 flex justify-center selection:bg-cyan-100 relative overflow-hidden dark:text-slate-100 dark:selection:bg-cyan-400/30">
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
          className="app-shell-toast fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 px-5 py-3 rounded-lg shadow-sm flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300 dark:border-slate-800 dark:bg-slate-950/92 dark:text-slate-50"
        >
          {notification.type === 'error'
            ? <X size={18} strokeWidth={2.2} className="text-red-500" />
            : <CheckCircle size={18} strokeWidth={2.2} className={notification.type === 'info' ? 'text-sky-500' : 'text-emerald-500'} />}
          <span className="text-sm font-bold">{notification.msg}</span>
        </div>
      )}

      <div className={`w-full ${
        isCompactNav 
          ? 'max-w-none' 
          : (user && view !== 'login')
            ? 'sm:max-w-[1200px] sm:rounded-2xl border border-slate-200 dark:border-slate-800'
            : 'sm:max-w-[430px] sm:rounded-2xl border border-slate-200 dark:border-slate-800'
      } bg-white dark:bg-slate-950 h-[100dvh] min-h-0 sm:h-[calc(100dvh-2rem)] ${
        isCompactNav ? '' : 'sm:my-4'
      } relative app-frame overflow-hidden flex flex-col ${
        isCompactNav ? 'aspect-compact' : ''
      }`}>
        
        {isCompactNav && showHeader && (
          <MobileHeader
            mobileMenuOpen={mobileMenuOpen}
            onToggleMobileMenu={onToggleMobileMenu}
            unreadCount={unreadNotificationCount}
            onOpenNotifications={onOpenNotifications}
          />
        )}

        {!isCompactNav ? (
          <DesktopLayout
            user={user}
            view={view}
            setView={setView}
            onLogout={onLogout}
            onOpenNotifications={onOpenNotifications}
            unreadCount={unreadNotificationCount}
          >
            {children}
          </DesktopLayout>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {children}
          </div>
        )}

        {isCompactNav && (
          <GlobalNavigation
            isCompactNav={isCompactNav}
            user={user}
            view={view}
            mobileMenuOpen={mobileMenuOpen}
            setView={setView}
            onToggleMobileMenu={onToggleMobileMenu}
            onCloseMobileMenu={onCloseMobileMenu}
            onOpenNotifications={onOpenNotifications}
            onLogout={onLogout}
            unreadCount={unreadNotificationCount}
          />
        )}
        {notificationCenter}
      </div>
    </div>
  );
}
