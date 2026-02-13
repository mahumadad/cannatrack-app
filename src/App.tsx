import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
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
import { updateCsrfToken } from './utils/api';
import config from './config';
import './theme.css';
import './fonts.css';
import './App.css';

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
          setStatus('valid');
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
    return null;
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
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    storage.removeItem('theme');
  }, []);

  return (
    <ErrorBoundary>
    <ToastProvider>
      {!isOnline && (
        <div className="offline-banner">Sin conexión a internet</div>
      )}
      {needRefresh && (
        <div className="update-banner">
          <span>Nueva versión disponible</span>
          <button onClick={() => updateServiceWorker(true)}>Actualizar</button>
        </div>
      )}
      <Router>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" />} />
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
