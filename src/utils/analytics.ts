import api from './api';

/**
 * Track a user event (fire-and-forget).
 * Never throws — silently swallows errors to not affect UX.
 */
export const trackEvent = (name: string, properties?: Record<string, unknown>): void => {
  api.post('/api/events', { event_name: name, properties })
    .catch(() => {}); // Silently ignore — analytics should never break UX
};
