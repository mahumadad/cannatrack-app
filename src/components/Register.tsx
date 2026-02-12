import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import storage, { STORAGE_KEYS } from '../utils/storage';
import styles from './Auth.module.css';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('La contrasena debe incluir mayuscula, minuscula y numero');
      return;
    }

    setLoading(true);

    try {
      const data = await api.post('/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      }, { skipAuthRedirect: true });

      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      navigate('/baseline');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <img
          src="/logo-camellos.webp"
          alt="Camellos & Dromedarios"
          className={styles.logo}
        />

        <h1 className={styles.title}>Crear Cuenta</h1>
        <p className={styles.subtitle}>Unete a Camellos & Dromedarios</p>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Nombre</label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              enterKeyHint="next"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
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
              autoComplete="new-password"
              enterKeyHint="next"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 8 chars, mayuscula, minuscula y numero"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Confirmar Contrasena</label>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              enterKeyHint="go"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repite tu contrasena"
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className={styles.switchAuth}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
