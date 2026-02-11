import React, { useState, createContext, useContext } from 'react';
import type { ToastContextType, ToastItem } from '../types';
import styles from './Toast.module.css';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType | undefined => useContext(ToastContext);

interface Props {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<Props> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastItem['type'] = 'success', duration: number = 3000): void => {
    const id: number = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const success = (message: string): void => addToast(message, 'success');
  const error = (message: string): void => addToast(message, 'error');
  const info = (message: string): void => addToast(message, 'info');
  const warning = (message: string): void => addToast(message, 'warning');

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            <span className={styles.icon}>
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
              {toast.type === 'warning' && '⚠'}
            </span>
            <span className={styles.message}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
