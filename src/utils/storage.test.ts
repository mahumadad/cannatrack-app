import { describe, it, expect, vi, beforeEach } from 'vitest';
import storage, { STORAGE_KEYS } from './storage';

describe('storage (user namespace)', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
    });
  });

  it('setItem agrega prefijo user_', () => {
    storage.setItem('token', 'abc123');
    expect(localStorage.setItem).toHaveBeenCalledWith('user_token', 'abc123');
  });

  it('getItem busca con prefijo user_', () => {
    mockLocalStorage['user_name'] = 'María';
    const result = storage.getItem('name');
    expect(localStorage.getItem).toHaveBeenCalledWith('user_name');
    expect(result).toBe('María');
  });

  it('getItem retorna null si no existe', () => {
    const result = storage.getItem('nonexistent');
    expect(result).toBeNull();
  });

  it('removeItem elimina con prefijo user_', () => {
    storage.removeItem('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_token');
  });

  it('no colisiona con admin_ keys', () => {
    mockLocalStorage['admin_token'] = 'admin_value';
    mockLocalStorage['user_token'] = 'user_value';

    const result = storage.getItem('token');
    expect(result).toBe('user_value');
  });

  it('maneja JSON stringificado', () => {
    const obj = { id: '123', name: 'Test User' };
    storage.setItem('data', JSON.stringify(obj));
    expect(mockLocalStorage['user_data']).toBe(JSON.stringify(obj));
  });

  it('setItem sobrescribe valor existente', () => {
    storage.setItem('key', 'v1');
    storage.setItem('key', 'v2');
    expect(mockLocalStorage['user_key']).toBe('v2');
  });
});

describe('STORAGE_KEYS', () => {
  it('tiene las keys esperadas', () => {
    expect(STORAGE_KEYS.USER).toBe('user');
    expect(STORAGE_KEYS.ACCESS_TOKEN).toBe('access_token');
    expect(STORAGE_KEYS.PREFERENCES).toBe('preferences');
    expect(STORAGE_KEYS.RECETA_DISMISSED).toBe('receta_card_dismissed');
    expect(STORAGE_KEYS.RECETA_DISMISSED_ID).toBe('receta_card_dismissed_id');
    expect(STORAGE_KEYS.OFFLINE_QUEUE).toBe('offline_queue');
    expect(STORAGE_KEYS.NOTIFICATIONS_FIRED).toBe('notificationsFired');
  });

  it('tiene 7 keys', () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(7);
  });

  it('todos los valores son strings', () => {
    Object.values(STORAGE_KEYS).forEach(v => {
      expect(typeof v).toBe('string');
    });
  });
});
