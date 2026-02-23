import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import storage, { STORAGE_KEYS } from '../utils/storage';
import styles from './Auth.module.css';

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Faltan parametros de autenticacion',
  invalid_state: 'Sesion de autenticacion invalida',
  expired_state: 'La sesion de autenticacion expiro',
  token_exchange_failed: 'Error al obtener credenciales de Shopify',
  invalid_nonce: 'Verificacion de seguridad fallida',
  signup_failed: 'Error al crear cuenta',
  profile_failed: 'Error al crear perfil',
  session_failed: 'Error al crear sesion',
  server_error: 'Error del servidor'
};

/**
 * Parse hash fragment tokens from Supabase magic link redirect.
 * Supabase redirects to: {site_url}#access_token=...&refresh_token=...&type=magiclink
 */
function parseHashTokens(): { access_token: string; refresh_token: string } | null {
  const hash = window.location.hash.substring(1); // Remove #
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (access_token && refresh_token) {
    return { access_token, refresh_token };
  }
  return null;
}

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>('');
  // Ref para evitar doble ejecucion en React StrictMode (el codigo one-time solo se puede usar una vez)
  const exchangeCalledRef = useRef(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const codeParam = searchParams.get('code');
    const redirectPath = searchParams.get('redirect') || '/dashboard';

    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] || 'Error desconocido');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Evitar que StrictMode ejecute el exchange dos veces
    if (exchangeCalledRef.current) return;

    // 1. Check for magic link tokens in hash fragment
    const hashTokens = parseHashTokens();
    if (hashTokens) {
      exchangeCalledRef.current = true;
      // Clear hash from URL to avoid re-processing
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      (async () => {
        try {
          const data = await api.post('/api/auth/verify-magiclink', hashTokens, { skipAuthRedirect: true });

          if (!data.user) {
            throw new Error('Error al procesar magic link');
          }

          storage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
          if (data.access_token) {
            storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
          }

          // Redirigir a onboarding si el usuario no lo ha completado
          if (data.user.onboarding_completed === false) {
            navigate('/onboarding');
            return;
          }

          navigate(redirectPath);
        } catch (err) {
          console.error('[AuthCallback] Magic link error:', err);
          setError('Magic link invalido o expirado');
          setTimeout(() => navigate('/login'), 3000);
        }
      })();
      return;
    }

    // 2. Shopify OAuth code exchange
    if (codeParam) {
      exchangeCalledRef.current = true;
      (async () => {
        try {
          const data = await api.post('/api/auth/exchange-code', { code: codeParam }, { skipAuthRedirect: true });

          if (!data.user) {
            throw new Error('Error al procesar autenticacion');
          }

          // Guardar datos de usuario (no-sensibles) en localStorage
          storage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
          // Guardar token para produccion cross-origin (Bearer fallback)
          if (data.access_token) {
            storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
          }

          navigate(redirectPath);
        } catch (err) {
          console.error('[AuthCallback] Error:', err);
          setError('Error procesando la autenticacion');
          setTimeout(() => navigate('/login'), 3000);
        }
      })();
    } else {
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <img
          src="/logo-camellos.png"
          alt="Camellos & Dromedarios"
          className={styles.logo}
        />
        {error ? (
          <>
            <div className={styles.error}>{error}</div>
            <p className={styles.subtitle}>Redirigiendo al login...</p>
          </>
        ) : (
          <p className={styles.subtitle}>Iniciando sesion...</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
