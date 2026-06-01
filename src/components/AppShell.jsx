import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import GlobalNavigation from './GlobalNavigation';

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
  return (
    <div className="h-[100dvh] min-h-0 app-canvas font-sans text-slate-900 flex justify-center selection:bg-cyan-100 relative overflow-hidden dark:text-slate-100 dark:selection:bg-cyan-400/30">
      {notification && (
        <div
          role={notification.type === 'error' ? 'alert' : 'status'}
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
          className="app-shell-toast fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 px-5 py-3 rounded-lg shadow-[0_18px_50px_rgba(15,23,42,0.18)] flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300 dark:border-slate-700 dark:bg-slate-950/92 dark:text-slate-50"
        >
          {notification.type === 'error'
            ? <X size={18} className="text-red-500" />
            : <CheckCircle size={18} className={notification.type === 'info' ? 'text-sky-500' : 'text-emerald-500'} />}
          <span className="text-sm font-bold">{notification.msg}</span>
        </div>
      )}

      <div className={`w-full ${isCompactNav ? 'max-w-none' : 'sm:max-w-[430px]'} bg-white dark:bg-slate-950 h-[100dvh] min-h-0 sm:h-[calc(100dvh-2rem)] ${isCompactNav ? '' : 'sm:my-4'} relative app-frame overflow-hidden flex flex-col ${isCompactNav ? 'aspect-compact' : ''}`}>
        {children}
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
        {notificationCenter}
      </div>
    </div>
  );
}
