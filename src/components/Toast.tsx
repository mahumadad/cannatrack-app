import React, { useState, useCallback, createContext, useContext, useRef } from 'react';
import type { ToastContextType, ToastItem } from '../types';
import styles from './Toast.module.css';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType | undefined => useContext(ToastContext);

interface ConfirmState {
  message: string;
  actionLabel: string;
  resolve: (value: boolean) => void;
}

interface Props {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<Props> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmRef = useRef<ConfirmState | null>(null);

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

  const confirm = useCallback((message: string, actionLabel: string = 'Confirmar'): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const state = { message, actionLabel, resolve };
      confirmRef.current = state;
      setConfirmState(state);
    });
  }, []);

  const handleConfirm = (accepted: boolean) => {
    confirmRef.current?.resolve(accepted);
    confirmRef.current = null;
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ success, error, info, warning, confirm }}>
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
      {confirmState && (
        <div className={styles.confirmOverlay} onClick={() => handleConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmMessage}>{confirmState.message}</p>
            <div className={styles.confirmButtons}>
              <button className={styles.confirmCancel} onClick={() => handleConfirm(false)}>Cancelar</button>
              <button className={styles.confirmAccept} onClick={() => handleConfirm(true)}>{confirmState.actionLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
