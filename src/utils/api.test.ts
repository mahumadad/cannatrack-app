import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────
vi.mock('../config', () => ({
  default: { API_URL: 'http://localhost:3000', SHOPIFY_REDIRECT_URL: 'http://localhost:3000' }
}));

const mockStorage: Record<string, string> = {};
vi.mock('./storage', () => ({
  default: {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; })
  },
  STORAGE_KEYS: {
    USER: 'user',
    ACCESS_TOKEN: 'access_token',
    PREFERENCES: 'preferences'
  }
}));

import api, { updateCsrfToken } from './api';
import storage from './storage';

// ─── Helpers ────────────────────────────────────────────────────
const okResponse = (body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers }
  });

const errorResponse = (status: number, body: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

// ─── Setup / Teardown ───────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  updateCsrfToken('');
  Object.defineProperty(document, 'cookie', { value: '', writable: true, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── api.get ────────────────────────────────────────────────────
describe('api.get', () => {
  it('hace GET con credentials include', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ ok: true }));
    await api.get('/test');
    expect(spy).toHaveBeenCalledWith(
      'http://localhost:3000/test',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('parsea JSON correctamente', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ value: 'abc' }));
    const result = await api.get('/test');
    expect(result).toEqual({ value: 'abc' });
  });

  it('incluye Bearer token desde STORAGE_KEYS', async () => {
    mockStorage['access_token'] = 'token-123';
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
    await api.get('/test');
    const headers = spy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer token-123');
  });

  it('no incluye CSRF en GET', async () => {
    updateCsrfToken('csrf-get');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
    await api.get('/test');
    const headers = spy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['x-csrf-token']).toBeUndefined();
  });
});

// ─── api.post ───────────────────────────────────────────────────
describe('api.post', () => {
  it('envía POST con body y CSRF', async () => {
    updateCsrfToken('csrf-post');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
    await api.post('/test', { data: 1 });
    const call = spy.mock.calls[0][1]!;
    expect(call.method).toBe('POST');
    expect(call.body).toBe(JSON.stringify({ data: 1 }));
    expect((call.headers as Record<string, string>)['x-csrf-token']).toBe('csrf-post');
  });
});

// ─── handleResponse con skipAuthRedirect ────────────────────────
describe('handleResponse (dromedarios)', () => {
  it('actualiza CSRF desde response header', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okResponse({}, { 'x-csrf-token': 'new-csrf' }))
      .mockResolvedValueOnce(okResponse());

    await api.get('/test');
    // Verificar que se usa en siguiente POST
    await api.post('/next', {});
    const postHeaders = spy.mock.calls[1][1]?.headers as Record<string, string>;
    expect(postHeaders['x-csrf-token']).toBe('new-csrf');
  });

  it('guarda token en silent refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({}, { 'x-token-refreshed': 'true', 'x-new-access-token': 'new-tok' })
    );
    await api.get('/test');
    expect(storage.setItem).toHaveBeenCalledWith('access_token', 'new-tok');
  });

  it('lanza error en 503 sin borrar sesión', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      errorResponse(503, { error: 'Down' })
    );
    await expect(api.get('/test')).rejects.toThrow('Down');
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('limpia sesión en 401 (sin skipAuthRedirect)', async () => {
    const locationMock = { pathname: '/dashboard', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true, configurable: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(401, { error: 'Unauth' }));
    await expect(api.get('/test')).rejects.toThrow('Unauth');
    expect(storage.removeItem).toHaveBeenCalledWith('user');
    expect(storage.removeItem).toHaveBeenCalledWith('access_token');
    expect(locationMock.href).toBe('/login');
  });

  it('skipAuthRedirect evita limpiar sesión en 401', async () => {
    const locationMock = { pathname: '/verify', href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true, configurable: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(401, { error: 'No auth' }));
    await expect(api.get('/test', { skipAuthRedirect: true })).rejects.toThrow('No auth');
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(locationMock.href).toBe(''); // no redirect
  });
});

// ─── fetchWithRetry ─────────────────────────────────────────────
describe('fetchWithRetry', () => {
  it('reintenta en TypeError (error de red)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(Object.assign(new Error('net'), { name: 'TypeError' }))
      .mockResolvedValueOnce(okResponse({ ok: true }));

    const result = await api.get('/test');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true });
  });

  it('NO reintenta en 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(503, { error: 'CB' }));
    await expect(api.get('/test')).rejects.toThrow('CB');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('agota 3 intentos y lanza', async () => {
    const err = Object.assign(new Error('fail'), { name: 'TypeError' });
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err);

    await expect(api.get('/test')).rejects.toThrow('fail');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});
