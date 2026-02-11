import { toLocalDateString } from './dateHelpers';
import type {} from '../types';

/**
 * Notification utilities for browser-based reminders.
 * Only works while the app tab is open (no Service Worker).
 */

type NotificationPermissionResult = NotificationPermission | 'unsupported';

export const requestNotificationPermission = async (): Promise<NotificationPermissionResult> => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};

export const getNotificationPermission = (): NotificationPermissionResult => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const showNotification = (title: string, options: NotificationOptions = {}): Notification | null => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  return new Notification(title, {
    icon: '/logo-camellos.png',
    badge: '/logo-camellos.png',
    ...options
  });
};

export const startNotificationScheduler = (): void => {
  stopNotificationScheduler();
  window.__notificationIntervalId = setInterval(checkAndFireNotifications, 30000);
  checkAndFireNotifications();
};

export const stopNotificationScheduler = (): void => {
  if (window.__notificationIntervalId) {
    clearInterval(window.__notificationIntervalId);
    window.__notificationIntervalId = null;
  }
};

interface NotificationPreferences {
  notificationsEnabled?: boolean;
  doseNotification?: boolean;
  doseReminder?: string;
  reflectionNotification?: boolean;
  reflectionReminder?: string;
}

const checkAndFireNotifications = (): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const prefs: NotificationPreferences = JSON.parse(localStorage.getItem('preferences') || '{}');
  if (!prefs.notificationsEnabled) return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayKey = toLocalDateString(now);
  const firedToday: Record<string, boolean> = JSON.parse(localStorage.getItem('notificationsFired') || '{}');

  if (prefs.doseNotification && prefs.doseReminder) {
    const doseKey = `dose_${todayKey}`;
    if (!firedToday[doseKey] && currentTime >= prefs.doseReminder) {
      showNotification('Recordatorio de dosis', {
        body: 'Es hora de tomar tu microdosis',
        tag: 'dose-reminder'
      });
      firedToday[doseKey] = true;
    }
  }

  if (prefs.reflectionNotification && prefs.reflectionReminder) {
    const reflKey = `reflection_${todayKey}`;
    if (!firedToday[reflKey] && currentTime >= prefs.reflectionReminder) {
      showNotification('Recordatorio de reflexion', {
        body: 'Toma un momento para registrar como te sientes',
        tag: 'reflection-reminder'
      });
      firedToday[reflKey] = true;
    }
  }

  localStorage.setItem('notificationsFired', JSON.stringify(firedToday));
};

export const cleanupFiredNotifications = (): void => {
  const todayKey = toLocalDateString();
  const fired: Record<string, boolean> = JSON.parse(localStorage.getItem('notificationsFired') || '{}');
  const cleaned: Record<string, boolean> = {};
  Object.keys(fired).forEach(key => {
    if (key.endsWith(todayKey)) cleaned[key] = fired[key];
  });
  localStorage.setItem('notificationsFired', JSON.stringify(cleaned));
};
