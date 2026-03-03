import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trash, ClipboardText, Bell, BellRinging, User, SignOut, Warning, CaretRight, Phone, MapPin, CalendarBlank, SpinnerGap, Envelope, Lock, Key, Shield } from '@phosphor-icons/react';
import styles from './Settings.module.css';
import { useToast } from './Toast';
import api from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { requestNotificationPermission, getNotificationPermission, startNotificationScheduler, stopNotificationScheduler } from '../utils/notifications';
import storage, { STORAGE_KEYS } from '../utils/storage';
import { useProtocol, useBaseline, useShopifyProfile, useHasPassword, useDeleteProtocol, useChangePassword, useCreatePassword, useCancelMembership } from '../hooks/queries';
import useSwipeBack from '../hooks/useSwipeBack';

import type { User as UserType } from '../types';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [user, setUser] = useState<UserType | null>(null);

  // React Query hooks (enabled once user.id is available)
  const { data: protocol } = useProtocol(user?.id);
  const { data: baseline } = useBaseline(user?.id);
  const { data: shopifyProfile, isLoading: loadingShopify } = useShopifyProfile(user?.id);
  const { data: hasPasswordData } = useHasPassword();
  const hasPassword = hasPasswordData?.hasPassword ?? null;

  // Mutation hooks
  const deleteProtocol = useDeleteProtocol(user?.id);
  const changePassword = useChangePassword();
  const createPassword = useCreatePassword();
  const cancelMembership = useCancelMembership();

  // Cancel membership
  const [showCancelOptions, setShowCancelOptions] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);

  // Preferences
  const [doseReminder, setDoseReminder] = useState<string>('09:00');
  const [reflectionReminder, setReflectionReminder] = useState<string>('21:00');

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [doseNotification, setDoseNotification] = useState<boolean>(true);
  const [reflectionNotification, setReflectionNotification] = useState<boolean>(true);
  useSwipeBack();
  const [protocolNotification, setProtocolNotification] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  // Modals
  const [showEndProtocolModal, setShowEndProtocolModal] = useState<boolean>(false);
  const [showTimeModal, setShowTimeModal] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState<string>('');

  // (Name editing removed — name comes from enrollment and cannot be changed)

  // Password management
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  // Load user from localStorage + saved preferences
  useEffect(() => {
    const userData = JSON.parse(storage.getItem(STORAGE_KEYS.USER) || '{}');
    setUser(userData);

    // Load saved preferences
    const savedPrefs = JSON.parse(storage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
    if (savedPrefs.doseReminder) setDoseReminder(savedPrefs.doseReminder);
    if (savedPrefs.reflectionReminder) setReflectionReminder(savedPrefs.reflectionReminder);
    if (savedPrefs.notificationsEnabled !== undefined) setNotificationsEnabled(savedPrefs.notificationsEnabled);
    if (savedPrefs.doseNotification !== undefined) setDoseNotification(savedPrefs.doseNotification);
    if (savedPrefs.reflectionNotification !== undefined) setReflectionNotification(savedPrefs.reflectionNotification);
    if (savedPrefs.protocolNotification !== undefined) setProtocolNotification(savedPrefs.protocolNotification);
    setNotificationPermission(getNotificationPermission());
  }, []);

  // Sync doseReminder from protocol data
  useEffect(() => {
    if (protocol?.dose_time) setDoseReminder(protocol.dose_time);
  }, [protocol]);

  const savePreferences = (newPrefs: Record<string, any>) => {
    const currentPrefs = JSON.parse(storage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
    const updated = { ...currentPrefs, ...newPrefs };
    storage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
  };

  const handlePasswordSubmit = async () => {
    if (hasPassword && !currentPassword) {
      toast!.warning('Ingresa tu contraseña actual');
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast!.warning('Completa ambos campos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast!.warning('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast!.warning('La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número');
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
      toast!.success(hasPassword ? 'Contraseña actualizada' : 'Contraseña creada exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar contraseña';
      toast!.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEndProtocol = async () => {
    try {
      await deleteProtocol.mutateAsync();
      setShowEndProtocolModal(false);
    } catch {
      toast!.error('Error al terminar protocolo');
    }
  };

  const handleCancelMembership = async () => {
    setCancelling(true);
    try {
      const data = await cancelMembership.mutateAsync();
      setShowCancelModal(false);
      setShowCancelOptions(false);
      // Update local user data
      const updatedUser = { ...user, membership_status: 'cancelled' as const };
      setUser(updatedUser as UserType);
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      qc.invalidateQueries({ queryKey: ['user-record'] });
      const until = (data as Record<string, unknown>)?.activeUntil;
      toast!.success(until
        ? `Membresía cancelada. Acceso activo hasta ${new Date(until as string).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : 'Membresía cancelada');
    } catch (err: unknown) {
      toast!.error(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch (e) {
      // Proceed with local cleanup even if server call fails
    }
    // Limpiar datos de sesión del usuario (namespaced)
    stopNotificationScheduler();
    qc.clear();
    storage.removeItem(STORAGE_KEYS.USER);
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    storage.removeItem(STORAGE_KEYS.PREFERENCES);
    storage.removeItem(STORAGE_KEYS.RECETA_DISMISSED);
    storage.removeItem(STORAGE_KEYS.RECETA_DISMISSED_ID);
    storage.removeItem('notificationsFired');
    storage.removeItem('theme');
    navigate('/login');
  };

  const handleTimeChange = (type: string) => {
    if (type === 'dose') {
      setDoseReminder(tempTime);
      savePreferences({ doseReminder: tempTime });
    } else {
      setReflectionReminder(tempTime);
      savePreferences({ reflectionReminder: tempTime });
    }
    setShowTimeModal(null);
  };

  const handleNotificationToggle = async (type: string, value: boolean) => {
    switch (type) {
      case 'enabled':
        if (value) {
          const permission = await requestNotificationPermission();
          setNotificationPermission(permission);
          if (permission === 'granted') {
            setNotificationsEnabled(true);
            savePreferences({ notificationsEnabled: true });
            startNotificationScheduler();
          } else {
            toast!.warning('Notificaciones bloqueadas. Activalas en la configuracion de tu navegador.');
            setNotificationsEnabled(false);
            savePreferences({ notificationsEnabled: false });
          }
        } else {
          setNotificationsEnabled(false);
          savePreferences({ notificationsEnabled: false });
          stopNotificationScheduler();
        }
        break;
      case 'dose':
        setDoseNotification(value);
        savePreferences({ doseNotification: value });
        break;
      case 'reflection':
        setReflectionNotification(value);
        savePreferences({ reflectionNotification: value });
        break;
      case 'protocol':
        setProtocolNotification(value);
        savePreferences({ protocolNotification: value });
        break;
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
        <h1 className={styles.title}>Mi Perfil</h1>
        <div className={styles.headerSpacer}></div>
      </div>

      <div className={styles.content}>
        {/* Account Section — Profile first */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Cuenta</h2>
          <div className={styles.card}>
            {/* Profile header with avatar */}
            <div className={styles.profileHeader}>
              {shopifyProfile?.imageUrl ? (
                <img
                  src={shopifyProfile.imageUrl}
                  alt="Avatar"
                  className={styles.avatar}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden); }}
                />
              ) : null}
              <div className={`${styles.avatarPlaceholder} ${shopifyProfile?.imageUrl ? styles.hidden : ''}`}>
                <User size={28} weight="bold" />
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>
                  {shopifyProfile?.displayName || user?.name || 'Usuario'}
                </span>
                {shopifyProfile?.creationDate && (
                  <span className={styles.profileSince}>
                    <CalendarBlank size={12} weight="bold" />
                    Cliente desde {new Date(shopifyProfile.creationDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
              {/* Name editing removed — name comes from enrollment */}
            </div>

            {/* Email */}
            <div className={styles.profileDetail}>
              <Envelope size={18} weight="regular" className={styles.detailIcon} />
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Correo electrónico</span>
                <span className={styles.detailValue}>
                  {shopifyProfile?.emailAddress?.emailAddress || user?.email || 'No disponible'}
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className={styles.profileDetail}>
              <Phone size={18} weight="regular" className={styles.detailIcon} />
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Teléfono</span>
                <span className={styles.detailValue}>
                  {shopifyProfile?.phoneNumber?.phoneNumber || 'No registrado'}
                </span>
              </div>
            </div>

            {/* Name details */}
            <div className={styles.profileDetail}>
              <User size={18} weight="regular" className={styles.detailIcon} />
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Nombre</span>
                <span className={styles.detailValue}>
                  {shopifyProfile ? [shopifyProfile.firstName, shopifyProfile.lastName].filter(Boolean).join(' ') || 'No registrado' : user?.name || 'No registrado'}
                </span>
              </div>
            </div>

            {/* Membership */}
            {user?.membership_status && user.membership_status !== 'none' && (
              <div className={styles.profileDetail}>
                <Shield size={18} weight="regular" className={styles.detailIcon} />
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Membresía</span>
                  <div className={styles.membershipInfo}>
                    <span
                      className={`${styles.membershipBadge} ${user.membership_status === 'active' ? styles.membershipActive : user.membership_status === 'pending_payment' ? styles.membershipPending : styles.membershipExpired} ${user.membership_status === 'active' ? styles.membershipBadgeClickable : ''}`}
                      onClick={user.membership_status === 'active' ? () => setShowCancelOptions(!showCancelOptions) : undefined}
                      role={user.membership_status === 'active' ? 'button' : undefined}
                      tabIndex={user.membership_status === 'active' ? 0 : undefined}
                      onKeyDown={user.membership_status === 'active' ? (e) => { if (e.key === 'Enter' || e.key === ' ') setShowCancelOptions(!showCancelOptions); } : undefined}
                    >
                      {user.membership_status === 'active' ? 'Activa' : user.membership_status === 'pending_payment' ? 'Pendiente de pago' : user.membership_status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                    </span>
                    {user.membership_started_at && (
                      <span className={styles.membershipDetail}>
                        Miembro desde {new Date(user.membership_started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                    {user.membership_expires_at && (
                      <span className={styles.membershipDetail}>
                        {user.membership_status === 'active' ? 'Vigente hasta' : 'Venció el'} {new Date(user.membership_expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                    {showCancelOptions && user.membership_status === 'active' && (
                      <button
                        className={styles.cancelMembershipBtn}
                        onClick={() => setShowCancelModal(true)}
                      >
                        Cancelar membresía
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Addresses */}
            {shopifyProfile?.addresses?.nodes && shopifyProfile.addresses.nodes.length > 0 && (
              <div className={styles.profileDetail}>
                <MapPin size={18} weight="regular" className={styles.detailIcon} />
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    {shopifyProfile.addresses.nodes.length === 1 ? 'Dirección' : 'Direcciones'}
                  </span>
                  <div className={styles.addressList}>
                    {shopifyProfile.addresses.nodes.map((addr, i) => (
                      <div key={i} className={styles.addressCard}>
                        {shopifyProfile.defaultAddress?.id === addr.id && (
                          <span className={styles.defaultBadge}>Principal</span>
                        )}
                        <span className={styles.addressLine}>
                          {addr.formatted.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Shopify */}
            {loadingShopify && (
              <div className={styles.profileLoading}>
                <SpinnerGap size={18} weight="bold" className={styles.spinner} />
                <span>Cargando datos...</span>
              </div>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Seguridad</h2>
          <div className={styles.card}>
            <div className={styles.menuItem} onClick={() => { setNewPassword(''); setConfirmPassword(''); setShowPasswordModal(true); }}>
              {hasPassword ? (
                <Key size={24} weight="regular" className={styles.menuIcon} />
              ) : (
                <Lock size={24} weight="regular" className={styles.menuIcon} />
              )}
              <div className={styles.menuContent}>
                <span className={styles.menuTitle}>
                  {hasPassword === false ? 'Crear contraseña' : 'Cambiar contraseña'}
                </span>
                <span className={styles.menuSubtitle}>
                  {hasPassword === false
                    ? 'Agrega una contraseña para iniciar sesión sin Shopify'
                    : 'Actualizar tu contraseña de acceso'}
                </span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>
          </div>
        </div>

        {/* Protocol Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Protocolo</h2>
          <div className={styles.card}>
            <div className={styles.menuItem} onClick={() => navigate('/protocol')}>
              <Clock size={24} weight="regular" className={styles.menuIcon} />
              <div className={styles.menuContent}>
                <span className={styles.menuTitle}>Protocolo</span>
                <span className={styles.menuSubtitle}>{protocol ? 'Modificar protocolo' : 'Crear nuevo protocolo'}</span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>

            {protocol && (
              <div className={styles.menuItem} onClick={() => setShowEndProtocolModal(true)}>
                <Trash size={24} weight="regular" className={styles.menuIcon} />
                <div className={styles.menuContent}>
                  <span className={styles.menuTitleDanger}>Terminar protocolo</span>
                  <span className={styles.menuSubtitle}>Finalizar protocolo actual</span>
                </div>
                <CaretRight size={20} weight="bold" className={styles.menuArrow} />
              </div>
            )}
          </div>
        </div>

        {/* Baseline Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Evaluación</h2>
          <div className={styles.card}>
            <div className={styles.menuItem} onClick={() => navigate('/baseline')}>
              <ClipboardText size={24} weight="regular" className={styles.menuIcon} />
              <div className={styles.menuContent}>
                <span className={styles.menuTitle}>Baseline</span>
                <span className={styles.menuSubtitle}>
                  {baseline ? 'Ver o editar evaluación inicial' : 'Completar evaluación inicial'}
                </span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Preferencias</h2>
          <div className={styles.card}>
            <div className={styles.menuItem} onClick={() => { setTempTime(doseReminder); setShowTimeModal('dose'); }}>
              <Bell size={24} weight="regular" className={styles.menuIcon} />
              <div className={styles.menuContent}>
                <span className={styles.menuTitle}>Recordatorio de dosis</span>
                <span className={styles.menuSubtitle}>{formatTime(doseReminder)}</span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>

            <div className={styles.menuItem} onClick={() => { setTempTime(reflectionReminder); setShowTimeModal('reflection'); }}>
              <BellRinging size={24} weight="regular" className={styles.menuIcon} />
              <div className={styles.menuContent}>
                <span className={styles.menuTitle}>Recordatorio de reflexión</span>
                <span className={styles.menuSubtitle}>{formatTime(reflectionReminder)}</span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Notificaciones</h2>
          <div className={styles.card}>
            <div className={styles.toggleItem}>
              <div className={styles.toggleContent}>
                <span className={styles.toggleTitle}>Activadas</span>
                <span className={styles.toggleSubtitle}>Activar o desactivar todas las notificaciones</span>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={(e) => handleNotificationToggle('enabled', e.target.checked)} 
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleContent}>
                <span className={styles.toggleTitle}>Dosis</span>
                <span className={styles.toggleSubtitle}>Recibir notificación para tomar tu dosis</span>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={doseNotification && notificationsEnabled} 
                  onChange={(e) => handleNotificationToggle('dose', e.target.checked)}
                  disabled={!notificationsEnabled}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleContent}>
                <span className={styles.toggleTitle}>Reflexión</span>
                <span className={styles.toggleSubtitle}>Recibir notificación para hacer tu reflexión</span>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={reflectionNotification && notificationsEnabled} 
                  onChange={(e) => handleNotificationToggle('reflection', e.target.checked)}
                  disabled={!notificationsEnabled}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleContent}>
                <span className={styles.toggleTitle}>Protocolo</span>
                <span className={styles.toggleSubtitle}>Recibir notificación cuando termine tu protocolo</span>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={protocolNotification && notificationsEnabled} 
                  onChange={(e) => handleNotificationToggle('protocol', e.target.checked)}
                  disabled={!notificationsEnabled}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>
          {(notificationPermission === 'denied' || notificationPermission === 'unsupported') && (
            <div className={styles.notificationWarning}>
              <Warning size={18} weight="fill" />
              <span>{notificationPermission === 'unsupported' ? 'Tu navegador no soporta notificaciones.' : 'Las notificaciones estan bloqueadas. Activalas en la configuracion de tu navegador.'}</span>
            </div>
          )}
        </div>

        {/* Logout Section */}
        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.menuItem} onClick={handleLogout}>
              <SignOut size={24} weight="regular" className={styles.menuIcon} />
              <div className={styles.menuContent}>
                <span className={styles.menuTitleDanger}>Cerrar sesión</span>
                <span className={styles.menuSubtitle}>Salir de tu cuenta</span>
              </div>
              <CaretRight size={20} weight="bold" className={styles.menuArrow} />
            </div>
          </div>
        </div>

        {/* Version info */}
        <div className={`${styles.section} ${styles.versionSection}`}>
          <p className={styles.versionText}>
            DromedApp v{__APP_VERSION__}
          </p>
          <p className={styles.buildText}>
            Build: {new Date(__BUILD_DATE__).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* End Protocol Modal */}
      {showEndProtocolModal && (
        <div className={styles.modal} onClick={() => setShowEndProtocolModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Warning size={48} weight="fill" className={styles.modalIcon} />
            <h2>¿Terminar protocolo?</h2>
            <p>Esta acción finalizará tu protocolo actual. Podrás crear uno nuevo cuando quieras.</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowEndProtocolModal(false)}>Cancelar</button>
              <button className={styles.dangerButton} onClick={handleEndProtocol}>Sí, terminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimeModal && (
        <div className={styles.modal} onClick={() => setShowTimeModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{showTimeModal === 'dose' ? 'Recordatorio de dosis' : 'Recordatorio de reflexión'}</h2>
            <input 
              type="time" 
              value={tempTime} 
              onChange={(e) => setTempTime(e.target.value)}
              className={styles.timeInput}
            />
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowTimeModal(null)}>Cancelar</button>
              <button className={styles.confirmButton} onClick={() => handleTimeChange(showTimeModal)}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className={styles.modal} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}</h2>
            {!hasPassword && (
              <p className={styles.modalDescription}>
                Crea una contraseña para poder iniciar sesión directamente sin necesidad de usar Shopify.
              </p>
            )}
            <div className={styles.nameFields}>
              {hasPassword && (
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className={styles.nameInput}
                  autoComplete="current-password"
                />
              )}
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className={styles.nameInput}
                autoComplete="new-password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                className={styles.nameInput}
                autoComplete="new-password"
              />
            </div>
            <p className={styles.passwordHint}>
              Mínimo 8 caracteres, con mayúscula, minúscula y número
            </p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowPasswordModal(false)}>Cancelar</button>
              <button className={styles.confirmButton} onClick={handlePasswordSubmit} disabled={savingPassword}>
                {savingPassword ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Membership Modal */}
      {showCancelModal && (
        <div className={styles.modal} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Warning size={48} weight="fill" className={styles.modalIcon} />
            <h2>¿Cancelar membresía?</h2>
            <p>Mantendrás acceso hasta el fin del periodo actual. Después no podrás realizar pedidos en la tienda.</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowCancelModal(false)}>No, mantener</button>
              <button className={styles.dangerButton} onClick={handleCancelMembership} disabled={cancelling}>
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
