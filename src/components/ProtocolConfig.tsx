import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import {
  ArrowLeft, ArrowRight, CheckCircle,
  Flask, Leaf, Sparkle, Repeat, CalendarDots, Faders,
  Pill, SunHorizon, CaretLeft, CaretRight, Info,
  ClipboardText, Timer, CalendarBlank
} from '@phosphor-icons/react';
import { trackEvent } from '../utils/analytics';
import DosePicker from './DosePicker';
import {
  INTERNAL_SUBSTANCE, DOSE_UNIT, DOSE_OPTIONS,
  parseGramaje, parseProtocolo, extractCustomPattern,
  extractEveryXDays, parseDuracion, estimateDuration,
  inferFrequencyFromDosesAndDuration
} from '../utils/doseOptions';
import { useRecetasQuery, useProtocol, useSaveProtocol } from '../hooks/queries';
import styles from './ProtocolConfig.module.css';
import { useUser } from '../hooks/useUser';
import { toLocalDateString } from '../utils/dateHelpers';
import type { Protocol, CustomDays, CustomPattern, ProtocolFrequency, FrequencyValue, Receta, DoseOption } from '../types';

/* ────────────────────────────────────────────────────── */
/*  Constants                                              */
/* ────────────────────────────────────────────────────── */

interface ProtocolFormState {
  frequency: string;
  frequencyValue: FrequencyValue;
  doseTime: string;
  dose: number;
  unit: string;
  duration: number | string | null;
  startDate: string;
}

const FREQ_OPTIONS: { value: string; label: string; pattern: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'fadiman', label: 'Fadiman', pattern: '1 día ON / 2 días OFF', desc: 'Ideal para principiantes. Permite observar efectos y previene tolerancia.', Icon: Flask },
  { value: 'stamets', label: 'Stamets', pattern: '4 días ON / 3 días OFF', desc: 'Apilamiento intensivo. Enfocado en neurogénesis y creatividad sostenida.', Icon: Leaf },
  { value: 'intuitive', label: 'Intuitivo', pattern: 'Sin patrón fijo', desc: 'Tú decides cuándo tomar, escuchando a tu cuerpo. Requiere experiencia.', Icon: Sparkle },
  { value: 'every_x_days', label: 'Cada X Días', pattern: 'Intervalo personalizado', desc: 'Define un intervalo regular entre cada toma.', Icon: Repeat },
  { value: 'specific_days', label: 'Días Específicos', pattern: 'Selección semanal', desc: 'Elige qué días de la semana quieres tomar.', Icon: CalendarDots },
  { value: 'custom', label: 'Personalizado', pattern: 'Configuración manual', desc: 'Define tu propio ciclo de días de toma y días de descanso.', Icon: Faders },
];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

/* ────────────────────────────────────────────────────── */
/*  Component                                              */
/* ────────────────────────────────────────────────────── */

const ProtocolConfig: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState<boolean>(false);
  const [existingProtocol, setExistingProtocol] = useState<Protocol | null>(null);
  const [protocolLoaded, setProtocolLoaded] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);

  const { data: existingProtocolData } = useProtocol(user?.id);
  const saveProtocol = useSaveProtocol();

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
    lunes: false, martes: false, miercoles: false,
    jueves: false, viernes: false, sabado: false, domingo: false
  });

  const [everyXDays, setEveryXDays] = useState<number>(3);
  const [customPattern, setCustomPattern] = useState<CustomPattern>({ on: 1, off: 2 });
  const [suggestionsApplied, setSuggestionsApplied] = useState<boolean>(false);

  // Calendar state
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());

  // ─── Receta suggestions ──────────────────────────────────────

  const { data: allRecetas = [] } = useRecetasQuery(user?.id);

  const activeReceta = useMemo(() => {
    return allRecetas.find((r: Receta) => r.estado === 'activa') || null;
  }, [allRecetas]);

  const recetaSuggestions = useMemo(() => {
    if (!activeReceta) return null;

    let suggestedFrequency = parseProtocolo(activeReceta.protocolo);
    const suggestedDose = parseGramaje(activeReceta.gramaje_micro);
    const suggestedDuration = parseDuracion(activeReceta.duracion);
    const suggestedCustomPattern = extractCustomPattern(activeReceta.protocolo);
    let suggestedEveryXDays = extractEveryXDays(activeReceta.protocolo);

    let inferred = false;
    if (!suggestedFrequency) {
      const inference = inferFrequencyFromDosesAndDuration(
        activeReceta.total_micro_autorizado,
        suggestedDuration
      );
      if (inference) {
        suggestedFrequency = inference.frequency;
        suggestedEveryXDays = inference.everyXDays;
        inferred = true;
      }
    }

    return {
      frequency: suggestedFrequency,
      dose: suggestedDose,
      duration: suggestedDuration,
      customPattern: suggestedCustomPattern,
      everyXDays: suggestedEveryXDays,
      totalMicro: activeReceta.total_micro_autorizado || 0,
      rawProtocolo: activeReceta.protocolo,
      rawGramaje: activeReceta.gramaje_micro,
      rawDuracion: activeReceta.duracion,
      inferred,
    };
  }, [activeReceta]);

  const extraDoseOptions = useMemo((): DoseOption[] => {
    if (!recetaSuggestions?.dose) return [];
    const exists = DOSE_OPTIONS.some(o => o.value === recetaSuggestions.dose);
    if (exists) return [];
    const val = recetaSuggestions.dose;
    const mg = Math.round(val * 1000);
    return [{ value: val, label: `${val}g`, sublabel: `${mg}mg` }];
  }, [recetaSuggestions]);

  const estimatedDuration = useMemo(() => {
    if (!recetaSuggestions?.totalMicro) return null;
    if (recetaSuggestions.duration) return null;

    let freqValue: { [k: string]: unknown } | null = null;
    switch (protocol.frequency) {
      case 'custom':
        freqValue = { ...customPattern };
        break;
      case 'every_x_days':
        freqValue = { days: everyXDays };
        break;
      case 'specific_days':
        freqValue = { ...customDays };
        break;
    }

    return estimateDuration(recetaSuggestions.totalMicro, protocol.frequency, freqValue);
  }, [recetaSuggestions, protocol.frequency, customPattern, everyXDays, customDays]);

  // ─── Sync existing protocol from query ──────────────────────

  useEffect(() => {
    if (existingProtocolData) {
      setExistingProtocol(existingProtocolData);
      setProtocol({
        frequency: existingProtocolData.frequency,
        frequencyValue: existingProtocolData.frequency_value,
        doseTime: existingProtocolData.dose_time || '09:00',
        dose: existingProtocolData.dose,
        unit: existingProtocolData.unit,
        duration: existingProtocolData.duration,
        startDate: existingProtocolData.start_date || toLocalDateString()
      });

      if (existingProtocolData.frequency === 'specific_days' && existingProtocolData.frequency_value) {
        setCustomDays(existingProtocolData.frequency_value);
      } else if (existingProtocolData.frequency === 'every_x_days' && existingProtocolData.frequency_value) {
        setEveryXDays(existingProtocolData.frequency_value.days);
      } else if (existingProtocolData.frequency === 'custom' && existingProtocolData.frequency_value) {
        setCustomPattern(existingProtocolData.frequency_value);
      }

      // Sync calendar to existing start date
      if (existingProtocolData.start_date) {
        const [y, m] = existingProtocolData.start_date.split('-').map(Number);
        setCalYear(y);
        setCalMonth(m - 1);
      }
    }
    setProtocolLoaded(true);
  }, [existingProtocolData]);

  // ─── Apply receta suggestions (only for NEW protocols) ───────

  useEffect(() => {
    if (!protocolLoaded || existingProtocol || suggestionsApplied || !recetaSuggestions) return;

    const s = recetaSuggestions;

    if (s.frequency) {
      setProtocol(prev => ({ ...prev, frequency: s.frequency! }));
      if (s.frequency === 'custom' && s.customPattern) {
        setCustomPattern(s.customPattern);
      }
      if (s.frequency === 'every_x_days' && s.everyXDays) {
        setEveryXDays(s.everyXDays);
      }
    }

    if (s.dose) {
      setProtocol(prev => ({ ...prev, dose: s.dose! }));
    }

    if (s.duration) {
      setProtocol(prev => ({ ...prev, duration: s.duration! }));
    }

    setSuggestionsApplied(true);
  }, [protocolLoaded, existingProtocol, suggestionsApplied, recetaSuggestions]);

  useEffect(() => {
    if (!suggestionsApplied || existingProtocol) return;
    if (recetaSuggestions?.duration) return;
    if (estimatedDuration && !protocol.duration) {
      setProtocol(prev => ({ ...prev, duration: estimatedDuration }));
    }
  }, [estimatedDuration, suggestionsApplied, existingProtocol, recetaSuggestions]);

  // ─── Derived ────────────────────────────────────────────────

  const isIntuitive = protocol.frequency === 'intuitive';
  const totalSteps = isIntuitive ? 2 : 3;
  const progress = Math.round((step / totalSteps) * 100);
  const suggestedFreq = recetaSuggestions?.frequency || null;

  // ─── Time display ───────────────────────────────────────────

  const timeDisplay = useMemo(() => {
    const [h, m] = protocol.doseTime.split(':').map(Number);
    const isAM = h < 12;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return {
      hours: String(h12).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      isAM
    };
  }, [protocol.doseTime]);

  const toggleAMPM = () => {
    const [h, m] = protocol.doseTime.split(':').map(Number);
    const newH = h < 12 ? h + 12 : h - 12;
    setProtocol(prev => ({
      ...prev,
      doseTime: `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }));
  };

  // ─── Summary helpers ────────────────────────────────────────

  const getFreqLabel = (): string => {
    switch (protocol.frequency) {
      case 'fadiman': return 'Protocolo Fadiman';
      case 'stamets': return 'Stamets Stack';
      case 'intuitive': return 'Modo Intuitivo';
      case 'every_x_days': return `Cada ${everyXDays} días`;
      case 'specific_days': {
        const sel = Object.entries(customDays).filter(([, v]) => v).map(([k]) => k.slice(0, 3));
        return sel.length > 0 ? sel.join(', ') : 'Días específicos';
      }
      case 'custom': return `Personalizado`;
      default: return 'Protocolo';
    }
  };

  const getFreqBadge = (): string => {
    switch (protocol.frequency) {
      case 'fadiman': return '1 ON / 2 OFF';
      case 'stamets': return '4 ON / 3 OFF';
      case 'intuitive': return 'Libre';
      case 'every_x_days': return `Cada ${everyXDays}d`;
      case 'specific_days': {
        const count = Object.values(customDays).filter(Boolean).length;
        return `${count} días/sem`;
      }
      case 'custom': return `${customPattern.on} ON / ${customPattern.off} OFF`;
      default: return '';
    }
  };

  const getDurationDisplay = (): string => {
    if (!protocol.duration) return 'Sin definir';
    const d = parseInt(String(protocol.duration));
    if (d >= 28) return `${Math.round(d / 7)} Semanas`;
    return `${d} Días`;
  };

  const getEndDateEstimate = (): string => {
    if (!protocol.duration || !protocol.startDate) return '';
    const d = parseInt(String(protocol.duration));
    if (isNaN(d) || d <= 0) return '';
    const [y, m, day] = protocol.startDate.split('-').map(Number);
    const end = new Date(y, m - 1, day + d);
    return `~${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)}`;
  };

  // ─── Handlers ────────────────────────────────────────────────

  const handleFrequencyChange = (freq: string) => {
    setProtocol(prev => ({ ...prev, frequency: freq }));
  };

  const handleDayToggle = (day: keyof CustomDays) => {
    setCustomDays(prev => ({ ...prev, [day]: !prev[day] }));
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

      await saveProtocol.mutateAsync({
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

      trackEvent('protocol_configured', {
        frequency: protocol.frequency,
        had_receta_suggestions: !!recetaSuggestions,
        followed_receta_dose: recetaSuggestions?.dose === Number(protocol.dose),
      });
      toast!.success('¡Protocolo guardado!');
      navigate('/dashboard');
    } catch {
      toast!.error('Error al guardar el protocolo');
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = (): boolean => {
    if (step === 1 && protocol.frequency === 'specific_days') {
      return Object.values(customDays).some(Boolean);
    }
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps && canAdvance()) setStep(step + 1);
  };

  // ─── Calendar helpers ───────────────────────────────────────

  const handleCalPrev = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const handleCalNext = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setProtocol(prev => ({ ...prev, startDate: dateStr }));
  };

  const goToToday = () => {
    const now = new Date();
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    setProtocol(prev => ({ ...prev, startDate: toLocalDateString() }));
  };

  // ─── Render: Calendar ───────────────────────────────────────

  const renderCalendar = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const [selY, selM, selD] = protocol.startDate.split('-').map(Number);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return (
      <div className={styles.calendarCard}>
        <div className={styles.calendarNav}>
          <h3 className={styles.calendarMonth}>{MONTH_NAMES[calMonth]} {calYear}</h3>
          <div className={styles.calendarArrows}>
            <button type="button" onClick={handleCalPrev} className={styles.calArrowBtn}>
              <CaretLeft size={20} weight="bold" />
            </button>
            <button type="button" onClick={handleCalNext} className={styles.calArrowBtn}>
              <CaretRight size={20} weight="bold" />
            </button>
          </div>
        </div>

        <div className={styles.calendarWeekdays}>
          {WEEKDAY_HEADERS.map(d => <span key={d}>{d}</span>)}
        </div>

        <div className={styles.calendarGrid}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.calendarEmpty} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isSelected = selY === calYear && selM - 1 === calMonth && selD === day;
            const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
            const isPast = new Date(calYear, calMonth, day) < todayStart;

            return (
              <button
                key={day}
                type="button"
                className={`${styles.calendarDay} ${isSelected ? styles.calDaySelected : ''} ${isToday && !isSelected ? styles.calDayToday : ''} ${isPast && !isSelected ? styles.calDayPast : ''}`}
                onClick={() => handleDayClick(day)}
              >
                {day}
                {isSelected && <span className={styles.calDayDot} />}
              </button>
            );
          })}
        </div>

        <div className={styles.calendarTodayRow}>
          <button type="button" className={styles.todayBtn} onClick={goToToday}>
            <CalendarBlank size={14} weight="bold" /> Hoy
          </button>
        </div>
      </div>
    );
  };

  // ─── Render: Summary Card ───────────────────────────────────

  const renderSummary = () => (
    <div className={styles.summaryCard}>
      <div className={styles.summaryAccent} />
      <div className={styles.summaryBody}>
        <h3 className={styles.summaryTitle}>
          <ClipboardText size={22} weight="duotone" />
          Resumen del Protocolo
        </h3>

        <div className={styles.summaryRows}>
          {/* Frequency */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryLeft}>
              <div className={styles.summaryIcon}><CalendarDots size={20} weight="duotone" /></div>
              <div>
                <p className={styles.summaryLabel}>{getFreqLabel()}</p>
                <p className={styles.summarySub}>Frecuencia</p>
              </div>
            </div>
            <span className={styles.summaryBadge}>{getFreqBadge()}</span>
          </div>

          {/* Dose */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryLeft}>
              <div className={styles.summaryIcon}><Pill size={20} weight="duotone" /></div>
              <div>
                <p className={styles.summaryLabel}>Microdosis</p>
                <p className={styles.summarySub}>Dosis Diaria</p>
              </div>
            </div>
            <span className={styles.summaryValue}>{protocol.dose}g</span>
          </div>

          {/* Duration */}
          {!isIntuitive && (
            <div className={`${styles.summaryRow} ${styles.summaryRowLast}`}>
              <div className={styles.summaryLeft}>
                <div className={styles.summaryIcon}><Timer size={20} weight="duotone" /></div>
                <div>
                  <p className={styles.summaryLabel}>{getDurationDisplay()}</p>
                  <p className={styles.summarySub}>Duración Estimada</p>
                </div>
              </div>
              {getEndDateEstimate() && (
                <span className={styles.summaryValue}>{getEndDateEstimate()}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Main Render ────────────────────────────────────────────

  return (
    <div className={styles.protocol}>
      {/* ═══ HEADER (sticky with progress bar) ═══ */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className={styles.headerTitle}>Configuración de Protocolo</h1>
          <div className={styles.headerSpacer} />
        </div>
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span>Paso {step} de {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* ═══ FORM ═══ */}
      <form onSubmit={handleSubmit}>
        <main className={styles.content}>

          {/* ─── STEP 1: FREQUENCY ────────────────────────── */}
          {step === 1 && (
            <>
              {/* Receta banner */}
              {recetaSuggestions && (recetaSuggestions.rawGramaje || recetaSuggestions.rawProtocolo || (recetaSuggestions.totalMicro ?? 0) > 0 || recetaSuggestions.inferred) && (
                <div className={styles.recetaBanner}>
                  <Pill size={22} weight="duotone" className={styles.recetaIcon} />
                  <div>
                    <p className={styles.recetaTitle}>Tu receta sugiere</p>
                    <p className={styles.recetaDetail}>
                      {recetaSuggestions.rawGramaje && (<>Dosis: <strong>{recetaSuggestions.rawGramaje}</strong> · </>)}
                      {recetaSuggestions.rawProtocolo && (<>Protocolo: <strong>{recetaSuggestions.rawProtocolo}</strong> · </>)}
                      {!recetaSuggestions.rawProtocolo && recetaSuggestions.inferred && recetaSuggestions.everyXDays && (
                        <>Frecuencia estimada: <strong>cada {recetaSuggestions.everyXDays} días</strong> · </>
                      )}
                      {(recetaSuggestions.totalMicro ?? 0) > 0 && <>{recetaSuggestions.totalMicro} cápsulas autorizadas</>}
                      {recetaSuggestions.rawDuracion && (<> · Duración: <strong>{recetaSuggestions.rawDuracion}</strong></>)}
                    </p>
                  </div>
                </div>
              )}

              <div className={styles.stepHeader}>
                <h2 className={styles.stepTitle}>¿Cuál es tu frecuencia?</h2>
                <p className={styles.stepSubtitle}>
                  Selecciona el ritmo de microdosis que mejor se adapte a tus objetivos y estilo de vida.
                </p>
              </div>

              {/* Frequency radio cards */}
              <div className={styles.radioGroup}>
                {FREQ_OPTIONS.map(opt => {
                  const isActive = protocol.frequency === opt.value;
                  const isSuggested = suggestedFreq === opt.value && !isActive;
                  return (
                    <label
                      key={opt.value}
                      className={`${styles.radioCard} ${isActive ? styles.radioCardActive : ''} ${isSuggested ? styles.radioCardSuggested : ''}`}
                    >
                      <div className={styles.radioCheck}>
                        <input
                          type="radio"
                          name="frequency"
                          value={opt.value}
                          checked={isActive}
                          onChange={(e) => handleFrequencyChange(e.target.value)}
                        />
                      </div>
                      <div className={styles.radioBody}>
                        <div className={styles.radioTitleRow}>
                          <opt.Icon size={20} weight={isActive ? 'fill' : 'duotone'} className={styles.radioFreqIcon} />
                          <span className={styles.radioLabel}>{opt.label}</span>
                        </div>
                        <p className={styles.radioPattern}>{opt.pattern}</p>
                        <p className={styles.radioDesc}>{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Conditional sub-inputs */}
              {protocol.frequency === 'every_x_days' && (
                <div className={styles.subInput}>
                  <label className={styles.subInputLabel}>Cada cuántos días:</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    value={everyXDays}
                    onChange={(e) => setEveryXDays(parseInt(e.target.value) || 3)}
                    className={styles.numberInput}
                  />
                  <p className={styles.hint}>Ejemplo: cada 3 días</p>
                </div>
              )}

              {protocol.frequency === 'specific_days' && (
                <div className={styles.subInput}>
                  <label className={styles.subInputLabel}>Selecciona los días:</label>
                  <div className={styles.daysGrid}>
                    {Object.keys(customDays).map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`${styles.dayButton} ${customDays[day as keyof CustomDays] ? styles.dayButtonActive : ''}`}
                        onClick={() => handleDayToggle(day as keyof CustomDays)}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {protocol.frequency === 'custom' && (
                <div className={styles.subInput}>
                  <label className={styles.subInputLabel}>Patrón personalizado:</label>
                  <div className={styles.patternRow}>
                    <div className={styles.patternField}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={10}
                        value={customPattern.on}
                        onChange={(e) => setCustomPattern(prev => ({ ...prev, on: parseInt(e.target.value) || 1 }))}
                        className={styles.numberInput}
                      />
                      <span>días ON</span>
                    </div>
                    <div className={styles.patternField}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={10}
                        value={customPattern.off}
                        onChange={(e) => setCustomPattern(prev => ({ ...prev, off: parseInt(e.target.value) || 2 }))}
                        className={styles.numberInput}
                      />
                      <span>días OFF</span>
                    </div>
                  </div>
                </div>
              )}

              {isIntuitive && (
                <div className={styles.intuitiveNote}>
                  <Sparkle size={20} weight="fill" />
                  <p>No recibirás recordatorios ni tendrás días programados. Simplemente registra tus dosis cuando lo desees.</p>
                </div>
              )}
            </>
          )}

          {/* ─── STEP 2: DOSE & TIME ─────────────────────── */}
          {step === 2 && (
            <>
              <div className={`${styles.stepHeader} ${styles.stepHeaderCentered}`}>
                <h2 className={`${styles.stepTitle} ${styles.stepTitlePrimary}`}>Dosis{!isIntuitive ? ' y Horario' : ''}</h2>
                <p className={styles.stepSubtitle}>
                  {isIntuitive
                    ? 'Define la cantidad para tu toma.'
                    : 'Define la cantidad y el momento ideal para tu toma diaria.'}
                </p>
              </div>

              {/* Dose Card */}
              <section className={styles.configSection}>
                <label className={styles.sectionLabel}>Definir Dosis</label>
                <div className={styles.configCard}>
                  {recetaSuggestions?.dose && (
                    <div className={styles.doseRecommend}>
                      <div className={styles.doseRecommendIcon}>
                        <Pill size={20} weight="duotone" />
                      </div>
                      <div className={styles.doseRecommendText}>
                        <p className={styles.recommendedTag}>Recomendado</p>
                        <p className={styles.recommendedDesc}>
                          Basado en tu prescripción activa, te sugerimos comenzar con una dosis baja.
                        </p>
                      </div>
                    </div>
                  )}

                  <DosePicker
                    selectedDose={Number(protocol.dose)}
                    onSelect={(val) => setProtocol(prev => ({ ...prev, dose: val }))}
                    recommendedDose={recetaSuggestions?.dose ?? null}
                    extraOptions={extraDoseOptions}
                  />

                  {(recetaSuggestions?.totalMicro ?? 0) > 0 && (
                    <p className={styles.stockInfo}>
                      Stock disponible: {recetaSuggestions!.totalMicro} caps ({protocol.dose}g c/u)
                    </p>
                  )}
                </div>
              </section>

              {/* Time Card */}
              {!isIntuitive && (
                <section className={styles.configSection}>
                  <label className={styles.sectionLabel}>Recordatorio Diario</label>
                  <div className={styles.timeCard}>
                    <div className={styles.timeLabel}>
                      <SunHorizon size={18} weight="duotone" />
                      <span>Hora de la toma</span>
                    </div>

                    <div className={styles.timeDisplayWrap}>
                      <div className={styles.timeBlock}>
                        <span className={styles.timeValue}>{timeDisplay.hours}</span>
                        <span className={styles.timeBlockLabel}>Hora</span>
                      </div>
                      <span className={styles.timeSeparator}>:</span>
                      <div className={styles.timeBlock}>
                        <span className={styles.timeValue}>{timeDisplay.minutes}</span>
                        <span className={styles.timeBlockLabel}>Min</span>
                      </div>
                      <input
                        type="time"
                        className={styles.timeHiddenInput}
                        value={protocol.doseTime}
                        onChange={(e) => setProtocol(prev => ({ ...prev, doseTime: e.target.value }))}
                      />
                    </div>

                    <div className={styles.ampmToggle}>
                      <button
                        type="button"
                        className={`${styles.ampmBtn} ${timeDisplay.isAM ? styles.ampmActive : ''}`}
                        onClick={() => !timeDisplay.isAM && toggleAMPM()}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        className={`${styles.ampmBtn} ${!timeDisplay.isAM ? styles.ampmActive : ''}`}
                        onClick={() => timeDisplay.isAM && toggleAMPM()}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Duration */}
              {!isIntuitive && (
                <section className={styles.configSection}>
                  <label className={styles.sectionLabel}>
                    Duración del Protocolo <span className={styles.optional}>(Opcional)</span>
                  </label>
                  <div className={styles.configCard}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={365}
                      value={protocol.duration || ''}
                      onChange={(e) => setProtocol(prev => ({ ...prev, duration: e.target.value }))}
                      className={styles.durationInput}
                      placeholder="Ej: 30 días"
                    />
                    <p className={styles.hint}>¿Por cuántos días planeas seguir este protocolo?</p>
                    {estimatedDuration && (
                      <p className={styles.durationHint}>
                        <Pill size={14} weight="fill" /> Con {recetaSuggestions?.totalMicro} cápsulas: ~{estimatedDuration} días
                      </p>
                    )}
                    {recetaSuggestions?.rawDuracion && (
                      <p className={styles.durationHint}>
                        <Pill size={14} weight="fill" /> Receta sugiere: {recetaSuggestions.rawDuracion}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Summary for intuitive (last step) */}
              {isIntuitive && renderSummary()}
            </>
          )}

          {/* ─── STEP 3: DATE + SUMMARY (non-intuitive) ──── */}
          {step === 3 && !isIntuitive && (
            <>
              <div className={styles.stepHeader}>
                <h2 className={`${styles.stepTitle} ${styles.stepTitleLarge}`}>Fecha de Inicio</h2>
                <p className={styles.stepSubtitle}>
                  Selecciona cuándo quieres comenzar tu protocolo. Recomendamos empezar un día sin grandes compromisos.
                </p>
              </div>

              {renderCalendar()}
              {renderSummary()}

              <div className={styles.infoNote}>
                <Info size={20} weight="fill" className={styles.infoIcon} />
                <p>Podrás ajustar la dosis y el horario en cualquier momento desde la configuración de tu perfil.</p>
              </div>
            </>
          )}
        </main>

        {/* ═══ FOOTER ═══ */}
        <footer className={`${styles.footer} ${step === 1 ? styles.footerGradient : ''}`}>
          <div className={styles.footerInner}>
            {step === 1 && (
              <button
                type="button"
                className={styles.continueFullBtn}
                onClick={handleNext}
                disabled={!canAdvance()}
              >
                Continuar
                <ArrowRight size={20} weight="bold" />
              </button>
            )}

            {step > 1 && step < totalSteps && (
              <>
                <button type="button" className={styles.prevBtn} onClick={() => setStep(step - 1)}>
                  Anterior
                </button>
                <button type="button" className={styles.continueBtn} onClick={handleNext}>
                  Continuar
                  <ArrowRight size={20} weight="bold" />
                </button>
              </>
            )}

            {step === totalSteps && step > 1 && (
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Protocolo'}
                {!loading && <CheckCircle size={20} weight="bold" />}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
};

export default ProtocolConfig;
