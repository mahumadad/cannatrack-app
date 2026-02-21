import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WeeklyCalendar from './WeeklyCalendar';
import Confetti from './Confetti';
import { useToast } from './Toast';
import { SkeletonCard, SkeletonCalendar } from './Skeleton';
import DoseSection from './DoseSection';
import DayDetailModal from './DayDetailModal';
import BottomNav from './BottomNav';
import { ClipboardText, Notepad, Prescription, X } from '@phosphor-icons/react';
import { INTERNAL_SUBSTANCE } from '../utils/doseOptions';
import { startNotificationScheduler, stopNotificationScheduler, cleanupFiredNotifications } from '../utils/notifications';
import { toLocalDateString } from '../utils/dateHelpers';
import styles from './Dashboard.module.css';
import fieldLabels from '../utils/fieldLabels';
import { useUser } from '../hooks/useUser';
import { useRecetasQuery, useProtocol, useBaseline, useDoses, useFollowUpCurrent, useRandomQuote, useAddDose, useDeleteDose, useDeleteCheckin } from '../hooks/queries';
import storage, { STORAGE_KEYS } from '../utils/storage';
import type { DoseLog, CalendarDay, FollowUpMonthSummary, CustomDoseState, Receta } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast()!;
  const { user } = useUser();

  // React Query hooks
  const { data: protocol, isLoading: loadingProtocol } = useProtocol(user?.id);
  const { data: baseline } = useBaseline(user?.id);
  const { data: recentDoses = [], isLoading: loadingDoses } = useDoses(user?.id, 60);
  const { data: followUpInfo } = useFollowUpCurrent(user?.id);
  const { data: quote } = useRandomQuote();
  const { data: allRecetas = [] } = useRecetasQuery(user?.id);

  // Mutations
  const addDose = useAddDose();
  const deleteDoseMutation = useDeleteDose();
  const deleteCheckinMutation = useDeleteCheckin();

  // Derived loading state
  const loading = loadingProtocol || loadingDoses;

  // Derived dose values
  const today = toLocalDateString(new Date());
  const todayDoses = useMemo(() => recentDoses.filter((d: DoseLog) => toLocalDateString(new Date(d.date)) === today), [recentDoses, today]);
  const lastDose = recentDoses.length > 0 ? recentDoses[0] : null;

  // Local UI state
  const [showDoseModal, setShowDoseModal] = useState<boolean>(false);
  const [showAddDoseModal, setShowAddDoseModal] = useState<boolean>(false);
  const [showDayDetailModal, setShowDayDetailModal] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [customDose, setCustomDose] = useState<CustomDoseState>({ amount: 0.1, unit: 'g' });
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [nextDoseDate, setNextDoseDate] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const recetaActiva = allRecetas.find((r: Receta) => r.estado === 'activa') || null;
  const [recetaCardDismissed, setRecetaCardDismissed] = useState<boolean>(() => {
    return storage.getItem(STORAGE_KEYS.RECETA_DISMISSED) === 'true';
  });

  const isIntuitive = protocol?.frequency === 'intuitive';

  const handleDismissRecetaCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecetaCardDismissed(true);
    storage.setItem(STORAGE_KEYS.RECETA_DISMISSED, 'true');
  };

  // Notification scheduler (mount/unmount)
  useEffect(() => {
    const prefs = JSON.parse(storage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
    if (prefs.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      cleanupFiredNotifications();
      startNotificationScheduler();
    }

    return () => {
      stopNotificationScheduler();
    };
  }, []);

  // Sync customDose when protocol loads
  useEffect(() => {
    if (protocol?.dose && protocol?.unit) {
      setCustomDose({ amount: protocol.dose, unit: protocol.unit });
    }
  }, [protocol]);

  // Sync selectedDay doses when recentDoses changes
  useEffect(() => {
    if (selectedDay && recentDoses.length > 0) {
      setSelectedDay(prev => prev ? { ...prev, doses: recentDoses.filter((d: DoseLog) => toLocalDateString(new Date(d.date)) === prev.dateString) } : prev);
    }
  }, [recentDoses]);

  // Auto-open dose modal from FAB on other pages
  useEffect(() => {
    if (searchParams.get('dose') === '1' && !loading) {
      setShowAddDoseModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading]);


  // Track receta card dismiss state
  useEffect(() => {
    if (recetaActiva) {
      const prevId = storage.getItem(STORAGE_KEYS.RECETA_DISMISSED_ID);
      if (prevId !== recetaActiva.id) {
        setRecetaCardDismissed(false);
        storage.removeItem(STORAGE_KEYS.RECETA_DISMISSED);
      }
      storage.setItem(STORAGE_KEYS.RECETA_DISMISSED_ID, recetaActiva.id);
    }
  }, [recetaActiva?.id]);

  useEffect(() => {
    if (isIntuitive) {
      setNextDoseDate(null);
      return;
    }
    if (protocol) calculateNextDoseDate();
  }, [protocol, todayDoses, recentDoses, isIntuitive]);

  // Countdown timer logic is now self-contained in CountdownTimer component
  // (rendered inside DoseSection), so Dashboard no longer re-renders every second.


  // Calcular dias programados segun protocolo (ciclo fijo desde start_date)
  const getScheduledDays = (): Set<string> => {
    if (!protocol) return new Set();

    // Priorizar start_date del protocolo para calcular el ciclo
    let startDateObj: Date;
    if (protocol.start_date) {
      const parts = protocol.start_date.split('-');
      startDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else if (recentDoses.length > 0) {
      const sorted = [...recentDoses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      startDateObj = new Date(sorted[0].date);
    } else {
      startDateObj = new Date();
    }
    startDateObj.setHours(0, 0, 0, 0);

    const scheduled = new Set<string>();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    const current = new Date(startDateObj);

    switch (protocol.frequency) {
      case 'fadiman':
        while (current <= endDate) {
          scheduled.add(toLocalDateString(current));
          current.setDate(current.getDate() + 3);
        }
        break;
      case 'stamets':
        // Stamets: 4 dias ON, 3 dias OFF
        while (current <= endDate) {
          for (let i = 0; i < 4 && current <= endDate; i++) {
            scheduled.add(toLocalDateString(current));
            current.setDate(current.getDate() + 1);
          }
          current.setDate(current.getDate() + 3); // 3 dias OFF
        }
        break;
      case 'every_x_days': {
        const interval = (protocol.frequency_value as { days: number } | null)?.days || 3;
        while (current <= endDate) {
          scheduled.add(toLocalDateString(current));
          current.setDate(current.getDate() + interval);
        }
        break;
      }
      default:
        while (current <= endDate) {
          scheduled.add(toLocalDateString(current));
          current.setDate(current.getDate() + 1);
        }
    }
    return scheduled;
  };

  const calculateNextDoseDate = () => {
    if (!protocol || isIntuitive) return;

    const scheduledDays = getScheduledDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = toLocalDateString(today);
    const isTodayScheduled = scheduledDays.has(todayStr);
    const hasTakenToday = todayDoses.length > 0;

    const search = new Date(today);
    // Si hoy es dia programado y ya tomo, o si hoy NO es dia programado, buscar desde manana
    if ((isTodayScheduled && hasTakenToday) || !isTodayScheduled) {
      search.setDate(search.getDate() + 1);
    }

    for (let i = 0; i < 14; i++) {
      const dateStr = toLocalDateString(search);
      if (scheduledDays.has(dateStr)) {
        const nextDate = new Date(search);
        if (protocol.dose_time) {
          const [hours, minutes] = protocol.dose_time.split(':');
          nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        setNextDoseDate(nextDate);
        return;
      }
      search.setDate(search.getDate() + 1);
    }

    setNextDoseDate(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day);
    setIsEditMode(false);
    setShowDayDetailModal(true);
  };

  const handleTakeDose = async () => {
    if (!protocol) {
      toast.warning('Primero configura tu protocolo');
      navigate('/protocol');
      return;
    }
    try {
      await addDose.mutateAsync({ userId: user!.id, timestamp: new Date().toISOString(), substance: INTERNAL_SUBSTANCE, dose: protocol.dose, unit: protocol.unit, notes: '' });
      setShowDoseModal(false);
      setShowConfetti(true);
      toast.success('¡Dosis registrada!');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Error al registrar la dosis');
    }
  };

  const handleAddCustomDose = async () => {
    try {
      await addDose.mutateAsync({ userId: user!.id, timestamp: new Date().toISOString(), substance: INTERNAL_SUBSTANCE, dose: parseFloat(String(customDose.amount)), unit: customDose.unit, notes: isIntuitive ? '' : 'Dosis adicional' });
      setShowAddDoseModal(false);
      setShowConfetti(true);
      toast.success('¡Dosis registrada!');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Error al registrar la dosis');
    }
  };

  const handleAddDoseForDay = async () => {
    if (!selectedDay) return;
    try {
      const timestamp = new Date(selectedDay.dateString + 'T12:00:00');
      await addDose.mutateAsync({ userId: user!.id, timestamp: timestamp.toISOString(), substance: INTERNAL_SUBSTANCE, dose: parseFloat(String(customDose.amount)), unit: customDose.unit, notes: 'Dosis manual' });
      toast.success('Dosis agregada');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Error al agregar dosis');
    }
  };

  const handleDeleteDose = async (doseId: string) => {
    if (!await toast.confirm('¿Eliminar esta dosis? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDoseMutation.mutateAsync(doseId);
      toast.info('Dosis eliminada');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    if (!await toast.confirm('¿Eliminar esta reflexión? Esta acción no se puede deshacer.')) return;
    try {
      await deleteCheckinMutation.mutateAsync(checkinId);
      toast.info('Reflexión eliminada');
      setSelectedDay(prev => prev ? { ...prev, checkin: null } : prev);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleEditCheckin = (dateString: string) => {
    setShowDayDetailModal(false);
    navigate(`/reflect?date=${dateString}`);
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getPendingFollowUps = () => {
    if (!followUpInfo?.allMonths) return [];
    return followUpInfo.allMonths.filter(m => !m.isCompleted && m.canComplete);
  };

  const getFollowUpDates = (): string[] => {
    if (!followUpInfo?.allMonths) return [];
    return followUpInfo.allMonths
      .filter((m: FollowUpMonthSummary) => !m.isCompleted && m.dueDate)
      .map((m: FollowUpMonthSummary) => m.dueDate!);
  };

  const getFollowUpCompletedDates = (): string[] => {
    if (!followUpInfo?.allMonths) return [];
    return followUpInfo.allMonths
      .filter((m: FollowUpMonthSummary) => m.isCompleted && m.dueDate)
      .map((m: FollowUpMonthSummary) => m.dueDate!);
  };

  const isFollowUpDue = (): boolean => {
    if (!followUpInfo?.hasDoses) return false;
    const pending = getPendingFollowUps();
    if (pending.length === 0) return false;
    if (followUpInfo.isCompleted && pending.length === 0) return false;
    const daysUntilDue = Math.ceil((new Date(followUpInfo.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 5 && daysUntilDue >= 0;
  };

  const isFollowUpOverdue = (): boolean => {
    if (!followUpInfo?.hasDoses) return false;
    const pending = getPendingFollowUps();
    return pending.length > 0 && new Date() > new Date(followUpInfo.dueDate!);
  };

  const formatNextDoseDate = (): string => {
    if (!nextDoseDate) return '';
    return nextDoseDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }) + ' a las ' + nextDoseDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLastDoseDate = (): string => {
    if (!lastDose) return 'Nunca';
    const date = new Date(lastDose.date);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }) + ' a las ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div className={styles.avatarButton}><span>{userInitial}</span></div>
          <img src="/imagotipo.png" alt="Camellos" className={styles.logo} />
          <div style={{ width: '36px' }} />
        </div>
        <SkeletonCalendar />
        <div style={{ padding: '0 20px' }}><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className={styles.header}>
        <button className={styles.avatarButton} onClick={() => navigate('/settings')}>
          <span>{userInitial}</span>
        </button>
        <img src="/imagotipo.png" alt="Camellos" className={styles.logo} />
        <div style={{ width: '36px' }} />
      </div>

      {(!baseline || !baseline.is_locked) && (
        <div className={styles.taskCard} onClick={() => navigate('/baseline')}>
          <div className={styles.taskCardBorderBaseline} />
          <div className={styles.taskCardContent}>
            <div className={styles.taskCardIcon}><ClipboardText size={28} weight="duotone" /></div>
            <div className={styles.taskCardText}>
              <h3>Completa tu Baseline</h3>
              <p>Evaluación inicial · 9 secciones</p>
            </div>
            <button className={styles.taskCardButton} onClick={(e) => { e.stopPropagation(); navigate('/baseline'); }}>Completar</button>
          </div>
        </div>
      )}

      {(isFollowUpDue() || isFollowUpOverdue()) && (() => {
        const pending = getPendingFollowUps();
        const pendingCount = pending.length;
        return (
          <div className={`${styles.taskCard} ${isFollowUpOverdue() ? styles.taskCardOverdue : ''}`} onClick={() => navigate(`/followup?month=${pending[0]?.monthYear || followUpInfo?.monthYear || ''}`)}>
            <div className={`${styles.taskCardBorderFollowUp} ${isFollowUpOverdue() ? styles.taskCardBorderOverdue : ''}`} />
            <div className={styles.taskCardContent}>
              <div className={styles.taskCardIcon}><Notepad size={28} weight="duotone" /></div>
              <div className={styles.taskCardText}>
                <h3>Follow-up{pendingCount > 1 ? ` (${pendingCount} pendientes)` : ` de ${followUpInfo?.monthName}`}</h3>
                <p>{isFollowUpOverdue() ? 'Atrasado · Completar ahora' : 'Evaluación mensual · 9 secciones'}</p>
              </div>
              <button className={styles.taskCardButton} onClick={(e) => { e.stopPropagation(); navigate(`/followup?month=${pending[0]?.monthYear || followUpInfo?.monthYear || ''}`); }}>{isFollowUpOverdue() ? 'Completar' : 'Ir al Follow-up'}</button>
            </div>
          </div>
        );
      })()}

      {recetaActiva && !recetaCardDismissed && (
        <div className={styles.taskCard} onClick={() => navigate('/store/recetas')} style={{ position: 'relative' }}>
          <div className={styles.taskCardBorderBaseline} />
          <div className={styles.taskCardContent}>
            <div className={styles.taskCardIcon}><Prescription size={28} weight="duotone" /></div>
            <div className={styles.taskCardText}>
              <h3>Mi Receta</h3>
              <p>
                {recetaActiva.saldo_micro > 0 && `Micro: ${recetaActiva.saldo_micro}/${recetaActiva.total_micro_autorizado}`}
                {recetaActiva.saldo_micro > 0 && recetaActiva.saldo_macro > 0 && ' · '}
                {recetaActiva.saldo_macro > 0 && `Macro: ${recetaActiva.saldo_macro}/${recetaActiva.total_macro_autorizado}`}
              </p>
            </div>
            <button className={styles.taskCardButton} onClick={(e) => { e.stopPropagation(); navigate('/store/solicitud'); }}>Pedir</button>
          </div>
          <button
            className={styles.taskCardDismiss}
            onClick={handleDismissRecetaCard}
            aria-label="Ocultar tarjeta de receta"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      <div className={styles.greetingSection}>
        <h1 className={styles.greeting}>{getGreeting()}, {user?.name || 'Usuario'}</h1>
        <p className={styles.quote}>{quote?.text || 'Hoy es un buen día para estar bien'} {quote?.emoji || '🌞'}</p>
      </div>

      <WeeklyCalendar key={refreshKey} userId={user?.id} onDayClick={handleDayClick} refreshKey={refreshKey} followUpDates={getFollowUpDates()} followUpCompletedDates={getFollowUpCompletedDates()} protocol={protocol ?? null} doses={recentDoses} />

      <DoseSection
        protocol={protocol ?? null}
        isIntuitive={isIntuitive}
        todayDoses={todayDoses}
        lastDose={lastDose}
        nextDoseDate={nextDoseDate}
        customDose={customDose}
        setCustomDose={setCustomDose}
        showDoseModal={showDoseModal}
        setShowDoseModal={setShowDoseModal}
        showAddDoseModal={showAddDoseModal}
        setShowAddDoseModal={setShowAddDoseModal}
        handleTakeDose={handleTakeDose}
        handleAddCustomDose={handleAddCustomDose}
        formatNextDoseDate={formatNextDoseDate}
        formatLastDoseDate={formatLastDoseDate}
        navigate={navigate}
      />

      {showDayDetailModal && selectedDay && (
        <DayDetailModal
          selectedDay={selectedDay}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          customDose={customDose}
          setCustomDose={setCustomDose}
          fieldLabels={fieldLabels}
          followUpInfo={followUpInfo ?? null}
          handleDeleteDose={handleDeleteDose}
          handleDeleteCheckin={handleDeleteCheckin}
          handleEditCheckin={handleEditCheckin}
          handleAddDoseForDay={handleAddDoseForDay}
          onClose={() => { setShowDayDetailModal(false); setIsEditMode(false); }}
          navigate={navigate}
        />
      )}

      <BottomNav activePage="dashboard" onFabPress={() => setShowAddDoseModal(true)} />
    </div>
  );
};

export default Dashboard;
