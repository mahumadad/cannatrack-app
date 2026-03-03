import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────
vi.mock('./dateHelpers', () => ({
  toLocalDateString: vi.fn(() => '2025-01-15')
}));

const mockStorage: Record<string, string> = {};
vi.mock('./storage', () => ({
  default: {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; })
  },
  STORAGE_KEYS: {
    PREFERENCES: 'preferences',
    NOTIFICATIONS_FIRED: 'notificationsFired'
  }
}));

import {
  requestNotificationPermission,
  getNotificationPermission,
  showNotification,
  startNotificationScheduler,
  stopNotificationScheduler,
  cleanupFiredNotifications
} from './notifications';
import storage from './storage';

// ─── Class-based Notification mock (must be constructable) ──────
let mockPermission: NotificationPermission = 'default';
const mockRequestPermission = vi.fn().mockResolvedValue('granted');
const mockInstances: Array<{ title: string; [key: string]: unknown }> = [];

class MockNotification {
  title: string;
  [key: string]: unknown;

  static get permission() { return mockPermission; }
  static set permission(val: NotificationPermission) { mockPermission = val; }
  static requestPermission = mockRequestPermission;

  constructor(title: string, options: Record<string, unknown> = {}) {
    this.title = title;
    Object.assign(this, options);
    mockInstances.push(this as any);
  }
}

// ─── Setup / Teardown ───────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  mockPermission = 'default';
  mockInstances.length = 0;

  // Install Notification mock
  vi.stubGlobal('Notification', MockNotification);

  // Clean up scheduler
  if ((window as any).__notificationIntervalId) {
    clearInterval((window as any).__notificationIntervalId);
    (window as any).__notificationIntervalId = null;
  }
});

afterEach(() => {
  stopNotificationScheduler();
  vi.restoreAllMocks();
});

// Helper: remove Notification from window entirely
const removeNotification = () => {
  // @ts-ignore - delete to make 'Notification' in window === false
  delete (window as any).Notification;
};

// ─── requestNotificationPermission ──────────────────────────────
describe('requestNotificationPermission', () => {
  it('retorna "unsupported" si Notification no existe', async () => {
    removeNotification();
    const result = await requestNotificationPermission();
    expect(result).toBe('unsupported');
  });

  it('retorna "granted" si ya tiene permiso', async () => {
    mockPermission = 'granted';
    const result = await requestNotificationPermission();
    expect(result).toBe('granted');
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('retorna "denied" si fue denegado', async () => {
    mockPermission = 'denied';
    const result = await requestNotificationPermission();
    expect(result).toBe('denied');
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('solicita permiso si es "default"', async () => {
    mockPermission = 'default';
    mockRequestPermission.mockResolvedValue('granted');
    const result = await requestNotificationPermission();
    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result).toBe('granted');
  });
});

// ─── getNotificationPermission ──────────────────────────────────
describe('getNotificationPermission', () => {
  it('retorna "unsupported" sin Notification API', () => {
    removeNotification();
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('retorna el permiso actual', () => {
    mockPermission = 'granted';
    expect(getNotificationPermission()).toBe('granted');
  });
});

// ─── showNotification ───────────────────────────────────────────
describe('showNotification', () => {
  it('retorna null sin Notification API', () => {
    removeNotification();
    expect(showNotification('Test')).toBeNull();
  });

  it('retorna null sin permiso granted', () => {
    mockPermission = 'denied';
    expect(showNotification('Test')).toBeNull();
  });

  it('crea Notification con opciones default (icon, badge)', () => {
    mockPermission = 'granted';
    showNotification('Mi título', { body: 'mi body' });
    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0].title).toBe('Mi título');
    expect(mockInstances[0].icon).toBe('/logo-camellos.png');
    expect(mockInstances[0].badge).toBe('/logo-camellos.png');
    expect(mockInstances[0].body).toBe('mi body');
  });

  it('retorna instancia de Notification', () => {
    mockPermission = 'granted';
    const n = showNotification('Test');
    expect(n).not.toBeNull();
    expect(n).toBeInstanceOf(MockNotification);
  });
});

// ─── cleanupFiredNotifications ──────────────────────────────────
describe('cleanupFiredNotifications', () => {
  it('conserva solo entradas del día actual', () => {
    // toLocalDateString is mocked to return '2025-01-15'
    mockStorage['notificationsFired'] = JSON.stringify({
      'dose_2025-01-15': true,
      'reflection_2025-01-14': true,
      'dose_2025-01-14': true,
      'reflection_2025-01-15': true
    });

    cleanupFiredNotifications();

    const setItemCall = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: string[]) => c[0] === 'notificationsFired'
    );
    expect(setItemCall).toBeDefined();
    const cleaned = JSON.parse(setItemCall![1]);
    expect(Object.keys(cleaned)).toHaveLength(2);
    expect(cleaned['dose_2025-01-15']).toBe(true);
    expect(cleaned['reflection_2025-01-15']).toBe(true);
    expect(cleaned['dose_2025-01-14']).toBeUndefined();
  });

  it('maneja storage vacío', () => {
    cleanupFiredNotifications();
    const setItemCall = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: string[]) => c[0] === 'notificationsFired'
    );
    expect(setItemCall).toBeDefined();
    const cleaned = JSON.parse(setItemCall![1]);
    expect(Object.keys(cleaned)).toHaveLength(0);
  });
});

// ─── startNotificationScheduler / stopNotificationScheduler ─────
describe('Notification scheduler', () => {
  it('startNotificationScheduler setea interval', () => {
    vi.useFakeTimers();
    mockPermission = 'granted';

    startNotificationScheduler();
    expect((window as any).__notificationIntervalId).not.toBeNull();

    stopNotificationScheduler();
    expect((window as any).__notificationIntervalId).toBeNull();
    vi.useRealTimers();
  });

  it('stopNotificationScheduler limpia interval', () => {
    vi.useFakeTimers();
    (window as any).__notificationIntervalId = setInterval(() => {}, 1000);
    expect((window as any).__notificationIntervalId).not.toBeNull();

    stopNotificationScheduler();
    expect((window as any).__notificationIntervalId).toBeNull();
    vi.useRealTimers();
  });

  it('stopNotificationScheduler no falla si no hay interval', () => {
    (window as any).__notificationIntervalId = null;
    expect(() => stopNotificationScheduler()).not.toThrow();
  });
});
