import { useState } from 'react';
import { useChangePassword, useCreatePassword } from './queries';

export interface UsePasswordManagementReturn {
  showPasswordModal: boolean;
  setShowPasswordModal: (v: boolean) => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  savingPassword: boolean;
  handlePasswordSubmit: () => Promise<void>;
  openPasswordModal: () => void;
}

export function usePasswordManagement(
  hasPassword: boolean | null,
  onSuccess: (msg: string) => void,
  onWarning: (msg: string) => void,
  onError: (msg: string) => void
): UsePasswordManagementReturn {
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  const changePassword = useChangePassword();
  const createPassword = useCreatePassword();

  const openPasswordModal = () => {
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (hasPassword && !currentPassword) {
      onWarning('Ingresa tu contraseña actual');
      return;
    }
    if (!newPassword || !confirmPassword) {
      onWarning('Completa ambos campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      onWarning('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      onWarning('La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número');
      return;
    }

    setSavingPassword(true);
    try {
      if (hasPassword) {
        await changePassword.mutateAsync({ currentPassword, newPassword });
      } else {
        await createPassword.mutateAsync({ password: newPassword });
      }
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess(hasPassword ? 'Contraseña actualizada' : 'Contraseña creada exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar contraseña';
      onError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return {
    showPasswordModal, setShowPasswordModal,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    savingPassword, handlePasswordSubmit, openPasswordModal,
  };
}
