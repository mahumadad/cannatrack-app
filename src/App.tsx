import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import Dashboard from './components/Dashboard';
import Reflect from './components/Reflect';
import Journal from './components/Journal';
import Insights from './components/Insights';
import Settings from './components/Settings';
import ProtocolConfig from './components/ProtocolConfig';
import BaselineForm from './components/BaselineForm';
import FollowUp from './components/FollowUp';
import ShopifyStore from './components/ShopifyStore';
import SolicitudForm from './components/SolicitudForm';
import MisSolicitudes from './components/MisSolicitudes';
import SolicitudDetalle from './components/SolicitudDetalle';
import MisRecetas from './components/MisRecetas';
import config from './config';
import './theme.css';
import './fonts.css';
import './App.css';

// Verifica token contra el backend antes de renderizar rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      setStatus('invalid');
      return;
    }

    // Verificar token contra el backend
    fetch(`${config.API_URL}/api/auth/verify`, {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) {
          setStatus('valid');
        } else {
          // Token invalido: limpiar localStorage
          localStorage.removeItem('user');
          localStorage.removeItem('access_token');
          setStatus('invalid');
        }
      })
      .catch(() => {
        // Error de red: permitir acceso con datos locales como fallback
        setStatus('valid');
      });
  }, []);

  if (status === 'loading') {
    return null; // O un spinner
  }

  return status === 'valid' ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return (
    <ErrorBoundary>
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/reflect" element={<ProtectedRoute><Reflect /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
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
      </Router>
    </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
