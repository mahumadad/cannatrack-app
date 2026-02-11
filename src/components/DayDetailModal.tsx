import React from 'react';
import { BookOpen, Notebook, Pill, Plus, X, PencilSimple, Trash, Lock, Calendar, CheckCircle } from '@phosphor-icons/react';
import DosePicker from './DosePicker';
import MiniGauge from './MiniGauge';
import styles from './Dashboard.module.css';
import type { CalendarDay, JournalEntry, FieldLabelsMap, FollowUpInfo, CustomDoseState } from '../types';
import type { NavigateFunction } from 'react-router-dom';

interface DayDetailModalProps {
  selectedDay: CalendarDay;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  customDose: CustomDoseState;
  setCustomDose: React.Dispatch<React.SetStateAction<CustomDoseState>>;
  dayJournalEntries: JournalEntry[];
  fieldLabels: FieldLabelsMap;
  followUpInfo: FollowUpInfo | null;
  handleDeleteDose: (doseId: string) => void;
  handleDeleteCheckin: (checkinId: string) => void;
  handleDeleteJournalEntry: (entryId: string) => void;
  handleEditCheckin: (dateString: string) => void;
  handleAddDoseForDay: () => void;
  onClose: () => void;
  navigate: NavigateFunction;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
  selectedDay,
  isEditMode,
  setIsEditMode,
  customDose,
  setCustomDose,
  dayJournalEntries,
  fieldLabels,
  followUpInfo,
  handleDeleteDose,
  handleDeleteCheckin,
  handleDeleteJournalEntry,
  handleEditCheckin,
  handleAddDoseForDay,
  onClose,
  navigate,
}) => {
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <div className={styles.modalHeader}>
          <h2>{selectedDay.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {!isEditMode && !(selectedDay.isFollowUpDay && selectedDay.isFuture) ? (
            <button className={styles.editModeButton} onClick={() => setIsEditMode(true)}><PencilSimple size={16} weight="regular" /> Modificar</button>
          ) : (
            <button className={styles.viewModeButton} onClick={() => setIsEditMode(false)}><Lock size={16} weight="regular" /> Bloquear</button>
          )}
        </div>

        {selectedDay.isFollowUpDay && (() => {
          const matchedMonth = followUpInfo?.allMonths?.find(m => m.dueDate === selectedDay.dateString);
          const monthParam = matchedMonth?.monthYear || selectedDay.dateString.substring(0, 7);
          return (
            <div className={`${styles.followUpDayIndicator} ${selectedDay.isFollowUpCompleted ? styles.followUpCompleted : ''}`}>
              <Calendar size={18} />
              {selectedDay.isFollowUpCompleted
                ? <><span>Follow-up completado</span><button onClick={() => navigate(`/followup?month=${monthParam}`)}>Ver resultados</button></>
                : selectedDay.isFuture
                  ? <span>Día de Follow-up</span>
                  : <><span>Día de Follow-up</span><button onClick={() => navigate(`/followup?month=${monthParam}`)}>Completar</button></>
              }
            </div>
          );
        })()}

        <div className={styles.daySection}>
          <h3><Pill size={18} weight="regular" /> Dosis</h3>
          {(selectedDay.doses?.length ?? 0) > 0 ? (
            <>
              <div className={styles.doseRow}>
                <div className={`${styles.doseStatusIcon} ${styles.doseIconSuccess}`}>
                  <CheckCircle size={24} weight="fill" />
                </div>
                <div className={styles.doseStatusText}>
                  <span className={styles.doseStatusTitle}>Dosis registrada{selectedDay.doses!.length > 1 ? 's' : ''}</span>
                  <span className={styles.doseStatusSub}>{selectedDay.doses!.length} registro{selectedDay.doses!.length > 1 ? 's' : ''} este día</span>
                </div>
              </div>
              <div className={styles.doseChipsRow}>
                {selectedDay.doses!.map(dose => (
                  <div key={dose.id} className={styles.doseChipWithDelete}>
                    <span className={styles.doseChip}>
                      <Pill size={13} weight="fill" /> {dose.dose}{dose.unit} {new Date(dose.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isEditMode && <button className={styles.deleteChipButton} onClick={() => handleDeleteDose(dose.id)}><X size={12} weight="bold" /></button>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.emptyText}>Sin dosis registradas</p>
          )}
          {isEditMode && (
            <div className={styles.addDoseInline}>
              <DosePicker selectedDose={customDose.amount} onSelect={(val) => setCustomDose({ amount: val, unit: 'g' })} compact />
              <button className={styles.addButton} onClick={handleAddDoseForDay}><Plus size={14} /> Registrar</button>
            </div>
          )}
        </div>

        <div className={styles.daySection}>
          <h3><BookOpen size={18} weight="regular" /> Reflexión</h3>
          {selectedDay.checkin ? (
            <div className={styles.checkinSummary}>
              <div className={styles.miniGaugesGrid}>
                {Object.keys(fieldLabels).map(key => (
                  <MiniGauge key={key} fieldKey={key} value={(selectedDay.checkin![key] as number) || 5} fieldLabels={fieldLabels} />
                ))}
              </div>
              {!!selectedDay.checkin!.notes && <p className={styles.checkinNotes}>"{String(selectedDay.checkin!.notes)}"</p>}
              {isEditMode && (
                <div className={styles.checkinActions}>
                  <button className={styles.editCheckinButton} onClick={() => handleEditCheckin(selectedDay.dateString)}><PencilSimple size={14} /> Editar</button>
                  <button className={styles.deleteCheckinButton} onClick={() => handleDeleteCheckin(selectedDay.checkin!.id)}><Trash size={14} /> Eliminar</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.noCheckin}>
              <p>Sin reflexión registrada</p>
              {isEditMode && <button className={styles.addCheckinButton} onClick={() => handleEditCheckin(selectedDay.dateString)}><Plus size={14} /> Agregar reflexión</button>}
            </div>
          )}
        </div>

        <div className={styles.daySection}>
          <h3><Notebook size={18} weight="regular" /> Bitácora</h3>
          {dayJournalEntries.length > 0 ? (
            dayJournalEntries.map((entry) => (
              <div key={entry.id} className={styles.journalItem}>
                <div className={styles.journalItemHeader}>
                  <span className={styles.journalItemTitle}>{entry.title || 'Sin título'}</span>
                  {isEditMode && <button className={styles.deleteJournalButton} onClick={() => handleDeleteJournalEntry(entry.id)}><X size={14} weight="bold" /></button>}
                </div>
                <p className={styles.journalItemPreview}>{entry.content.substring(0, 80)}{entry.content.length > 80 ? '...' : ''}</p>
              </div>
            ))
          ) : (
            <p className={styles.emptyText}>Sin entradas de bitácora</p>
          )}
          {isEditMode && <button className={styles.addJournalButton} onClick={() => navigate(`/journal?date=${selectedDay.dateString}`)}><Plus size={14} /> Agregar entrada</button>}
        </div>

        <button onClick={onClose} className={styles.closeButton}>Cerrar</button>
      </div>
    </div>
  );
};

export default DayDetailModal;
