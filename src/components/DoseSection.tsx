import React from 'react';
import { Pill, Plus, CheckCircle, Sparkle, Clock, CalendarBlank, GearSix } from '@phosphor-icons/react';
import DosePicker from './DosePicker';
import CountdownTimer from './CountdownTimer';
import styles from './Dashboard.module.css';
import type { Protocol, DoseLog, CustomDoseState } from '../types';
import type { NavigateFunction } from 'react-router-dom';

interface DoseSectionProps {
  protocol: Protocol | null;
  isIntuitive: boolean;
  todayDoses: DoseLog[];
  lastDose: DoseLog | null;
  nextDoseDate: Date | null;
  customDose: CustomDoseState;
  setCustomDose: React.Dispatch<React.SetStateAction<CustomDoseState>>;
  showDoseModal: boolean;
  setShowDoseModal: React.Dispatch<React.SetStateAction<boolean>>;
  showAddDoseModal: boolean;
  setShowAddDoseModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleTakeDose: () => void;
  handleAddCustomDose: () => void;
  formatNextDoseDate: () => string;
  formatLastDoseDate: () => string;
  navigate: NavigateFunction;
}

const PROTOCOL_LABELS: Record<string, string> = {
  fadiman: 'Protocolo Fadiman',
  stamets: 'Protocolo Stamets',
  every_x_days: 'Cada X días',
  specific_days: 'Días específicos',
  custom: 'Protocolo personalizado',
  intuitive: 'Modo Intuitivo',
};

const DoseSection: React.FC<DoseSectionProps> = ({
  protocol,
  isIntuitive,
  todayDoses,
  lastDose,
  nextDoseDate,
  customDose,
  setCustomDose,
  showDoseModal,
  setShowDoseModal,
  showAddDoseModal,
  setShowAddDoseModal,
  handleTakeDose,
  handleAddCustomDose,
  formatNextDoseDate,
  formatLastDoseDate,
  navigate,
}) => {

  // ─── Helpers ──────────────────────────────────
  const getProtocolName = (): string => {
    if (!protocol) return '';
    const dose = protocol.dose ?? '0.1';
    const unit = protocol.unit ?? 'g';
    return `Microdosis - ${dose}${unit}`;
  };

  const getProtocolDescription = (): string => {
    if (!protocol) return '';
    const label = PROTOCOL_LABELS[protocol.frequency] || 'Protocolo';
    switch (protocol.frequency) {
      case 'stamets':
        return `${label} (4 días ON, 3 OFF)`;
      case 'fadiman':
        return `${label} (1 día ON, 2 OFF)`;
      case 'every_x_days': {
        const days = (protocol.frequency_value as { days: number } | null)?.days || 3;
        return `${label} (cada ${days} días)`;
      }
      case 'custom': {
        const on = (protocol.frequency_value as { on: number; off: number } | null)?.on || 1;
        const off = (protocol.frequency_value as { on: number; off: number } | null)?.off || 2;
        return `${label} (${on} ON, ${off} OFF)`;
      }
      case 'intuitive':
        return 'Toma tu dosis cuando lo sientas';
      default:
        return label;
    }
  };

  const formatLastDoseShort = (): string => {
    if (!lastDose) return '—';
    const d = new Date(lastDose.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const doseDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - doseDay.getTime()) / 86400000);

    if (diffDays === 0) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatNextDoseShort = (): string => {
    if (!nextDoseDate) return '—';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const doseDay = new Date(nextDoseDate.getFullYear(), nextDoseDate.getMonth(), nextDoseDate.getDate());
    const diffDays = Math.floor((doseDay.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)}d`;
    if (diffDays < 7) return `En ${diffDays} días`;
    return nextDoseDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatDoseTime = (date: string) =>
    new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // ─── Dose state detection ──────────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const doseDay = nextDoseDate ? new Date(nextDoseDate.getFullYear(), nextDoseDate.getMonth(), nextDoseDate.getDate()) : null;
  const isDoseToday = doseDay && todayStart.getTime() === doseDay.getTime();
  const isOverdue = nextDoseDate && nextDoseDate.getTime() < now.getTime() && !isDoseToday;

  // ─── Render dose chips ──────────────────────────
  const renderDoseChips = () => {
    if (todayDoses.length === 0) return null;
    return (
      <div className={styles.heroChipsRow}>
        {todayDoses.map(dose => (
          <span key={dose.id} className={styles.heroChip}>
            <Pill size={13} weight="fill" /> {dose.dose}{dose.unit} {formatDoseTime(dose.date)}
          </span>
        ))}
      </div>
    );
  };

  // ─── Hero Card Render ───────────────────────────
  const renderHeroCard = () => {
    // 1. No protocol → CTA
    if (!protocol) {
      return (
        <section className={styles.heroCard}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={styles.heroBadge}>
                  <span className={styles.heroBadgeDot} />
                  Sin Protocolo
                </div>
                <h2 className={styles.heroTitle}>Configura tu protocolo</h2>
                <p className={styles.heroSubtitle}>Para comenzar a hacer seguimiento</p>
              </div>
              <div className={styles.heroIconBox}>
                <GearSix size={28} weight="duotone" />
              </div>
            </div>
            <button className={styles.heroButton} onClick={() => navigate('/protocol')}>
              <GearSix size={20} weight="bold" />
              Configurar Protocolo
            </button>
          </div>
        </section>
      );
    }

    // 2. Intuitive without dose today
    if (isIntuitive && todayDoses.length === 0) {
      return (
        <section className={styles.heroCard}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={styles.heroBadge}>
                  <span className={styles.heroBadgeDot} />
                  Modo Intuitivo
                </div>
                <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
                <p className={styles.heroSubtitle}>Toma tu dosis cuando lo sientas</p>
              </div>
              <div className={styles.heroIconBox}>
                <Sparkle size={28} weight="fill" />
              </div>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Última toma</span>
                <span className={styles.heroStatValue}>{formatLastDoseShort()}</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Protocolo</span>
                <span className={styles.heroStatValue}>Intuitivo</span>
              </div>
            </div>
            <button className={styles.heroButton} onClick={() => setShowAddDoseModal(true)}>
              <CheckCircle size={20} weight="bold" />
              Registrar Dosis
            </button>
          </div>
        </section>
      );
    }

    // 3. Intuitive with dose today → success
    if (isIntuitive && todayDoses.length > 0) {
      return (
        <section className={`${styles.heroCard} ${styles.heroCardSuccess}`}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={`${styles.heroBadge} ${styles.heroBadgeSuccess}`}>
                  <CheckCircle size={14} weight="fill" />
                  Dosis Registrada
                </div>
                <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
                <p className={styles.heroSubtitle}>Modo intuitivo</p>
              </div>
              <div className={`${styles.heroIconBox} ${styles.heroIconBoxSuccess}`}>
                <CheckCircle size={28} weight="fill" />
              </div>
            </div>
            {renderDoseChips()}
            <button className={styles.heroButtonOutline} onClick={() => setShowAddDoseModal(true)}>
              <Plus size={18} weight="bold" />
              Registrar otra dosis
            </button>
          </div>
        </section>
      );
    }

    // 4. Scheduled — first dose ever
    if (!lastDose) {
      return (
        <section className={styles.heroCard}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={styles.heroBadge}>
                  <span className={styles.heroBadgeDot} />
                  Tu Primera Microdosis
                </div>
                <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
                <p className={styles.heroSubtitle}>{getProtocolDescription()}</p>
              </div>
              <div className={styles.heroIconBox}>
                <Pill size={28} weight="duotone" />
              </div>
            </div>
            <button className={styles.heroButton} onClick={() => setShowDoseModal(true)}>
              <CheckCircle size={20} weight="bold" />
              ¡Comienza hoy!
            </button>
          </div>
        </section>
      );
    }

    // 5. Scheduled — dose taken today → success
    if (todayDoses.length > 0) {
      return (
        <section className={`${styles.heroCard} ${styles.heroCardSuccess}`}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={`${styles.heroBadge} ${styles.heroBadgeSuccess}`}>
                  <CheckCircle size={14} weight="fill" />
                  Dosis Registrada
                </div>
                <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
                <p className={styles.heroSubtitle}>{getProtocolDescription()}</p>
              </div>
              <div className={`${styles.heroIconBox} ${styles.heroIconBoxSuccess}`}>
                <CheckCircle size={28} weight="fill" />
              </div>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Última toma</span>
                <span className={styles.heroStatValue}>{formatLastDoseShort()}</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Próxima</span>
                <span className={styles.heroStatValue}>{formatNextDoseShort()}</span>
              </div>
            </div>
            {renderDoseChips()}
            <button className={styles.heroButtonOutline} onClick={() => setShowAddDoseModal(true)}>
              <Plus size={18} weight="bold" />
              Registrar otra dosis
            </button>
          </div>
        </section>
      );
    }

    // 6. Scheduled — dose pending today
    if (isDoseToday) {
      return (
        <section className={styles.heroCard}>
          <div className={styles.heroBlurCircle} />
          <div className={styles.heroBody}>
            <div className={styles.heroHeader}>
              <div>
                <div className={styles.heroBadge}>
                  <span className={styles.heroBadgeDot} />
                  Dosis Programada
                </div>
                <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
                <p className={styles.heroSubtitle}>{getProtocolDescription()}</p>
              </div>
              <div className={styles.heroIconBox}>
                <Pill size={28} weight="duotone" />
              </div>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Última toma</span>
                <span className={styles.heroStatValue}>{formatLastDoseShort()}</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Próxima</span>
                <span className={styles.heroStatValue}>Hoy</span>
              </div>
            </div>
            <button className={styles.heroButton} onClick={() => setShowDoseModal(true)}>
              <CheckCircle size={20} weight="bold" />
              Registrar Dosis
            </button>
          </div>
        </section>
      );
    }

    // 7. Scheduled — overdue or future
    return (
      <section className={`${styles.heroCard} ${isOverdue ? styles.heroCardOverdue : ''}`}>
        <div className={styles.heroBlurCircle} />
        <div className={styles.heroBody}>
          <div className={styles.heroHeader}>
            <div>
              <div className={`${styles.heroBadge} ${isOverdue ? styles.heroBadgeDanger : ''}`}>
                <span className={styles.heroBadgeDot} />
                {isOverdue ? 'Dosis Atrasada' : 'Dosis Programada'}
              </div>
              <h2 className={styles.heroTitle}>{getProtocolName()}</h2>
              <p className={styles.heroSubtitle}>{getProtocolDescription()}</p>
            </div>
            <div className={`${styles.heroIconBox} ${isOverdue ? styles.heroIconBoxDanger : ''}`}>
              {isOverdue ? <Clock size={28} weight="fill" /> : <CalendarBlank size={28} weight="duotone" />}
            </div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Última toma</span>
              <span className={styles.heroStatValue}>{formatLastDoseShort()}</span>
            </div>
            <div className={`${styles.heroStat} ${isOverdue ? styles.heroStatDanger : ''}`}>
              <span className={styles.heroStatLabel}>Próxima</span>
              <span className={styles.heroStatValue}>{formatNextDoseShort()}</span>
            </div>
          </div>
          {isOverdue && (
            <button className={styles.heroButton} onClick={() => setShowDoseModal(true)}>
              <CheckCircle size={20} weight="bold" />
              Registrar Dosis Ahora
            </button>
          )}
        </div>
      </section>
    );
  };

  return (
    <>
      {renderHeroCard()}

      {showDoseModal && (
        <div className={styles.modal} onClick={() => setShowDoseModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Pill size={48} weight="regular" className={styles.modalIcon} />
            <h2>¿Tomar dosis ahora?</h2>
            {protocol && <p className={styles.modalDoseInfo}>{protocol.dose}{protocol.unit}</p>}
            <div className={styles.modalButtons}>
              <button onClick={() => setShowDoseModal(false)} className={styles.cancelButton}>Cancelar</button>
              <button onClick={handleTakeDose} className={styles.confirmButton}>Sí, tomar</button>
            </div>
          </div>
        </div>
      )}

      {showAddDoseModal && (
        <div className={styles.modal} onClick={() => setShowAddDoseModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Pill size={48} weight="regular" className={styles.modalIcon} />
            <h2>Registrar Dosis</h2>
            <DosePicker selectedDose={customDose.amount} onSelect={(val) => setCustomDose({ amount: val, unit: 'g' })} compact />
            <div className={styles.modalButtons}>
              <button onClick={() => setShowAddDoseModal(false)} className={styles.cancelButton}>Cancelar</button>
              <button onClick={handleAddCustomDose} className={styles.confirmButton}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoseSection;
