/**
 * Namespaced localStorage wrapper for the user-facing app.
 * Prevents session conflicts when both admin and user frontends
 * run on localhost in the same browser (they share localStorage).
 */
const PREFIX = 'user_';

const storage = {
  getItem(key: string): string | null {
    return localStorage.getItem(`${PREFIX}${key}`);
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(`${PREFIX}${key}`, value);
  },
  removeItem(key: string): void {
    localStorage.removeItem(`${PREFIX}${key}`);
  }
};

/** Centralized storage key names — avoid magic strings across components */
export const STORAGE_KEYS = {
  USER: 'user',
  ACCESS_TOKEN: 'access_token',
  PREFERENCES: 'preferences',
  RECETA_DISMISSED: 'receta_card_dismissed',
  RECETA_DISMISSED_ID: 'receta_card_dismissed_id',
  OFFLINE_QUEUE: 'offline_queue',
  NOTIFICATIONS_FIRED: 'notificationsFired'
} as const;

export default storage;
