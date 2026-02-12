import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle, Sparkle, Clock, CalendarBlank } from '@phosphor-icons/react';
import DosePicker from './DosePicker';
import CountdownTimer, { computeCountdown } from './CountdownTimer';
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

  const formatDoseTime = (date: string) =>
    new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const renderDoseChips = () => {
    if (todayDoses.length === 0) return null;
    return (
      <div className={styles.doseChipsRow}>
        {todayDoses.map(dose => (
          <span key={dose.id} className={styles.doseChip}>
            <Pill size={13} weight="fill" /> {dose.dose}{dose.unit} {formatDoseTime(dose.date)}
          </span>
        ))}
      </div>
    );
  };

  const renderCompactContent = () => {
    // No protocol configured
    if (!protocol) {
      return (
        <div className={styles.doseRow}>
          <div className={styles.doseStatusIcon}>
            <Pill size={24} weight="duotone" />
          </div>
          <div className={styles.doseStatusText}>
            <span className={styles.doseStatusTitle}>Configura tu protocolo</span>
            <span className={styles.doseStatusSub}>Para comenzar a hacer seguimiento</span>
          </div>
          <button className={styles.doseActionButton} onClick={() => navigate('/protocol')}>Configurar</button>
        </div>
      );
    }

    // Intuitive mode
    if (isIntuitive) {
      if (todayDoses.length > 0) {
        return (
          <>
            <div className={styles.doseRow}>
              <div className={`${styles.doseStatusIcon} ${styles.doseIconSuccess}`}>
                <CheckCircle size={24} weight="fill" />
              </div>
              <div className={styles.doseStatusText}>
                <span className={styles.doseStatusTitle}>Dosis registrada hoy</span>
                <span className={styles.doseStatusSub}>Modo intuitivo</span>
              </div>
              <button className={styles.doseActionButtonOutline} onClick={() => setShowAddDoseModal(true)}>
                <Plus size={14} weight="bold" /> Otra
              </button>
            </div>
            {renderDoseChips()}
          </>
        );
      }
      return (
        <div className={styles.doseRow}>
          <div className={styles.doseStatusIcon}>
            <Sparkle size={24} weight="fill" />
          </div>
          <div className={styles.doseStatusText}>
            <span className={styles.doseStatusTitle}>Modo Intuitivo</span>
            <span className={styles.doseStatusSub}>{lastDose ? `Última: ${formatLastDoseDate()}` : 'Toma tu dosis cuando lo sientas'}</span>
          </div>
          <button className={styles.doseActionButton} onClick={() => setShowAddDoseModal(true)}>Tomar</button>
        </div>
      );
    }

    // Scheduled mode - first dose
    if (!lastDose) {
      return (
        <div className={styles.doseRow}>
          <div className={styles.doseStatusIcon}>
            <Pill size={24} weight="duotone" />
          </div>
          <div className={styles.doseStatusText}>
            <span className={styles.doseStatusTitle}>Primera dosis · {protocol.dose}g</span>
            <span className={styles.doseStatusSub}>¡Comienza tu protocolo hoy!</span>
          </div>
          <button className={styles.doseActionButton} onClick={() => setShowDoseModal(true)}>Tomar</button>
        </div>
      );
    }

    // Scheduled - dose taken today
    if (todayDoses.length > 0) {
      return (
        <>
          <div className={styles.doseRow}>
            <div className={`${styles.doseStatusIcon} ${styles.doseIconSuccess}`}>
              <CheckCircle size={24} weight="fill" />
            </div>
            <div className={styles.doseStatusText}>
              <span className={styles.doseStatusTitle}>Dosis registrada</span>
              <span className={styles.doseStatusSub}>Próxima: {formatNextDoseDate()}</span>
            </div>
            <button className={styles.doseActionButtonOutline} onClick={() => setShowAddDoseModal(true)}>
              <Plus size={14} weight="bold" /> Otra
            </button>
          </div>
          {renderDoseChips()}
        </>
      );
    }

    // Scheduled - dose pending today (or overdue)
    const snapshot = computeCountdown(nextDoseDate);
    if (snapshot.isToday || snapshot.isOverdue) {
      return (
        <div className={styles.doseRow}>
          <div className={`${styles.doseStatusIcon} ${snapshot.isOverdue ? styles.doseIconDanger : styles.doseIconPending}`}>
            <Clock size={24} weight="fill" />
          </div>
          <div className={styles.doseStatusText}>
            <span className={styles.doseStatusTitle}>
              {snapshot.isOverdue ? 'Dosis atrasada' : 'Dosis pendiente'} · {protocol.dose}g
            </span>
            <span className={`${styles.doseStatusSub} ${snapshot.isOverdue ? styles.doseSubDanger : ''}`}>
              <CountdownTimer nextDoseDate={nextDoseDate} isIntuitive={isIntuitive} />
            </span>
          </div>
          <button className={styles.doseActionButton} onClick={() => setShowDoseModal(true)}>Tomar</button>
        </div>
      );
    }

    // Scheduled - next dose is another day
    return (
      <div className={styles.doseRow}>
        <div className={styles.doseStatusIcon}>
          <CalendarBlank size={24} weight="duotone" />
        </div>
        <div className={styles.doseStatusText}>
          <span className={styles.doseStatusTitle}>Próxima dosis · {protocol.dose}g</span>
          <span className={styles.doseStatusSub}>{formatNextDoseDate()}</span>
        </div>
        <button className={styles.doseActionButtonOutline} onClick={() => setShowDoseModal(true)}>Tomar ahora</button>
      </div>
    );
  };

  return (
    <>
      <div className={styles.doseSection}>
        {renderCompactContent()}
      </div>

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
