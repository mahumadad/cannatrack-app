import api from './api';

// VAPID public key — must match the backend's VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

/**
 * Subscribe the current browser to push notifications.
 * Sends the subscription to the backend to store in push_subscriptions table.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID key not configured');
    return false;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push not supported');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Send subscription to backend
    const sub = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      subscription: {
        endpoint: sub.endpoint,
        keys: sub.keys
      },
      role: 'user'
    });

    return true;
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 * Removes the subscription from the backend and browser.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend — use POST since api.delete doesn't support body
      try {
        await api.post('/api/push/unsubscribe', { endpoint });
      } catch {
        // Non-critical: backend cleanup will handle expired subscriptions
      }
    }

    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Check if push notifications are currently subscribed.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}
