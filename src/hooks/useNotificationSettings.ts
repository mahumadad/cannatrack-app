import { useState, useEffect } from 'react';
import { requestNotificationPermission, getNotificationPermission, startNotificationScheduler, stopNotificationScheduler } from '../utils/notifications';
import { subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications';
import storage, { STORAGE_KEYS } from '../utils/storage';

interface NotificationPrefs {
  notificationsEnabled: boolean;
  doseNotification: boolean;
  reflectionNotification: boolean;
  protocolNotification: boolean;
}

export interface UseNotificationSettingsReturn extends NotificationPrefs {
  notificationPermission: string;
  handleNotificationToggle: (type: string, value: boolean) => Promise<void>;
}

const savePreferences = (newPrefs: Record<string, any>) => {
  const currentPrefs = JSON.parse(storage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
  const updated = { ...currentPrefs, ...newPrefs };
  storage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
};

export function useNotificationSettings(
  onWarning: (msg: string) => void
): UseNotificationSettingsReturn {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [doseNotification, setDoseNotification] = useState<boolean>(true);
  const [reflectionNotification, setReflectionNotification] = useState<boolean>(true);
  const [protocolNotification, setProtocolNotification] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  // Load saved notification preferences
  useEffect(() => {
    const savedPrefs = JSON.parse(storage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
    if (savedPrefs.notificationsEnabled !== undefined) setNotificationsEnabled(savedPrefs.notificationsEnabled);
    if (savedPrefs.doseNotification !== undefined) setDoseNotification(savedPrefs.doseNotification);
    if (savedPrefs.reflectionNotification !== undefined) setReflectionNotification(savedPrefs.reflectionNotification);
    if (savedPrefs.protocolNotification !== undefined) setProtocolNotification(savedPrefs.protocolNotification);
    setNotificationPermission(getNotificationPermission());
  }, []);

  const handleNotificationToggle = async (type: string, value: boolean) => {
    switch (type) {
      case 'enabled':
        if (value) {
          const permission = await requestNotificationPermission();
          setNotificationPermission(permission);
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            savePreferences({ notificationsEnabled: true });
            startNotificationScheduler();
            // Subscribe to Web Push for background notifications
            subscribeToPush().catch(() => {
              // Non-critical: local notifications still work
            });
          } else {
            onWarning('Notificaciones bloqueadas. Activalas en la configuracion de tu navegador.');
            setNotificationsEnabled(false);
            savePreferences({ notificationsEnabled: false });
          }
        } else {
          setNotificationsEnabled(false);
          savePreferences({ notificationsEnabled: false });
          stopNotificationScheduler();
          // Unsubscribe from Web Push
          unsubscribeFromPush().catch(() => {});
        }
        break;
      case 'dose':
        setDoseNotification(value);
        savePreferences({ doseNotification: value });
        break;
      case 'reflection':
        setReflectionNotification(value);
        savePreferences({ reflectionNotification: value });
        break;
      case 'protocol':
        setProtocolNotification(value);
        savePreferences({ protocolNotification: value });
        break;
    }
  };

  return {
    notificationsEnabled, doseNotification, reflectionNotification,
    protocolNotification, notificationPermission, handleNotificationToggle,
  };
}
