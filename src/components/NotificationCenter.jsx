import React from 'react';
import { X, Bell, Trash2 } from 'lucide-react';
import { triggerHaptic, withHaptic } from '../utils/haptics';
import { shortDate } from '../utils/utils';

export default function NotificationCenter({ open, notifications, onClose, onMarkRead, onMarkAllRead, notificationPermission = 'default', onEnableDeviceNotifications }) {
  const canEnableDeviceNotifications = ['default', 'prompt', 'denied'].includes(notificationPermission);

  return (
    <div className={`pointer-events-none absolute inset-0 z-[80] flex justify-end overflow-hidden transition-all duration-300 ${open ? 'visible' : 'invisible'}`}>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={withHaptic(onClose, 'selection')}
        className={`pointer-events-auto absolute inset-0 bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/55 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      
      <div className={`pointer-events-auto relative h-full w-full max-w-[320px] bg-white border-l border-slate-200 shadow-[0_0_80px_rgba(15,23,42,0.18)] flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-950 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-cyan-700 dark:text-cyan-400" />
            <span className="text-sm font-black text-slate-950 dark:text-white">Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(item => !item.read_at) && (
              <button type="button" onClick={withHaptic(onMarkAllRead, 'warning')} className="pressable flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={16} strokeWidth={2.2} /> Clear all
              </button>
            )}
            <button type="button" onClick={onClose} className="pro-icon-button pressable h-9 w-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white" title="Close notifications"><X size={18} strokeWidth={2.2} /></button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-4 space-y-3 scrollbar-hide flex-1">
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 dark:bg-cyan-950/20 dark:border-cyan-900/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950 dark:text-white">Device alerts</p>
                <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                  {notificationPermission === 'granted'
                    ? 'Browser/app notifications are enabled.'
                    : notificationPermission === 'denied'
                      ? 'Notifications are blocked in this browser.'
                      : 'Enable alerts for booking and payment updates.'}
                </p>
              </div>
              {canEnableDeviceNotifications && (
                <button
                  type="button"
                  onClick={withHaptic(onEnableDeviceNotifications, 'success')}
                  className="pressable shrink-0 rounded-lg bg-slate-950 dark:bg-cyan-500 dark:text-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-cyan-700"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
          {notifications.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 px-4 py-10 text-center">
              <Bell size={32} strokeWidth={2.2} className="mx-auto mb-3 text-slate-300 dark:text-slate-700 animate-in fade-in zoom-in-75 duration-350" />
              <p className="text-sm font-black text-slate-600 dark:text-slate-400">No notifications yet.</p>
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { triggerHaptic('selection'); onMarkRead(item); }}
              className={`pressable w-full rounded-lg border p-4 text-left transition-all ${
                item.read_at
                  ? 'border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                  : 'border-cyan-100 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/20 text-slate-900 dark:text-white shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed">{item.body}</p>
                </div>
                {!item.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />}
              </div>
              <p className="mt-3 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{shortDate(item.created_at)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
