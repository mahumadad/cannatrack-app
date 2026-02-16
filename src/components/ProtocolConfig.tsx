import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import api from '../utils/api';
import DosePicker from './DosePicker';
import { INTERNAL_SUBSTANCE, DOSE_UNIT } from '../utils/doseOptions';
import styles from './ProtocolConfig.module.css';
import { useUser } from '../hooks/useUser';
import { toLocalDateString } from '../utils/dateHelpers';
import type { Protocol, CustomDays, CustomPattern, ProtocolFrequency, FrequencyValue } from '../types';

interface ProtocolFormState {
  frequency: string;
  frequencyValue: FrequencyValue;
  doseTime: string;
  dose: number;
  unit: string;
  duration: number | string | null;
  startDate: string;
}

const ProtocolConfig: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState<boolean>(false);
  const [existingProtocol, setExistingProtocol] = useState<Protocol | null>(null);
  const [step, setStep] = useState<number>(1);

  const [protocol, setProtocol] = useState<ProtocolFormState>({
    frequency: 'fadiman',
    frequencyValue: null,
    doseTime: '09:00',
    dose: 0.1,
    unit: 'g',
    duration: null,
    startDate: toLocalDateString()
  });

  const [customDays, setCustomDays] = useState<CustomDays>({
    lunes: false,
    martes: false,
    miercoles: false,
    jueves: false,
    viernes: false,
    sabado: false,
    domingo: false
  });

  const [everyXDays, setEveryXDays] = useState<number>(3);
  const [customPattern, setCustomPattern] = useState<CustomPattern>({ on: 1, off: 2 });

  useEffect(() => {
    if (user?.id) {
      loadExistingProtocol(user.id);
    }
  }, [user]);

  const loadExistingProtocol = async (userId: string) => {
    try {
      const data = await api.get(`/api/protocol/${userId}`);
      if (data) {
        setExistingProtocol(data);
        setProtocol({
          frequency: data.frequency,
          frequencyValue: data.frequency_value,
          doseTime: data.dose_time || '09:00',
          dose: data.dose,
          unit: data.unit,
          duration: data.duration,
          startDate: data.start_date || toLocalDateString()
        });

        if (data.frequency === 'specific_days' && data.frequency_value) {
          setCustomDays(data.frequency_value);
        } else if (data.frequency === 'every_x_days' && data.frequency_value) {
          setEveryXDays(data.frequency_value.days);
        } else if (data.frequency === 'custom' && data.frequency_value) {
          setCustomPattern(data.frequency_value);
        }
      }
    } catch (error) {
      toast!.error('Error al cargar protocolo');
    }
  };

  const handleFrequencyChange = (freq: string) => {
    setProtocol(prev => ({ ...prev, frequency: freq }));
  };

  const handleDayToggle = (day: keyof CustomDays) => {
    setCustomDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      let frequencyValue = null;
      
      switch (protocol.frequency) {
        case 'specific_days':
          frequencyValue = customDays;
          break;
        case 'every_x_days':
          frequencyValue = { days: everyXDays };
          break;
        case 'custom':
          frequencyValue = customPattern;
          break;
        default:
          frequencyValue = null;
      }

      await api.post('/api/protocol', {
        userId: user!.id,
        frequency: protocol.frequency,
        frequencyValue: frequencyValue,
        doseTime: protocol.frequency === 'intuitive' ? null : protocol.doseTime,
        substance: INTERNAL_SUBSTANCE,
        dose: Number(protocol.dose),
        unit: DOSE_UNIT,
        duration: protocol.duration ? parseInt(String(protocol.duration)) : null,
        startDate: protocol.frequency === 'intuitive' ? null : protocol.startDate
      });

      toast!.success('¡Protocolo guardado!');
      navigate('/dashboard');
    } catch (error) {
      toast!.error('Error al guardar el protocolo');
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const isIntuitive = protocol.frequency === 'intuitive';

  return (
    <div className={styles.protocol}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className={styles.title}>
          {existingProtocol ? 'Editar Protocolo' : 'Configurar Protocolo'}
        </h1>
        <div style={{ width: 36 }}></div>
      </div>

      <div className={styles.stepIndicator}>
        <div className={`${styles.stepDot} ${step >= 1 ? styles.stepActive : ''}`}>1</div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.stepDot} ${step >= 2 ? styles.stepActive : ''}`}>2</div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>

        {step === 1 && (
          <>
            {/* FRECUENCIA */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>🔄 Tipo de Protocolo</h2>

              <div className={styles.frequencyOptions}>
                <label className={`${styles.frequencyCard} ${protocol.frequency === 'intuitive' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="intuitive"
                    checked={protocol.frequency === 'intuitive'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>🧘 Intuitivo</h3>
                    <p>Sin horarios fijos. Tomas cuando lo sientes.</p>
                    <span className={styles.badgeFree}>Libre</span>
                  </div>
                </label>

                <label className={`${styles.frequencyCard} ${protocol.frequency === 'fadiman' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="fadiman"
                    checked={protocol.frequency === 'fadiman'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>Protocolo Fadiman</h3>
                    <p>1 día ON, 2 días OFF</p>
                    <span className={styles.badge}>Clásico</span>
                  </div>
                </label>

                <label className={`${styles.frequencyCard} ${protocol.frequency === 'stamets' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="stamets"
                    checked={protocol.frequency === 'stamets'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>Protocolo Stamets</h3>
                    <p>4 días ON, 3 días OFF</p>
                    <span className={styles.badge}>Popular</span>
                  </div>
                </label>

                <label className={`${styles.frequencyCard} ${protocol.frequency === 'every_x_days' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="every_x_days"
                    checked={protocol.frequency === 'every_x_days'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>Cada X días</h3>
                    <p>Personaliza el intervalo</p>
                  </div>
                </label>

                <label className={`${styles.frequencyCard} ${protocol.frequency === 'specific_days' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="specific_days"
                    checked={protocol.frequency === 'specific_days'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>Días específicos</h3>
                    <p>Elige qué días de la semana</p>
                  </div>
                </label>

                <label className={`${styles.frequencyCard} ${protocol.frequency === 'custom' ? styles.active : ''}`}>
                  <input
                    type="radio"
                    name="frequency"
                    value="custom"
                    checked={protocol.frequency === 'custom'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                  />
                  <div className={styles.cardContent}>
                    <h3>Patrón personalizado</h3>
                    <p>X días ON, Y días OFF</p>
                  </div>
                </label>
              </div>

              {protocol.frequency === 'every_x_days' && (
                <div className={styles.frequencyDetail}>
                  <label>Cada cuántos días:</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="30"
                    value={everyXDays}
                    onChange={(e) => setEveryXDays(parseInt(e.target.value))}
                    className={styles.numberInput}
                  />
                  <p className={styles.hint}>Ejemplo: cada 3 días</p>
                </div>
              )}

              {protocol.frequency === 'specific_days' && (
                <div className={styles.frequencyDetail}>
                  <label>Selecciona los días:</label>
                  <div className={styles.daysGrid}>
                    {Object.keys(customDays).map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.dayButton} ${customDays[day as keyof CustomDays] ? styles.active : ''}`}
                        onClick={() => handleDayToggle(day as keyof CustomDays)}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {protocol.frequency === 'custom' && (
                <div className={styles.frequencyDetail}>
                  <label>Patrón personalizado:</label>
                  <div className={styles.customPattern}>
                    <div className={styles.patternInput}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10"
                        value={customPattern.on}
                        onChange={(e) => setCustomPattern(prev => ({ ...prev, on: parseInt(e.target.value) }))}
                        className={styles.numberInput}
                      />
                      <span>días ON</span>
                    </div>
                    <div className={styles.patternInput}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10"
                        value={customPattern.off}
                        onChange={(e) => setCustomPattern(prev => ({ ...prev, off: parseInt(e.target.value) }))}
                        className={styles.numberInput}
                      />
                      <span>días OFF</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MENSAJE INTUITIVO */}
            {isIntuitive && (
              <div className={styles.intuitiveInfo}>
                <span className={styles.intuitiveIcon}>🧘</span>
                <h3>Modo Intuitivo</h3>
                <p>No recibirás recordatorios ni tendrás días programados. Simplemente registra tus dosis y reflexiones cuando lo desees.</p>
              </div>
            )}

            <div className={styles.stepNav}>
              <div></div>
              <button type="button" className={styles.nextStepButton} onClick={() => setStep(2)}>
                Siguiente <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* FECHA DE INICIO - Solo si NO es intuitivo */}
            {!isIntuitive && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📅 Fecha de Inicio</h2>
                <input
                  type="date"
                  value={protocol.startDate}
                  onChange={(e) => setProtocol(prev => ({ ...prev, startDate: e.target.value }))}
                  className={styles.dateInput}
                  required
                />
                <p className={styles.datePreview}>{formatDateDisplay(protocol.startDate)}</p>
                <p className={styles.hint}>¿Cuándo comenzarás o comenzaste tu protocolo?</p>
              </div>
            )}

            {/* HORA - Solo si NO es intuitivo */}
            {!isIntuitive && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>⏰ Hora de la Dosis</h2>
                <input
                  type="time"
                  value={protocol.doseTime}
                  onChange={(e) => setProtocol(prev => ({ ...prev, doseTime: e.target.value }))}
                  className={styles.timeInput}
                  required
                />
                <p className={styles.hint}>¿A qué hora prefieres tomar tu microdosis?</p>
              </div>
            )}

            {/* DOSIFICACIÓN */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>💊 Dosificación</h2>
              <DosePicker
                selectedDose={Number(protocol.dose)}
                onSelect={(val) => setProtocol(prev => ({ ...prev, dose: val }))}
              />
            </div>

            {/* DURACIÓN (Opcional) - Solo si NO es intuitivo */}
            {!isIntuitive && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📆 Duración del Protocolo (Opcional)</h2>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="365"
                  value={protocol.duration || ''}
                  onChange={(e) => setProtocol(prev => ({ ...prev, duration: e.target.value }))}
                  className={styles.numberInput}
                  placeholder="Ejemplo: 30 días"
                />
                <p className={styles.hint}>¿Por cuántos días planeas seguir este protocolo? Déjalo vacío si no lo sabes aún.</p>
              </div>
            )}

            <div className={styles.stepNav}>
              <button type="button" className={styles.prevStepButton} onClick={() => setStep(1)}>
                <ArrowLeft size={18} weight="bold" /> Volver
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? 'Guardando...' : existingProtocol ? 'Actualizar Protocolo' : 'Guardar Protocolo'}
              </button>
            </div>
          </>
        )}

      </form>
    </div>
  );
};

export default ProtocolConfig;
