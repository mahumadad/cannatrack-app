import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import styles from './Auth.module.css';
import config from '../config';
import api from '../utils/api';
import storage, { STORAGE_KEYS } from '../utils/storage';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Error en la autenticacion con Shopify',
  invalid_state: 'Sesion invalida, intenta de nuevo',
  expired_state: 'La sesion expiro, intenta de nuevo',
  token_exchange_failed: 'Error al conectar con Shopify',
  invalid_nonce: 'Verificacion de seguridad fallida',
  signup_failed: 'Error al crear cuenta',
  profile_failed: 'Error al crear perfil',
  session_failed: 'Error al crear sesion',
  server_error: 'Error del servidor'
};

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] || 'Error de autenticacion');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/auth/login', formData, { skipAuthRedirect: true });

      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      // Verificar si completo el onboarding
      try {
        const userData = await api.get(`/api/users/${data.user.id}`);
        if (!userData?.onboarding_completed) {
          navigate('/onboarding');
          return;
        }
      } catch {
        // Si falla la verificacion, continuar al dashboard
      }

      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShopifyLogin = () => {
    // Limpiar sesion anterior antes de iniciar OAuth (evita datos residuales)
    storage.removeItem(STORAGE_KEYS.USER);
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    // Usar URL pública (ngrok) para el redirect de Shopify OAuth, no localhost
    window.location.href = `${config.SHOPIFY_REDIRECT_URL}/api/auth/shopify`;
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <img
          src="/logo-camellos.png"
          alt="Camellos & Dromedarios"
          className={styles.logo}
        />

        <h1 className={styles.title}>Iniciar Sesion</h1>
        <p className={styles.subtitle}>Bienvenido de vuelta</p>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Contrasena</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>o</span>
        </div>

        <button
          type="button"
          className={styles.shopifyButton}
          onClick={handleShopifyLogin}
        >
          Iniciar con tu cuenta de cliente
        </button>

        <p className={styles.switchAuth}>
          ¿No tienes cuenta? <Link to="/register">Registrate</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
