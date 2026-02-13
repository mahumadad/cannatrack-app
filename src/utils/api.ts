import config from '../config';
import storage, { STORAGE_KEYS } from './storage';

const DEFAULT_TIMEOUT: number = 10000;
const MAX_RETRIES: number = 2;
const RETRY_DELAY: number = 1000;

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isRetryable = (error: Error | null, response: Response | null): boolean => {
  if (error?.name === 'TypeError') return true;
  if (error?.name === 'AbortError') return true;
  // 503 = circuit breaker / Supabase down → fail-fast, no reintentar
  // (el backend ya sabe que está caído, reintentar solo acumula carga)
  if (response?.status === 503) return false;
  if (response?.status && response.status >= 500) return true;
  return false;
};

const fetchWithRetry = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeout);

      if (response.ok || !isRetryable(null, response) || attempt === MAX_RETRIES) {
        return response;
      }

      lastResponse = response;
      await sleep(RETRY_DELAY * (attempt + 1));
    } catch (error) {
      clearTimeout(timeout);
      lastError = error as Error;

      if (!isRetryable(error as Error, null) || attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(RETRY_DELAY * (attempt + 1));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError;
};

// CSRF token almacenado en memoria (recibido via response header)
let csrfToken: string | null = null;

// Permite actualizar el token desde fuera (e.g. ProtectedRoute verify)
export const updateCsrfToken = (token: string) => { csrfToken = token; };

const getCsrfToken = (): string | null => {
  // Primero intentar desde memoria, luego fallback a cookie
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// La autenticacion se maneja via cookies httpOnly
// Fallback a Bearer token en localStorage para migracion gradual
const getHeaders = (method: string = 'GET'): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };

  const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }

  // Incluir CSRF token en mutaciones
  if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      h['x-csrf-token'] = csrfToken;
    }
  }

  return h;
};

export interface RequestOptions {
  skipAuthRedirect?: boolean;
}

const handleResponse = async (response: Response, options?: RequestOptions): Promise<any> => {
  // Capturar CSRF token del response header si el servidor lo envía
  const newCsrf = response.headers.get('x-csrf-token');
  if (newCsrf) {
    csrfToken = newCsrf;
  }

  if (response.ok) return response.json();

  // 503 = servicio temporalmente no disponible (Supabase caído / circuit breaker)
  // NO borrar sesión — es un problema de infra, no de auth
  if (response.status === 503) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Servicio temporalmente no disponible');
  }

  // 401 = no autenticado → redirigir a login (excepto en endpoints de auth)
  if (response.status === 401) {
    if (!options?.skipAuthRedirect) {
      storage.removeItem(STORAGE_KEYS.USER);
      storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Credenciales invalidas');
  }

  const err = await response.json().catch(() => ({}));
  throw new Error(err.error || 'Error de conexion');
};

interface ApiClient {
  get: (path: string, options?: RequestOptions) => Promise<any>;
  post: (path: string, body: unknown, options?: RequestOptions) => Promise<any>;
  put: (path: string, body: unknown, options?: RequestOptions) => Promise<any>;
  delete: (path: string, options?: RequestOptions) => Promise<any>;
}

const api: ApiClient = {
  get: async (path: string, options?: RequestOptions): Promise<any> => {
    const response = await fetchWithRetry(`${config.API_URL}${path}`, { headers: getHeaders('GET') });
    return handleResponse(response, options);
  },

  post: async (path: string, body: unknown, options?: RequestOptions): Promise<any> => {
    const response = await fetchWithRetry(`${config.API_URL}${path}`, {
      method: 'POST',
      headers: getHeaders('POST'),
      body: JSON.stringify(body)
    });
    return handleResponse(response, options);
  },

  put: async (path: string, body: unknown, options?: RequestOptions): Promise<any> => {
    const response = await fetchWithRetry(`${config.API_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders('PUT'),
      body: JSON.stringify(body)
    });
    return handleResponse(response, options);
  },

  delete: async (path: string, options?: RequestOptions): Promise<any> => {
    const response = await fetchWithRetry(`${config.API_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders('DELETE')
    });
    return handleResponse(response, options);
  }
};

export default api;
