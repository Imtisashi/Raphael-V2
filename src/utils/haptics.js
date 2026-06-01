import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const vibrationPattern = {
  light: 10,
  selection: 8,
  medium: 18,
  heavy: 28,
  success: [8, 35, 12],
  warning: [16, 40, 16],
  error: [34, 40, 34],
};

const nativeImpactStyle = {
  light: ImpactStyle.Light,
  selection: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

export const triggerHaptic = async (pattern = 'light') => {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')) {
      if (pattern === 'selection') {
        await Haptics.selectionChanged();
        return;
      }

      if (pattern === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
        return;
      }

      if (pattern === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      }

      if (pattern === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
        return;
      }

      await Haptics.impact({ style: nativeImpactStyle[pattern] || ImpactStyle.Light });
      return;
    }
  } catch {
    // Fall through to the browser vibration fallback.
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(vibrationPattern[pattern] || vibrationPattern.light);
    }
  } catch {
    // Haptics are enhancement-only.
  }
};

export const withHaptic = (handler, pattern = 'light') => (event) => {
  if (event?.currentTarget?.disabled) return undefined;
  triggerHaptic(pattern);
  return handler?.(event);
};
