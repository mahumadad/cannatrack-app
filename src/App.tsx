import React, { Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/Spinner';
import useOnlineStatus from './hooks/useOnlineStatus';
// Eager: first-paint screens (login, register, auth callback)
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
// Lazy: all protected route components — loaded on demand
const Onboarding = React.lazy(() => import('./components/Onboarding'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Reflect = React.lazy(() => import('./components/Reflect'));
const Insights = React.lazy(() => import('./components/Insights'));
const Settings = React.lazy(() => import('./components/Settings'));
const ProtocolConfig = React.lazy(() => import('./components/ProtocolConfig'));
const BaselineForm = React.lazy(() => import('./components/BaselineForm'));
const FollowUp = React.lazy(() => import('./components/FollowUp'));
const ShopifyStore = React.lazy(() => import('./components/ShopifyStore'));
const SolicitudForm = React.lazy(() => import('./components/SolicitudForm'));
const MisSolicitudes = React.lazy(() => import('./components/MisSolicitudes'));
const SolicitudDetalle = React.lazy(() => import('./components/SolicitudDetalle'));
const MisRecetas = React.lazy(() => import('./components/MisRecetas'));
import storage, { STORAGE_KEYS } from './utils/storage';
import api, { updateCsrfToken } from './utils/api';
import { processMutationQueue, getMutationQueueLength } from './utils/offlineQueue';
import config from './config';
import './theme.css';
import './fonts.css';
import './App.css';

/**
 * Root route handler: if the URL has Supabase magic link hash tokens,
 * exchange them for a session via the backend. Otherwise redirect to /dashboard.
 *
 * We process the tokens HERE instead of navigating to /auth/callback because
 * React Router's <Navigate> strips hash fragments from the URL.
 */
const MagicLinkOrDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=') || !hash.includes('refresh_token=')) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Parse tokens from hash fragment
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token || calledRef.current) {
      navigate('/dashboard', { replace: true });
      return;
    }

    calledRef.current = true;
    setProcessing(true);

    // Clear hash from URL
    window.history.replaceState(null, '', window.location.pathname);

    // Exchange tokens with backend
    api.post('/api/auth/verify-magiclink', { access_token, refresh_token }, { skipAuthRedirect: true })
      .then((data: { user?: { id: string; email: string; name?: string; onboarding_completed?: boolean }; access_token?: string }) => {
        if (!data.user) throw new Error('No user returned');
        storage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        if (data.access_token) {
          storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
        }
        // Redirigir a onboarding si no lo ha completado
        if (data.user.onboarding_completed === false) {
          navigate('/onboarding', { replace: true });
          return;
        }
        navigate('/dashboard', { replace: true });
      })
      .catch((err: Error) => {
        console.error('[MagicLink] Error:', err);
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  if (processing) {
    return (
      <Spinner />
    );
  }

  return null;
};

// Verifica token contra el backend antes de renderizar rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');

  const verify = () => {
    setStatus('loading');
    const user = storage.getItem(STORAGE_KEYS.USER);
    if (!user) {
      setStatus('invalid');
      return;
    }

    const headers: Record<string, string> = {};
    const token = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(`${config.API_URL}/api/auth/verify`, {
      credentials: 'include',
      headers
    })
      .then(res => {
        if (res.ok) {
          const csrf = res.headers.get('x-csrf-token');
          if (csrf) updateCsrfToken(csrf);
          // Sync membership data from verify response to localStorage BEFORE mounting children
          res.json().then((data: { user?: { membership_status?: string; membership_started_at?: string | null; membership_expires_at?: string | null } }) => {
            if (data.user) {
              const stored = storage.getItem(STORAGE_KEYS.USER);
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  parsed.membership_status = data.user.membership_status || 'none';
                  parsed.membership_started_at = data.user.membership_started_at || null;
                  parsed.membership_expires_at = data.user.membership_expires_at || null;
                  storage.setItem(STORAGE_KEYS.USER, JSON.stringify(parsed));
                } catch { /* ignore parse errors */ }
              }
            }
            setStatus('valid');
          }).catch(() => {
            setStatus('valid'); // fallback — don't block if json parsing fails
          });
        } else if (res.status === 503) {
          // Supabase caído / circuit breaker — no borrar sesión,
          // mostrar error retryable (no es problema de auth)
          setStatus('error');
        } else {
          storage.removeItem(STORAGE_KEYS.USER);
          storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          setStatus('invalid');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  };

  useEffect(() => {
    verify();
  }, []);

  if (status === 'loading') {
    return (
      <Spinner />
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', color: '#666' }}>No se pudo verificar tu sesión. Revisa tu conexión a internet.</p>
        <button onClick={verify} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', fontSize: '1rem', cursor: 'pointer' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return status === 'valid' ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  // PWA: register SW with periodic update checks
  useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check for new SW version every 60 seconds
        setInterval(() => { registration.update(); }, 60 * 1000);
      }
    },
  });

  // Auto-reload when a new SW takes control (ensures fresh JS/CSS)
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    let reloading = false;
    const onControllerChange = () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    storage.removeItem('theme');
  }, []);

  // Process offline queue when connectivity returns
  useEffect(() => {
    if (isOnline) {
      const pending = getMutationQueueLength();
      if (pending > 0) {
        processMutationQueue(api).then(({ processed }) => {
          setPendingCount(getMutationQueueLength());
          if (processed > 0) {
            // sincronización silenciosa — no loguear en producción
          }
        });
      } else {
        setPendingCount(0);
      }
    } else {
      setPendingCount(getMutationQueueLength());
    }
  }, [isOnline]);

  return (
    <ErrorBoundary>
    <ToastProvider>
      {!isOnline && (
        <div className="offline-banner">
          Sin conexión a internet
          {pendingCount > 0 && (
            <span className="pending-badge"> · {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}
      <Router>
        <Suspense fallback={
          <Spinner />
        }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/reflect" element={<ProtectedRoute><Reflect /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/protocol" element={<ProtectedRoute><ProtocolConfig /></ProtectedRoute>} />
          <Route path="/baseline" element={<ProtectedRoute><BaselineForm /></ProtectedRoute>} />
          <Route path="/followup" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
          <Route path="/store" element={<ProtectedRoute><ShopifyStore /></ProtectedRoute>} />
          <Route path="/store/solicitud" element={<ProtectedRoute><SolicitudForm /></ProtectedRoute>} />
          <Route path="/store/solicitudes" element={<ProtectedRoute><MisSolicitudes /></ProtectedRoute>} />
          <Route path="/store/solicitudes/:id" element={<ProtectedRoute><SolicitudDetalle /></ProtectedRoute>} />
          <Route path="/store/recetas" element={<ProtectedRoute><MisRecetas /></ProtectedRoute>} />
          <Route path="/" element={<MagicLinkOrDashboard />} />
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
