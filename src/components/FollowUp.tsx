import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useToast } from './Toast';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';
import styles from './FollowUp.module.css';
import useSwipeBack from '../hooks/useSwipeBack';
import type { FollowUp as FollowUpType, FollowUpInfo, FollowUpMonthSummary } from '../types';
import {
  calculateDASS, calculatePANAS, calculatePSS, getSeverityColor,
  overallChangeLabels, changeAreaLabels, attributionLabels, continueLabels
} from '../utils/followUpScoring';
import { dassQuestions, panasPositive, panasNegative, pssQuestions } from '../utils/assessmentQuestions';
import { useUser } from '../hooks/useUser';

interface FollowUpFormData {
  [key: string]: string | number | string[] | null;
}

const defaultFormData: FollowUpFormData = {
  dass_1: null, dass_2: null, dass_3: null, dass_4: null, dass_5: null,
  dass_6: null, dass_7: null, dass_8: null, dass_9: null, dass_10: null,
  dass_11: null, dass_12: null, dass_13: null, dass_14: null, dass_15: null,
  dass_16: null, dass_17: null, dass_18: null, dass_19: null, dass_20: null,
  dass_21: null,
  panas_1: null, panas_2: null, panas_3: null, panas_4: null, panas_5: null,
  panas_6: null, panas_7: null, panas_8: null, panas_9: null, panas_10: null,
  panas_11: null, panas_12: null, panas_13: null, panas_14: null, panas_15: null,
  panas_16: null, panas_17: null, panas_18: null, panas_19: null, panas_20: null,
  pss_1: null, pss_2: null, pss_3: null, pss_4: null, pss_5: null,
  pss_6: null, pss_7: null, pss_8: null, pss_9: null, pss_10: null,
  life_satisfaction: 5,
  overall_change: '', change_areas: [], cambios_importantes: '',
  attribution_factors: [], without_microdose: '',
  side_effects: '', side_effects_details: '',
  continue_protocol: '', protocol_changes: '', continue_reason: '', general_notes: ''
};

const FollowUp: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [followUpInfo, setFollowUpInfo] = useState<FollowUpInfo | null>(null);
  const [existingFollowUp, setExistingFollowUp] = useState<FollowUpType | null>(null);
  const [canComplete, setCanComplete] = useState<boolean>(false);
  const [allMonths, setAllMonths] = useState<FollowUpMonthSummary[]>([]);

  const [formData, setFormData] = useState<FollowUpFormData>({ ...defaultFormData });
  const [subStep, setSubStep] = useState<number>(0);
  useSwipeBack();

  const sectionSubSteps: Record<string, number> = {
    intro: 1, dass: 3, panas: 2, pss: 2,
    satisfaccion: 1, evaluacion: 1, atribucion: 1,
    adversos: 1, continuidad: 1
  };

  const sections = [
    { id: 'intro', title: 'Evaluación Mensual', icon: '📅', description: 'Tu revisión del mes' },
    { id: 'dass', title: 'DASS-21', icon: '📊', description: 'Depresión, ansiedad, estrés' },
    { id: 'panas', title: 'PANAS', icon: '😊', description: 'Afecto positivo y negativo' },
    { id: 'pss', title: 'Estrés Percibido', icon: '😰', description: 'Escala PSS-10' },
    { id: 'satisfaccion', title: 'Satisfacción Vital', icon: '⭐', description: 'Tu nivel de satisfacción' },
    { id: 'evaluacion', title: 'Evaluación Global', icon: '🎯', description: 'Cómo te fue este mes' },
    { id: 'atribucion', title: 'Atribución', icon: '🔍', description: 'A qué atribuyes los cambios' },
    { id: 'adversos', title: 'Eventos Adversos', icon: '⚠️', description: 'Efectos no deseados' },
    { id: 'continuidad', title: 'Continuidad', icon: '🔮', description: 'Siguiente paso' }
  ];

  useEffect(() => {
    if (user?.id) {
      const monthParam = searchParams.get('month');
      loadFollowUpInfo(user.id, monthParam || undefined);
    }
  }, [user]);

  const loadFollowUpInfo = async (userId: string, monthYear?: string) => {
    try {
      const url = monthYear
        ? `/api/followups/current/${userId}?month_year=${monthYear}`
        : `/api/followups/current/${userId}`;
      const data = await api.get(url);
      setFollowUpInfo(data);
      setCanComplete(data.canComplete ?? false);

      if (data.allMonths) {
        setAllMonths(data.allMonths);
      }

      if (data.existing) {
        setExistingFollowUp(data.existing);
        setFormData({ ...defaultFormData, ...data.existing });
      } else {
        setExistingFollowUp(null);
        setFormData({ ...defaultFormData });
      }
      setCurrentSection(0);
      setSubStep(0);
    } catch (error) {
      toast!.error('Error al cargar follow-up');
    }
  };

  const switchMonth = (monthYear: string) => {
    if (user?.id) {
      loadFollowUpInfo(user.id, monthYear);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMultiSelect = (field: string, value: string) => {
    setFormData(prev => {
      const current = (prev[field] || []) as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v: string) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const isSubStepComplete = (sectionIndex: number, sub: number): boolean => {
    const sectionId = sections[sectionIndex]?.id;
    switch (sectionId) {
      case 'dass': {
        const start = sub * 7;
        return Array.from({ length: 7 }, (_, i) => `dass_${start + i + 1}`).every(k => formData[k] !== null && formData[k] !== undefined);
      }
      case 'panas': {
        const items = sub === 0 ? panasPositive : panasNegative;
        return items.every(({ key }) => formData[key] !== null && formData[key] !== undefined);
      }
      case 'pss': {
        const start = sub * 5;
        return Array.from({ length: 5 }, (_, i) => `pss_${start + i + 1}`).every(k => formData[k] !== null && formData[k] !== undefined);
      }
      case 'satisfaccion':
        return formData.life_satisfaction !== null && formData.life_satisfaction !== undefined;
      case 'evaluacion':
        return !!formData.overall_change;
      case 'atribucion':
        return Array.isArray(formData.attribution_factors) && formData.attribution_factors.length > 0;
      case 'adversos':
        return !!formData.side_effects;
      case 'continuidad':
        return !!formData.continue_protocol;
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
    if (!followUpInfo?.monthYear) return;

    const sectionId = sections[currentSection].id;
    const totalSubSteps = sectionSubSteps[sectionId] || 1;
    const isLastSubStep = subStep >= totalSubSteps - 1;

    // Validate current sub-step before advancing
    if (goNext && !isSubStepComplete(currentSection, subStep)) {
      toast!.error('Completa todos los campos antes de continuar');
      return;
    }

    // If not last sub-step, just advance sub-step (no save to backend)
    if (goNext && !isLastSubStep) {
      setSubStep(prev => prev + 1);
      window.scrollTo(0, 0);
      return;
    }

    setSaving(true);
    try {
      const isLastSection = currentSection === sections.length - 1 && goNext;

      const payload: Record<string, any> = {
        user_id: user!.id,
        month_year: followUpInfo.monthYear,
        due_date: followUpInfo.dueDate,
        ...formData
      };
      // Only set is_completed/completed_at on the final section to avoid
      // overwriting a previously completed state during intermediate saves
      if (isLastSection) {
        payload.is_completed = true;
        payload.completed_at = new Date().toISOString();
      }

      await api.post('/api/followups', payload);

      if (goNext) {
        if (currentSection === sections.length - 1) {
          trackEvent('followup_completed');
          toast!.success('¡Follow-up completado!');
          navigate('/dashboard');
        } else {
          setCurrentSection(prev => prev + 1);
          setSubStep(0);
          window.scrollTo(0, 0);
        }
      }
    } catch (error) {
      if (goNext) {
        toast!.error('Error al guardar follow-up');
      }
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (subStep > 0) {
      setSubStep(prev => prev - 1);
      window.scrollTo(0, 0);
    } else if (currentSection > 0) {
      const prevSectionId = sections[currentSection - 1].id;
      const prevSubSteps = sectionSubSteps[prevSectionId] || 1;
      setCurrentSection(prev => prev - 1);
      setSubStep(prevSubSteps - 1);
      window.scrollTo(0, 0);
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
      window.scrollTo(0, 0);
    }
  };

  const getDaysUntilDue = (): number | null => {
    if (!followUpInfo?.dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(followUpInfo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const totalSteps = sections.reduce((sum, s) => sum + (sectionSubSteps[s.id] || 1), 0);
  const completedSteps = sections.slice(0, currentSection).reduce((sum, s) => sum + (sectionSubSteps[s.id] || 1), 0) + subStep + 1;
  const progress = (completedSteps / totalSteps) * 100;

  // ============================
  // RENDER SECTIONS
  // ============================

  const renderIntro = () => {
    const daysUntil = getDaysUntilDue();

    return (
      <div className={styles.introSection}>
        <div className={styles.introIcon}>📅</div>
        <h2>Evaluación de Fin de Mes</h2>
        <p>Es momento de evaluar cómo te has sentido durante este mes con el protocolo de microdosis.</p>

        {followUpInfo && (
          <div className={styles.infoCard}>
            <p><strong>Período:</strong> {followUpInfo.monthName}</p>
            <p><strong>Fecha programada:</strong> {new Date(followUpInfo.dueDate!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
          </div>
        )}

        {!canComplete && daysUntil !== null && daysUntil > 0 && (
          <div className={styles.notYetCard}>
            <span className={styles.notYetIcon}>⏳</span>
            <h3>Aún no es momento</h3>
            <p>Faltan <strong>{daysUntil} día{daysUntil !== 1 ? 's' : ''}</strong> para tu evaluación.</p>
            <p className={styles.notYetHint}>El follow-up estará disponible a partir del {new Date(followUpInfo?.dueDate!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.</p>
          </div>
        )}

        {canComplete && (
          <div className={styles.whatToExpect}>
            <h3>¿Qué incluye?</h3>
            <ul>
              <li>📊 DASS-21 (depresión, ansiedad, estrés)</li>
              <li>😊 PANAS (afecto positivo y negativo)</li>
              <li>😰 PSS-10 (estrés percibido)</li>
              <li>⭐ Satisfacción vital</li>
              <li>🎯 Evaluación global del mes</li>
              <li>🔍 Atribución de cambios</li>
              <li>⚠️ Eventos adversos</li>
              <li>🔮 Continuidad del protocolo</li>
            </ul>
            <p className={styles.timeEstimate}>⏱️ Tiempo estimado: 15-20 minutos</p>
          </div>
        )}
      </div>
    );
  };

  const dassLabels = ['No me pasó', 'Un poco', 'Bastante', 'Mucho'];

  const renderDASS21 = () => {
    const start = subStep * 7;
    const end = start + 7;
    const questions = dassQuestions.slice(start, end);

    return (
      <div className={styles.fields}>
        <div className={styles.scaleKey}>
          {dassLabels.map((l, i) => <span key={i} className={styles.scaleKeyItem}>{i} = {l}</span>)}
        </div>
        {questions.map((q, idx) => {
          const i = start + idx;
          return (
            <div key={i} className={styles.questionCard}>
              <label className={styles.questionLabel}><span className={styles.questionNumber}>{i + 1}</span> {q}</label>
              <div className={styles.scaleOptions}>
                {[0, 1, 2, 3].map(val => (
                  <button key={val} type="button"
                    className={`${styles.scaleOption} ${formData[`dass_${i + 1}`] === val ? styles.selected : ''}`}
                    onClick={() => handleChange(`dass_${i + 1}`, val)}>
                    <span className={styles.scaleOptionNumber}>{val}</span>
                    <span className={styles.scaleOptionLabel}>{dassLabels[val]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const panasLabels = ['', 'Nada', 'Poco', 'Moderado', 'Bastante', 'Mucho'];

  const renderPANAS = () => {
    const items = subStep === 0 ? panasPositive : panasNegative;
    const groupTitle = subStep === 0 ? '😊 Afecto Positivo' : '😔 Afecto Negativo';

    return (
      <div className={styles.fields}>
        <div className={styles.scaleKey}>
          {[1,2,3,4,5].map(i => <span key={i} className={styles.scaleKeyItem}>{i} = {panasLabels[i]}</span>)}
        </div>

        <h3 className={styles.subTitle}>{groupTitle}</h3>
        {items.map(({ key, label }) => (
          <div key={key} className={styles.questionCard}>
            <label className={styles.questionLabel}>{label}</label>
            <div className={styles.scaleOptions}>
              {[1, 2, 3, 4, 5].map(val => (
                <button key={val} type="button"
                  className={`${styles.scaleOption} ${formData[key] === val ? styles.selected : ''}`}
                  onClick={() => handleChange(key, val)}>
                  <span className={styles.scaleOptionNumber}>{val}</span>
                  <span className={styles.scaleOptionLabel}>{panasLabels[val]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const pssLabels = ['Nunca', 'Casi nunca', 'A veces', 'Frecuente', 'Muy frecuente'];

  const renderPSS10 = () => {
    const start = subStep * 5;
    const end = start + 5;
    const questions = pssQuestions.slice(start, end);

    return (
      <div className={styles.fields}>
        <div className={styles.scaleKey}>
          {pssLabels.map((l, i) => <span key={i} className={styles.scaleKeyItem}>{i} = {l}</span>)}
        </div>
        {questions.map(({ key, label }, idx) => (
          <div key={key} className={styles.questionCard}>
            <label className={styles.questionLabel}><span className={styles.questionNumber}>{start + idx + 1}</span> {label}</label>
            <div className={styles.scaleOptions}>
              {[0, 1, 2, 3, 4].map(val => (
                <button key={val} type="button"
                  className={`${styles.scaleOption} ${formData[key] === val ? styles.selected : ''}`}
                  onClick={() => handleChange(key, val)}>
                  <span className={styles.scaleOptionNumber}>{val}</span>
                  <span className={styles.scaleOptionLabel}>{pssLabels[val]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSatisfaccion = () => {
    const value = Number(formData.life_satisfaction ?? 5);
    return (
      <div className={styles.fields}>
        <div className={styles.questionCard}>
          <label className={styles.questionLabel}>¿Qué tan satisfecho/a te sientes con tu vida en general en este momento?</label>
          <div className={styles.sliderContainer}>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderEmoji}>⭐</span>
              <span className={styles.sliderLabel}>Satisfacción vital</span>
              <span className={styles.sliderValue}>{value}/10</span>
            </div>
            <input type="range" min="0" max="10"
              value={value}
              onChange={(e) => handleChange('life_satisfaction', parseInt(e.target.value))}
              className={styles.slider}
              style={{ background: `linear-gradient(to right, #C17D4A 0%, #C17D4A ${value * 10}%, #E8C9A1 ${value * 10}%, #E8C9A1 100%)` }}
            />
            <div className={styles.sliderLabels}>
              <span>Nada satisfecho</span>
              <span>Muy satisfecho</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEvaluacion = () => (
    <div className={styles.fields}>
      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>En general, ¿cómo te has sentido este mes comparado con antes de empezar?</label>
        <div className={styles.options}>
          {[
            ['mucho_peor', '😢 Mucho peor'],
            ['peor', '😕 Algo peor'],
            ['igual', '😐 Igual'],
            ['mejor', '🙂 Algo mejor'],
            ['mucho_mejor', '😄 Mucho mejor']
          ].map(([v, l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.overall_change === v ? styles.selected : ''}`}
              onClick={() => handleChange('overall_change', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>¿En qué áreas notaste cambios?</label>
        <p className={styles.questionHint}>Selecciona todas las que apliquen</p>
        <div className={styles.options}>
          {[
            ['animo', '😊 Ánimo'],
            ['ansiedad', '😰 Ansiedad'],
            ['foco', '🎯 Foco'],
            ['relaciones', '❤️ Relaciones'],
            ['creatividad', '🎨 Creatividad'],
            ['energia', '⚡ Energía'],
            ['sentido_vital', '🌟 Sentido vital'],
            ['ninguna', '❌ Ninguna']
          ].map(([v, l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${(formData.change_areas as string[] | null)?.includes(v) ? styles.selected : ''}`}
              onClick={() => handleMultiSelect('change_areas', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>¿Cuáles fueron los cambios más importantes?</label>
        <textarea
          className={styles.textarea}
          value={formData.cambios_importantes ?? ''}
          onChange={(e) => handleChange('cambios_importantes', e.target.value)}
          placeholder="Describe los cambios más significativos que notaste este mes..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderAtribucion = () => (
    <div className={styles.fields}>
      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>Los cambios que notaste se deben principalmente a:</label>
        <p className={styles.questionHint}>Puedes seleccionar varias</p>
        <div className={styles.options}>
          {[
            ['microdosis', '💊 Microdosis'],
            ['trabajo_personal', '🧘 Trabajo personal'],
            ['terapia', '💬 Terapia'],
            ['entorno', '🏡 Entorno'],
            ['mezcla', '🔀 Mezcla de factores']
          ].map(([v, l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${(formData.attribution_factors as string[] | null)?.includes(v) ? styles.selected : ''}`}
              onClick={() => handleMultiSelect('attribution_factors', v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>Sin las microdosis, crees que estarías:</label>
        <div className={styles.options}>
          {[
            ['mucho_peor', '😢 Mucho peor'],
            ['peor', '😕 Peor'],
            ['igual', '😐 Igual'],
            ['mejor', '🙂 Mejor'],
            ['mucho_mejor', '😄 Mucho mejor']
          ].map(([v, l]) => (
            <button key={v} type="button"
              className={`${styles.option} ${formData.without_microdose === v ? styles.selected : ''}`}
              onClick={() => handleChange('without_microdose', v)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdversos = () => (
    <div className={styles.fields}>
      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>¿Tuviste eventos que te preocuparon este mes?</label>
        <div className={styles.options}>
          <button type="button"
            className={`${styles.optionLarge} ${formData.side_effects === 'no' ? styles.selected : ''}`}
            onClick={() => handleChange('side_effects', 'no')}>✅ No</button>
          <button type="button"
            className={`${styles.optionLarge} ${formData.side_effects && formData.side_effects !== 'no' ? styles.selected : ''}`}
            onClick={() => handleChange('side_effects', 'leves')}>⚠️ Sí</button>
        </div>
      </div>

      {formData.side_effects && formData.side_effects !== 'no' && (
        <>
          <div className={styles.questionCard}>
            <label className={styles.questionLabel}>Nivel de los efectos:</label>
            <div className={styles.options}>
              {[['leves', 'Leves'], ['moderados', 'Moderados'], ['severos', 'Severos']].map(([v, l]) => (
                <button key={v} type="button"
                  className={`${styles.option} ${formData.side_effects === v ? styles.selected : ''}`}
                  onClick={() => handleChange('side_effects', v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className={styles.questionCard}>
            <label className={styles.questionLabel}>Describe los efectos:</label>
            <textarea
              className={styles.textarea}
              value={formData.side_effects_details ?? ''}
              onChange={(e) => handleChange('side_effects_details', e.target.value)}
              placeholder="¿Qué efectos experimentaste?"
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );

  const renderContinuidad = () => (
    <div className={styles.fields}>
      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>¿Deseas continuar con el protocolo el próximo mes?</label>
        <div className={styles.options}>
          {[
            ['si', '✅ Sí, continuar igual'],
            ['modificar', '🔄 Sí, pero modificar'],
            ['no', '❌ No, pausar']
          ].map(([v, l]) => (
            <button key={v} type="button"
              className={`${styles.optionLarge} ${formData.continue_protocol === v ? styles.selected : ''}`}
              onClick={() => handleChange('continue_protocol', v)}>{l}</button>
          ))}
        </div>
      </div>

      {formData.continue_protocol === 'modificar' && (
        <div className={styles.questionCard}>
          <label className={styles.questionLabel}>¿Qué cambios te gustaría hacer?</label>
          <textarea
            className={styles.textarea}
            value={formData.protocol_changes ?? ''}
            onChange={(e) => handleChange('protocol_changes', e.target.value)}
            placeholder="Ej: Aumentar/disminuir dosis, cambiar frecuencia..."
            rows={3}
          />
        </div>
      )}

      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>¿Por qué?</label>
        <textarea
          className={styles.textarea}
          value={formData.continue_reason ?? ''}
          onChange={(e) => handleChange('continue_reason', e.target.value)}
          placeholder="Explica tu decisión..."
          rows={3}
        />
      </div>

      <div className={styles.questionCard}>
        <label className={styles.questionLabel}>Notas adicionales (opcional)</label>
        <textarea
          className={styles.textarea}
          value={formData.general_notes ?? ''}
          onChange={(e) => handleChange('general_notes', e.target.value)}
          placeholder="Cualquier observación o reflexión sobre este mes..."
          rows={4}
        />
      </div>

      <div className={styles.completionNote}>
        ✨ Al finalizar, podrás comparar estos resultados con tu baseline inicial en la sección de Análisis.
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (sections[currentSection].id) {
      case 'intro': return renderIntro();
      case 'dass': return renderDASS21();
      case 'panas': return renderPANAS();
      case 'pss': return renderPSS10();
      case 'satisfaccion': return renderSatisfaccion();
      case 'evaluacion': return renderEvaluacion();
      case 'atribucion': return renderAtribucion();
      case 'adversos': return renderAdversos();
      case 'continuidad': return renderContinuidad();
      default: return null;
    }
  };

  // Si ya está completado - mostrar análisis
  if (existingFollowUp?.is_completed && currentSection === 0) {
    const dass = calculateDASS(existingFollowUp);
    const panas = calculatePANAS(existingFollowUp);
    const pss = calculatePSS(existingFollowUp);
    const lifeSat = existingFollowUp.life_satisfaction;

    return (
      <div className={styles.followup}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
          <h1 className={styles.title}>C&D</h1>
          <div style={{ width: 36 }}></div>
        </div>

        <div className={styles.analysisContent}>
          {/* Banner */}
          <div className={styles.analysisBanner}>
            <span className={styles.analysisBannerIcon}>✅</span>
            <div>
              <h2>Resultados de {followUpInfo?.monthName}</h2>
              <p>Completado el {new Date(existingFollowUp.completed_at!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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

          {/* Satisfacción Vital */}
          {lifeSat != null && (
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
          )}

          {/* Evaluación Global */}
          {existingFollowUp.overall_change && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>🎯</span>
                <h3>Evaluación Global</h3>
              </div>
              <div className={styles.evalChangeChip}>
                {overallChangeLabels[existingFollowUp.overall_change] || existingFollowUp.overall_change}
              </div>
              {existingFollowUp.change_areas && existingFollowUp.change_areas.length > 0 && (
                <div className={styles.changeAreas}>
                  <p className={styles.changeAreasLabel}>Áreas de cambio:</p>
                  <div className={styles.changeAreaChips}>
                    {existingFollowUp.change_areas.map((area: string) => (
                      <span key={area} className={styles.changeAreaChip}>{changeAreaLabels[area] || area}</span>
                    ))}
                  </div>
                </div>
              )}
              {existingFollowUp.cambios_importantes && (
                <p className={styles.cambiosText}>{existingFollowUp.cambios_importantes}</p>
              )}
            </div>
          )}

          {/* Atribución */}
          {existingFollowUp.attribution_factors && (existingFollowUp.attribution_factors as string[]).length > 0 && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>🔍</span>
                <h3>Atribución</h3>
              </div>
              <div className={styles.changeAreaChips}>
                {(existingFollowUp.attribution_factors as string[]).map((f: string) => (
                  <span key={f} className={styles.changeAreaChip}>{attributionLabels[f] || f}</span>
                ))}
              </div>
              {existingFollowUp.without_microdose && (
                <p className={styles.withoutMdText}>Sin microdosis: {overallChangeLabels[existingFollowUp.without_microdose] || existingFollowUp.without_microdose}</p>
              )}
            </div>
          )}

          {/* Eventos Adversos */}
          {existingFollowUp.side_effects && existingFollowUp.side_effects !== 'no' && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>⚠️</span>
                <h3>Eventos Adversos</h3>
              </div>
              <div className={styles.evalChangeChip}>
                Nivel: {existingFollowUp.side_effects}
              </div>
              {existingFollowUp.side_effects_details && (
                <p className={styles.adverseDetails}>{existingFollowUp.side_effects_details}</p>
              )}
            </div>
          )}

          {/* Continuidad */}
          {existingFollowUp.continue_protocol && (
            <div className={styles.analysisCard}>
              <div className={styles.analysisCardHeader}>
                <span>🔮</span>
                <h3>Continuidad</h3>
              </div>
              <div className={styles.evalChangeChip}>
                {continueLabels[existingFollowUp.continue_protocol] || existingFollowUp.continue_protocol}
              </div>
              {existingFollowUp.continue_reason && (
                <p className={styles.continueReason}>{existingFollowUp.continue_reason}</p>
              )}
            </div>
          )}

          {/* Volver */}
          <div className={styles.analysisActions}>
            <button className={styles.backToDashboardButton} onClick={() => navigate('/dashboard')}>
              ← Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.followup}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={goBack}><ArrowLeft size={20} weight="bold" /></button>
        <h1 className={styles.title}>C&D</h1>
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
              className={`${styles.indicator} ${i === currentSection ? styles.indicatorActive : ''} ${i < currentSection ? styles.indicatorCompleted : ''} ${!canComplete && !existingFollowUp?.is_completed ? styles.indicatorDisabled : ''}`}
              onClick={() => { if (canComplete || existingFollowUp?.is_completed) navigateToSection(i); }}
              disabled={!canComplete && !existingFollowUp?.is_completed}
            >{s.icon}</button>
          ))}
        </div>
        {currentSection === 0 && !canComplete ? (
          <button className={styles.backToDashboardButton} onClick={() => navigate('/dashboard')}>
            ← Volver al Inicio
          </button>
        ) : currentSection === 0 ? (
          <button className={styles.nextButton} onClick={() => { setCurrentSection(1); setSubStep(0); window.scrollTo(0, 0); }}>
            Comenzar →
          </button>
        ) : (
          <button className={styles.nextButton} onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Guardando...' : currentSection === sections.length - 1 ? '✅ Finalizar' : 'Continuar →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FollowUp;
