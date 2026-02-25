import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useToast } from './Toast';
import { trackEvent } from '../utils/analytics';
import { useBaseline, useSaveBaseline } from '../hooks/queries';
import useSwipeBack from '../hooks/useSwipeBack';
import styles from './BaselineForm.module.css';
import type { Baseline } from '../types';
import { calculateDASS, calculatePANAS, calculatePSS, getSeverityColor } from '../utils/followUpScoring';
import { dassQuestions, panasPositive, panasNegative, pssQuestions } from '../utils/assessmentQuestions';
import { useUser } from '../hooks/useUser';

interface BaselineFormData {
  [key: string]: string | number | string[] | null;
}

const BaselineForm: React.FC = () => {
  const toast = useToast()!;
  const navigate = useNavigate();
  const { user } = useUser();
  useSwipeBack();
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [subStep, setSubStep] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [existingBaseline, setExistingBaseline] = useState<Baseline | null>(null);

  const sectionSubSteps: Record<string, number> = {
    datos: 1, motivacion: 1, expectativas: 1, historia: 1, salud: 1,
    dass: 3, panas: 2, estres: 2, funcionamiento: 1
  };

  const [formData, setFormData] = useState<BaselineFormData>({
    age_range: '', gender: '', country: '', education: '', occupation: '',
    motivations: [], main_expectation: '', effectiveness_belief: 5,
    psychedelic_belief: 5, placebo_belief: 5, suggestibility: 5,
    positive_experiences_heard: '', fears_doubts: '',
    psychedelic_experience: '', alcohol_frequency: '', cannabis_frequency: '',
    nicotine_frequency: '', stimulants_frequency: '', psychiatric_medication: '',
    mental_health_concerns: [], in_therapy: '', psychiatric_treatment: '',
    dass_1: null, dass_2: null, dass_3: null, dass_4: null, dass_5: null,
    dass_6: null, dass_7: null, dass_8: null, dass_9: null, dass_10: null,
    dass_11: null, dass_12: null, dass_13: null, dass_14: null, dass_15: null,
    dass_16: null, dass_17: null, dass_18: null, dass_19: null, dass_20: null, dass_21: null,
    panas_1: null, panas_2: null, panas_3: null, panas_4: null, panas_5: null,
    panas_6: null, panas_7: null, panas_8: null, panas_9: null, panas_10: null,
    panas_11: null, panas_12: null, panas_13: null, panas_14: null, panas_15: null,
    panas_16: null, panas_17: null, panas_18: null, panas_19: null, panas_20: null,
    pss_1: null, pss_2: null, pss_3: null, pss_4: null, pss_5: null,
    pss_6: null, pss_7: null, pss_8: null, pss_9: null, pss_10: null,
    usual_focus: 5, usual_creativity: 5, usual_energy: 5, life_satisfaction: 5
  });

  const sections = [
    { id: 'datos', title: 'Datos Generales', icon: '👤', description: 'Tu información básica' },
    { id: 'motivacion', title: 'Motivación', icon: '🎯', description: 'Por qué te interesa' },
    { id: 'expectativas', title: 'Expectativas', icon: '💭', description: 'Qué esperas del proceso' },
    { id: 'historia', title: 'Historia de Uso', icon: '📜', description: 'Tu experiencia previa' },
    { id: 'salud', title: 'Salud Mental', icon: '🧠', description: 'Tu estado actual' },
    { id: 'dass', title: 'DASS-21', icon: '📊', description: 'Depresión, ansiedad, estrés' },
    { id: 'panas', title: 'PANAS', icon: '😊', description: 'Afecto positivo y negativo' },
    { id: 'estres', title: 'Estrés Percibido', icon: '😰', description: 'Escala PSS-10' },
    { id: 'funcionamiento', title: 'Funcionamiento', icon: '⚡', description: 'Tu nivel basal' }
  ];

  const { data: existingBaselineData } = useBaseline(user?.id);
  const saveMutation = useSaveBaseline();

  useEffect(() => {
    if (existingBaselineData) {
      setExistingBaseline(existingBaselineData as Baseline);
      setFormData(prev => ({ ...prev, ...existingBaselineData }));
      setIsLocked((existingBaselineData as Baseline).is_locked === true);
    }
  }, [existingBaselineData]);

  const handleChange = (field: string, value: string | number) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMultiSelect = (field: string, value: string) => {
    if (isLocked) return;
    setFormData(prev => {
      const current = (prev[field] || []) as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v: string) => v !== value) };
      } else if (current.length < 3) {
        return { ...prev, [field]: [...current, value] };
      }
      return prev;
    });
  };

  const isSubStepComplete = (sectionIndex: number, sub: number): boolean => {
    const sectionId = sections[sectionIndex]?.id;
    switch (sectionId) {
      case 'datos':
        return !!formData.age_range && !!formData.country;
      case 'motivacion':
        return Array.isArray(formData.motivations) && (formData.motivations as string[]).length > 0;
      case 'expectativas':
        return true; // optional fields
      case 'historia':
        return !!formData.psychedelic_experience;
      case 'salud':
        return true; // optional fields
      case 'dass': {
        const start = sub * 7;
        return Array.from({ length: 7 }, (_, i) => `dass_${start + i + 1}`).every(k => formData[k] !== null && formData[k] !== undefined);
      }
      case 'panas': {
        const items = sub === 0 ? panasPositive : panasNegative;
        return items.every(({ key }) => formData[key] !== null && formData[key] !== undefined);
      }
      case 'estres': {
        const start = sub * 5;
        return Array.from({ length: 5 }, (_, i) => `pss_${start + i + 1}`).every(k => formData[k] !== null && formData[k] !== undefined);
      }
      case 'funcionamiento':
        return true; // sliders have defaults
      default:
        return true;
    }
  };

  const isSectionComplete = (sectionIndex: number): boolean => {
    const sectionId = sections[sectionIndex]?.id;
    const totalSubs = sectionSubSteps[sectionId] || 1;
    for (let s = 0; s < totalSubs; s++) {
      if (!isSubStepComplete(sectionIndex, s)) return false;
    }
    return true;
  };

  const handleSave = async (goNext: boolean = true) => {
    if (isLocked) return;

    const sectionId = sections[currentSection].id;
    const totalSubSteps = sectionSubSteps[sectionId] || 1;
    const isLastSubStep = subStep >= totalSubSteps - 1;

    // Validate current sub-step before advancing
    if (goNext && !isSubStepComplete(currentSection, subStep)) {
      toast.error('Completa todos los campos antes de continuar');
      return;
    }

    // If not last sub-step, just advance sub-step (no save to backend)
    if (goNext && !isLastSubStep) {
      setSubStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const isLastSection = currentSection === sections.length - 1 && goNext;
      const dataToSave: Record<string, unknown> = {
        user_id: user!.id,
        ...formData,
      };
      // Solo modificar is_locked/locked_at al finalizar; en guardados intermedios preservar estado existente
      if (isLastSection) {
        dataToSave.is_locked = true;
        dataToSave.locked_at = new Date().toISOString();
      } else if (existingBaseline?.is_locked) {
        dataToSave.is_locked = true;
        dataToSave.locked_at = existingBaseline.locked_at;
      } else {
        dataToSave.is_locked = false;
        dataToSave.locked_at = null;
      }

      await saveMutation.mutateAsync(dataToSave);

      if (goNext) {
        if (currentSection === sections.length - 1) {
          trackEvent('baseline_completed');
          toast.success('¡Baseline completado!');
          navigate('/dashboard');
        } else {
          setCurrentSection(prev => prev + 1);
          setSubStep(0);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (error) {
      toast.error('Error al guardar baseline');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (subStep > 0) {
      setSubStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentSection > 0) {
      const prevSectionId = sections[currentSection - 1].id;
      const prevSubSteps = sectionSubSteps[prevSectionId] || 1;
      setCurrentSection(prev => prev - 1);
      setSubStep(prevSubSteps - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/dashboard');
    }
  };

  const navigateToSection = (index: number) => {
    if (index !== currentSection) {
      if (currentSection > 0) {
        handleSave(false);
      }
      setCurrentSection(index);
      setSubStep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalSteps = sections.reduce((sum, s) => sum + (sectionSubSteps[s.id] || 1), 0);
  const completedSteps = sections.slice(0, currentSection).reduce((sum, s) => sum + (sectionSubSteps[s.id] || 1), 0) + subStep + 1;
  const progress = (completedSteps / totalSteps) * 100;

  // VISTA DE BASELINE BLOQUEADO - Análisis completo
  if (isLocked) {
    const dass = calculateDASS(formData);
    const panas = calculatePANAS(formData);
    const pss = calculatePSS(formData);
    const lifeSat = Number(formData.life_satisfaction ?? 0);

    const motivationLabels: Record<string, string> = {
      animo: '😊 Ánimo', ansiedad: '😰 Ansiedad', foco: '🎯 Foco',
      creatividad: '🎨 Creatividad', espiritualidad: '🙏 Espiritualidad',
      relaciones: '❤️ Relaciones', productividad: '📈 Productividad', curiosidad: '🤔 Curiosidad'
    };

    const experienceLabels: Record<string, string> = {
      ninguna: 'Ninguna', una_vez: 'Una vez', algunas: 'Algunas veces', muchas: 'Muchas veces'
    };

    const frequencyLabels: Record<string, string> = {
      nunca: 'Nunca', ocasional: 'Ocasional', semanal: 'Semanal', diario: 'Diario'
    };

    const concernLabels: Record<string, string> = {
      ninguna: 'Ninguna', ansiedad: 'Ansiedad', depresion: 'Depresión',
      trauma: 'Trauma', bipolaridad: 'Bipolaridad', adiccion: 'Adicción', otra: 'Otra'
    };

    return (
      <div className={`${styles.baseline} ${styles.baselineResults}`}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
          <h1 className={styles.title}>Resultados Baseline</h1>
          <div style={{ width: 36 }}></div>
        </div>

        <div className={styles.analysisContent}>
          {/* Banner */}
          <div className={styles.analysisBanner}>
            <span className={styles.analysisBannerIcon}>📋</span>
            <div>
              <h2>Tu Evaluación Inicial</h2>
              <p>Completado el {existingBaseline?.locked_at ? new Date(existingBaseline.locked_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
            </div>
          </div>

          {/* Perfil */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>👤</span>
              <h3>Perfil</h3>
            </div>
            <div className={styles.profileGrid}>
              {formData.age_range && <div className={styles.profileItem}><span className={styles.profileLabel}>Edad</span><span className={styles.profileValue}>{formData.age_range}</span></div>}
              {formData.country && <div className={styles.profileItem}><span className={styles.profileLabel}>País</span><span className={styles.profileValue}>{formData.country}</span></div>}
              {formData.education && <div className={styles.profileItem}><span className={styles.profileLabel}>Educación</span><span className={styles.profileValue}>{formData.education}</span></div>}
              {formData.occupation && <div className={styles.profileItem}><span className={styles.profileLabel}>Ocupación</span><span className={styles.profileValue}>{formData.occupation}</span></div>}
            </div>
          </div>

          {/* Motivaciones */}
          {(formData.motivations as string[])?.length > 0 && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>🎯</span>
                <h3>Motivaciones</h3>
              </div>
              <div className={styles.chipGroup}>
                {(formData.motivations as string[]).map(m => (
                  <span key={m} className={styles.chip}>{motivationLabels[m] || m}</span>
                ))}
              </div>
              {formData.main_expectation && (
                <p className={styles.analysisNote}>{formData.main_expectation}</p>
              )}
            </div>
          )}

          {/* Expectativas */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>💭</span>
              <h3>Expectativas</h3>
            </div>
            <div className={styles.gaugeGroup}>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Efectividad esperada</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.effectiveness_belief || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.effectiveness_belief}/10</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Creencia psicodélica</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.psychedelic_belief || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.psychedelic_belief}/10</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Efecto placebo</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.placebo_belief || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.placebo_belief}/10</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Sugestionabilidad</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.suggestibility || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.suggestibility}/10</span>
              </div>
            </div>
          </div>

          {/* Historia de uso */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>📜</span>
              <h3>Historia de Uso</h3>
            </div>
            <div className={styles.profileGrid}>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Exp. psicodélica</span>
                <span className={styles.profileValue}>{experienceLabels[formData.psychedelic_experience as string] || 'N/A'}</span>
              </div>
              {formData.alcohol_frequency && <div className={styles.profileItem}><span className={styles.profileLabel}>Alcohol</span><span className={styles.profileValue}>{frequencyLabels[formData.alcohol_frequency as string] || formData.alcohol_frequency}</span></div>}
              {formData.cannabis_frequency && <div className={styles.profileItem}><span className={styles.profileLabel}>Cannabis</span><span className={styles.profileValue}>{frequencyLabels[formData.cannabis_frequency as string] || formData.cannabis_frequency}</span></div>}
              {formData.nicotine_frequency && <div className={styles.profileItem}><span className={styles.profileLabel}>Nicotina</span><span className={styles.profileValue}>{frequencyLabels[formData.nicotine_frequency as string] || formData.nicotine_frequency}</span></div>}
              {formData.stimulants_frequency && <div className={styles.profileItem}><span className={styles.profileLabel}>Estimulantes</span><span className={styles.profileValue}>{frequencyLabels[formData.stimulants_frequency as string] || formData.stimulants_frequency}</span></div>}
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Med. psiquiátrica</span>
                <span className={styles.profileValue}>{formData.psychiatric_medication === 'si' ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Salud mental */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>🧠</span>
              <h3>Salud Mental</h3>
            </div>
            {(formData.mental_health_concerns as string[])?.length > 0 && (
              <div className={styles.chipGroup}>
                {(formData.mental_health_concerns as string[]).map(c => (
                  <span key={c} className={styles.chip}>{concernLabels[c] || c}</span>
                ))}
              </div>
            )}
            <div className={styles.profileGrid}>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>En terapia</span>
                <span className={styles.profileValue}>{formData.in_therapy === 'si' ? 'Sí' : 'No'}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Tto. psiquiátrico</span>
                <span className={styles.profileValue}>{formData.psychiatric_treatment === 'si' ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* DASS-21 */}
          {dass && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>📊</span>
                <h3>DASS-21</h3>
              </div>
              <p className={styles.analysisCardSubtitle}>Depresión, Ansiedad y Estrés</p>
              <div className={styles.analysisScores}>
                {([
                  { label: 'Depresión', data: dass.depression, max: 42 },
                  { label: 'Ansiedad', data: dass.anxiety, max: 42 },
                  { label: 'Estrés', data: dass.stress, max: 42 },
                ] as const).map(({ label, data, max }) => (
                  <div key={label} className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>{label}</span>
                    <div className={styles.scoreBarContainer}>
                      <div className={styles.scoreBar} style={{ width: `${Math.min(data.scaled / max * 100, 100)}%`, backgroundColor: getSeverityColor(data.severity) }} />
                    </div>
                    <span className={styles.scoreValue}>{data.scaled}</span>
                    <span className={styles.scoreSeverity} style={{ color: getSeverityColor(data.severity) }}>{data.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PANAS */}
          {panas && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>😊</span>
                <h3>PANAS</h3>
              </div>
              <p className={styles.analysisCardSubtitle}>Afecto Positivo y Negativo</p>
              <div className={styles.analysisScores}>
                <div className={styles.scoreRow}>
                  <span className={styles.scoreLabel}>Positivo</span>
                  <div className={styles.scoreBarContainer}>
                    <div className={styles.scoreBar} style={{ width: `${(panas.positiveAffect / 50) * 100}%`, backgroundColor: panas.positiveAffect >= 28 ? '#4CAF50' : '#FF9800' }} />
                  </div>
                  <span className={styles.scoreValue}>{panas.positiveAffect}/50</span>
                  <span className={styles.scoreSeverity} style={{ color: panas.positiveAffect >= 38 ? '#4CAF50' : panas.positiveAffect >= 28 ? '#FF9800' : '#F44336' }}>{panas.paLabel}</span>
                </div>
                <div className={styles.scoreRow}>
                  <span className={styles.scoreLabel}>Negativo</span>
                  <div className={styles.scoreBarContainer}>
                    <div className={styles.scoreBar} style={{ width: `${(panas.negativeAffect / 50) * 100}%`, backgroundColor: getSeverityColor(panas.naLabel) }} />
                  </div>
                  <span className={styles.scoreValue}>{panas.negativeAffect}/50</span>
                  <span className={styles.scoreSeverity} style={{ color: getSeverityColor(panas.naLabel) }}>{panas.naLabel}</span>
                </div>
              </div>
            </div>
          )}

          {/* PSS-10 */}
          {pss && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>😰</span>
                <h3>Estrés Percibido (PSS-10)</h3>
              </div>
              <div className={styles.analysisScores}>
                <div className={styles.scoreRow}>
                  <span className={styles.scoreLabel}>Puntaje</span>
                  <div className={styles.scoreBarContainer}>
                    <div className={styles.scoreBar} style={{ width: `${(pss.total / 40) * 100}%`, backgroundColor: getSeverityColor(pss.severity) }} />
                  </div>
                  <span className={styles.scoreValue}>{pss.total}/40</span>
                  <span className={styles.scoreSeverity} style={{ color: getSeverityColor(pss.severity) }}>{pss.severity}</span>
                </div>
              </div>
            </div>
          )}

          {/* Funcionamiento y Satisfacción */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>⚡</span>
              <h3>Funcionamiento Basal</h3>
            </div>
            <div className={styles.gaugeGroup}>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Foco habitual</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.usual_focus || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.usual_focus}/10</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Creatividad habitual</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.usual_creativity || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.usual_creativity}/10</span>
              </div>
              <div className={styles.gaugeItem}>
                <span className={styles.gaugeLabel}>Energía habitual</span>
                <div className={styles.gaugeBarContainer}>
                  <div className={styles.gaugeBar} style={{ width: `${Number(formData.usual_energy || 0) * 10}%` }} />
                </div>
                <span className={styles.gaugeValue}>{formData.usual_energy}/10</span>
              </div>
            </div>
          </div>

          {/* Satisfacción Vital */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisCardHeader}>
              <span>⭐</span>
              <h3>Satisfacción Vital</h3>
            </div>
            <div className={styles.lifeSatDisplay}>
              <span className={styles.lifeSatValue}>{lifeSat}</span>
              <span className={styles.lifeSatMax}>/10</span>
            </div>
            <div className={styles.lifeSatBar}>
              <div className={styles.lifeSatFill} style={{ width: `${lifeSat * 10}%` }} />
            </div>
          </div>

          {/* Volver */}
          <div className={styles.analysisActions}>
            <p className={styles.contactAdmin}>
              Si necesitas modificar tu baseline, contacta al administrador.
            </p>
            <button className={styles.backToDashboard} onClick={() => navigate('/dashboard')}>
              ← Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER SECTIONS
  const renderDatosGenerales = () => (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label>Rango de edad</label>
        <div className={styles.options}>
          {['18-24', '25-34', '35-44', '45-54', '55+'].map(opt => (
            <button key={opt} type="button"
              className={`${styles.option} ${formData.age_range === opt ? styles.selected : ''}`}
              onClick={() => handleChange('age_range', opt)}>{opt}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>Género (opcional)</label>
        <div className={styles.options}>
          {[['mujer','Mujer'],['hombre','Hombre'],['no_binario','No binario'],['prefiero_no_decir','Prefiero no decir']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.gender === v ? styles.selected : ''}`}
              onClick={() => handleChange('gender', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>País o región</label>
        <input type="text" className={styles.input} value={formData.country as string ?? ''}
          onChange={(e) => handleChange('country', e.target.value)} placeholder="Ej: Chile, México..." />
      </div>

      <div className={styles.field}>
        <label>Nivel educativo</label>
        <div className={styles.options}>
          {[['basico','Básico'],['medio','Medio'],['tecnico','Técnico'],['universitario','Universitario'],['postgrado','Postgrado']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.education === v ? styles.selected : ''}`}
              onClick={() => handleChange('education', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>Situación actual</label>
        <div className={styles.options}>
          {[['trabajo_completo','Trabajo completo'],['trabajo_parcial','Parcial'],['estudio','Estudio'],['desempleo','Desempleo'],['independiente','Independiente'],['otra','Otra']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.occupation === v ? styles.selected : ''}`}
              onClick={() => handleChange('occupation', v)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMotivacion = () => (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label>¿Por qué te interesa microdosificar? (máx 3)</label>
        <div className={styles.options}>
          {[['animo','😊 Ánimo'],['ansiedad','😰 Ansiedad'],['foco','🎯 Foco'],['creatividad','🎨 Creatividad'],['espiritualidad','🙏 Espiritualidad'],['relaciones','❤️ Relaciones'],['productividad','📈 Productividad'],['curiosidad','🤔 Curiosidad']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${(formData.motivations as string[])?.includes(v) ? styles.selected : ''}`}
              onClick={() => handleMultiSelect('motivations', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>¿Qué esperas que cambie principalmente?</label>
        <textarea className={styles.textarea} value={formData.main_expectation ?? undefined}
          onChange={(e) => handleChange('main_expectation', e.target.value)}
          placeholder="Describe con tus palabras..." rows={3} />
      </div>

      <div className={styles.field}>
        <label>¿Qué tan efectivo crees que será? (0-10): {formData.effectiveness_belief}</label>
        <input type="range" min="0" max="10" value={formData.effectiveness_belief ?? undefined}
          onChange={(e) => handleChange('effectiveness_belief', parseInt(e.target.value))}
          className={styles.slider} />
        <div className={styles.sliderLabels}><span>Nada</span><span>Muy efectivo</span></div>
      </div>
    </div>
  );

  const renderExpectativas = () => (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label>Creencia en efectos psicodélicos (0-10): {formData.psychedelic_belief}</label>
        <input type="range" min="0" max="10" value={formData.psychedelic_belief ?? undefined}
          onChange={(e) => handleChange('psychedelic_belief', parseInt(e.target.value))}
          className={styles.slider} />
      </div>

      <div className={styles.field}>
        <label>Creencia en efecto placebo (0-10): {formData.placebo_belief}</label>
        <input type="range" min="0" max="10" value={formData.placebo_belief ?? undefined}
          onChange={(e) => handleChange('placebo_belief', parseInt(e.target.value))}
          className={styles.slider} />
      </div>

      <div className={styles.field}>
        <label>Sugestionabilidad personal (0-10): {formData.suggestibility}</label>
        <input type="range" min="0" max="10" value={formData.suggestibility ?? undefined}
          onChange={(e) => handleChange('suggestibility', parseInt(e.target.value))}
          className={styles.slider} />
      </div>

      <div className={styles.field}>
        <label>¿Qué experiencias positivas has escuchado?</label>
        <textarea className={styles.textarea} value={formData.positive_experiences_heard ?? undefined}
          onChange={(e) => handleChange('positive_experiences_heard', e.target.value)} rows={3} />
      </div>

      <div className={styles.field}>
        <label>¿Qué miedos o dudas tienes?</label>
        <textarea className={styles.textarea} value={formData.fears_doubts ?? undefined}
          onChange={(e) => handleChange('fears_doubts', e.target.value)} rows={3} />
      </div>
    </div>
  );

  const renderHistoria = () => (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label>Experiencia previa con psicodélicos</label>
        <div className={styles.options}>
          {[['ninguna','Ninguna'],['una_vez','Una vez'],['algunas','Algunas veces'],['muchas','Muchas veces']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.psychedelic_experience === v ? styles.selected : ''}`}
              onClick={() => handleChange('psychedelic_experience', v)}>{l}</button>
          ))}
        </div>
      </div>

      {[['alcohol','Alcohol'], ['cannabis','Cannabis'], ['nicotine','Nicotina'], ['stimulants','Estimulantes']].map(([key, label]) => (
        <div key={key} className={styles.field}>
          <label>Uso de {label}</label>
          <div className={styles.options}>
            {[['nunca','Nunca'],['ocasional','Ocasional'],['semanal','Semanal'],['diario','Diario']].map(([v,l]) => (
              <button key={v} type="button"
                className={`${styles.option} ${formData[`${key}_frequency`] === v ? styles.selected : ''}`}
                onClick={() => handleChange(`${key}_frequency`, v)}>{l}</button>
            ))}
          </div>
        </div>
      ))}

      <div className={styles.field}>
        <label>¿Tomas medicación psiquiátrica?</label>
        <div className={styles.options}>
          {[['no','No'],['si','Sí']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.psychiatric_medication === v ? styles.selected : ''}`}
              onClick={() => handleChange('psychiatric_medication', v)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSaludMental = () => (
    <div className={styles.fields}>
      <div className={styles.field}>
        <label>Preocupaciones actuales</label>
        <div className={styles.options}>
          {[['ninguna','Ninguna'],['ansiedad','Ansiedad'],['depresion','Depresión'],['trauma','Trauma'],['bipolaridad','Bipolaridad'],['adiccion','Adicción'],['otra','Otra']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${(formData.mental_health_concerns as string[])?.includes(v) ? styles.selected : ''}`}
              onClick={() => handleMultiSelect('mental_health_concerns', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>¿Estás en terapia psicológica?</label>
        <div className={styles.options}>
          {[['no','No'],['si','Sí']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.in_therapy === v ? styles.selected : ''}`}
              onClick={() => handleChange('in_therapy', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label>¿Tienes tratamiento psiquiátrico?</label>
        <div className={styles.options}>
          {[['no','No'],['si','Sí']].map(([v,l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.psychiatric_treatment === v ? styles.selected : ''}`}
              onClick={() => handleChange('psychiatric_treatment', v)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const dassScaleLabels = ['No me pasó', 'Un poco', 'Bastante', 'Mucho'];

  const renderDASS21 = () => {
    const start = subStep * 7;
    const questions = dassQuestions.slice(start, start + 7);
    return (
      <div className={styles.fields}>
        <p className={styles.instructions}>
          Indica cuánto te ha afectado cada situación <strong>durante la última semana</strong>.
        </p>
        <div className={styles.scaleKey}>
          {dassScaleLabels.map((label, i) => (
            <span key={i} className={styles.scaleKeyItem}>{i} = {label}</span>
          ))}
        </div>
        {questions.map((q, i) => {
          const globalIndex = start + i;
          return (
            <div key={globalIndex} className={styles.questionCard}>
              <label className={styles.questionLabel}>
                <span className={styles.questionNumber}>{globalIndex + 1}</span> {q}
              </label>
              <div className={styles.scaleOptions}>
                {[0, 1, 2, 3].map(val => (
                  <button key={val} type="button"
                    className={`${styles.scaleOption} ${formData[`dass_${globalIndex + 1}`] === val ? styles.selected : ''}`}
                    onClick={() => handleChange(`dass_${globalIndex + 1}`, val)}>
                    <span className={styles.scaleOptionNumber}>{val}</span>
                    <span className={styles.scaleOptionLabel}>{dassScaleLabels[val]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const panasScaleLabels = ['', 'Nada', 'Un poco', 'Moderado', 'Bastante', 'Mucho'];

  const renderPANAS = () => {
    const items = subStep === 0 ? panasPositive : panasNegative;
    const subTitle = subStep === 0 ? 'Afecto Positivo' : 'Afecto Negativo';
    return (
      <div className={styles.fields}>
        <p className={styles.instructions}>
          Indica cuánto has sentido cada emoción <strong>durante la última semana</strong>.
        </p>
        <div className={styles.scaleKey}>
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={styles.scaleKeyItem}>{i} = {panasScaleLabels[i]}</span>
          ))}
        </div>
        <h3 className={styles.subTitle}>{subTitle}</h3>
        {items.map(({ key, label }) => (
          <div key={key} className={styles.questionCard}>
            <label className={styles.questionLabel}>{label}</label>
            <div className={styles.scaleOptions}>
              {[1, 2, 3, 4, 5].map(val => (
                <button key={val} type="button"
                  className={`${styles.scaleOption} ${formData[key] === val ? styles.selected : ''}`}
                  onClick={() => handleChange(key, val)}>
                  <span className={styles.scaleOptionNumber}>{val}</span>
                  <span className={styles.scaleOptionLabel}>{panasScaleLabels[val]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const pssScaleLabels = ['Nunca', 'Casi nunca', 'A veces', 'Frecuente', 'Muy frecuente'];

  const renderEstres = () => {
    const start = subStep * 5;
    const questions = pssQuestions.slice(start, start + 5);
    return (
      <div className={styles.fields}>
        <p className={styles.instructions}>
          Indica con qué frecuencia te has sentido así <strong>durante el último mes</strong>.
        </p>
        <div className={styles.scaleKey}>
          {pssScaleLabels.map((label, i) => (
            <span key={i} className={styles.scaleKeyItem}>{i} = {label}</span>
          ))}
        </div>
        {questions.map(({ key, label }) => (
          <div key={key} className={styles.questionCard}>
            <label className={styles.questionLabel}>{label}</label>
            <div className={styles.scaleOptions}>
              {[0, 1, 2, 3, 4].map(val => (
                <button key={val} type="button"
                  className={`${styles.scaleOption} ${formData[key] === val ? styles.selected : ''}`}
                  onClick={() => handleChange(key, val)}>
                  <span className={styles.scaleOptionNumber}>{val}</span>
                  <span className={styles.scaleOptionLabel}>{pssScaleLabels[val]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFuncionamiento = () => (
    <div className={styles.fields}>
      {[['usual_focus','Foco habitual'],['usual_creativity','Creatividad habitual'],['usual_energy','Energía habitual'],['life_satisfaction','Satisfacción vital']].map(([key, label]) => (
        <div key={key} className={styles.field}>
          <label>{label} (0-10): {formData[key]}</label>
          <input type="range" min="0" max="10" value={formData[key] ?? undefined}
            onChange={(e) => handleChange(key, parseInt(e.target.value))}
            className={styles.slider} />
          <div className={styles.sliderLabels}><span>Muy bajo</span><span>Muy alto</span></div>
        </div>
      ))}
      
      <div className={styles.finalWarning}>
        ⚠️ Al finalizar, tu baseline quedará <strong>bloqueado</strong> y no podrás modificarlo sin autorización del administrador.
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (sections[currentSection].id) {
      case 'datos': return renderDatosGenerales();
      case 'motivacion': return renderMotivacion();
      case 'expectativas': return renderExpectativas();
      case 'historia': return renderHistoria();
      case 'salud': return renderSaludMental();
      case 'dass': return renderDASS21();
      case 'panas': return renderPANAS();
      case 'estres': return renderEstres();
      case 'funcionamiento': return renderFuncionamiento();
      default: return null;
    }
  };

  return (
    <div className={`${styles.baseline} ${styles.baselineEditing}`}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={goBack}><ArrowLeft size={20} weight="bold" /></button>
        <h1 className={styles.title}>Evaluación Baseline</h1>
        <span className={styles.progress}>{completedSteps}/{totalSteps}</span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{sections[currentSection].icon}</span>
        <div>
          <h2 className={styles.sectionTitle}>{sections[currentSection].title}</h2>
          <p className={styles.sectionDescription}>{sections[currentSection].description}</p>
          {(sectionSubSteps[sections[currentSection].id] || 1) > 1 && (
            <span className={styles.subPageIndicator}>Parte {subStep + 1} de {sectionSubSteps[sections[currentSection].id]}</span>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {renderCurrentSection()}
      </div>

      <div className={styles.footer}>
        <div className={styles.sectionIndicators}>
          {sections.map((s, i) => (
            <button key={s.id}
              className={`${styles.indicator} ${i === currentSection ? styles.indicatorActive : ''} ${isSectionComplete(i) ? styles.indicatorCompleted : ''}`}
              onClick={() => navigateToSection(i)}>
              {s.icon}
            </button>
          ))}
        </div>
        <div className={styles.footerButtons}>
          <button className={styles.prevButton} onClick={goBack}>Anterior</button>
          <button className={styles.nextButton} onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Guardando...' : currentSection === sections.length - 1 && subStep >= (sectionSubSteps[sections[currentSection].id] || 1) - 1 ? 'Finalizar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaselineForm;
