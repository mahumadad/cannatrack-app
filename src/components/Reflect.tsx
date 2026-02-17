import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';
import { calcWellbeingPercent } from '../utils/wellbeing';
import { useToast } from './Toast';
import { ArrowLeft, Calendar, PencilSimple, Warning, Pill } from '@phosphor-icons/react';
import BottomNav from './BottomNav';
import styles from './Reflect.module.css';
import sharedFieldLabels from '../utils/fieldLabels';
import { useUser } from '../hooks/useUser';
import { toLocalDateString } from '../utils/dateHelpers';
import storage from '../utils/storage';
import useSwipeBack from '../hooks/useSwipeBack';
import type { Checkin, FieldLabelsMap } from '../types';

interface ReflectFormData {
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  focus: number;
  sociability: number;
  rumination: number;
  functionality: number;
  productivity: number;
  connection: number;
  change_perceived: string;
  change_attribution: string;
  adverse_event: string;
  adverse_type: string;
  adverse_intensity: string;
  adverse_duration: string;
  adverse_interference: string;
  adverse_help: string;
  [key: string]: string | number;
}

const Reflect: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const { user } = useUser();
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(dateParam || toLocalDateString());
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  useSwipeBack();

  const [formData, setFormData] = useState<ReflectFormData>({
    mood: 5, anxiety: 5, energy: 5, sleep: 5, focus: 5,
    sociability: 5, rumination: 5, functionality: 5, productivity: 5, connection: 5,
    change_perceived: '', change_attribution: '',
    adverse_event: 'no', adverse_type: '', adverse_intensity: '', adverse_duration: '', adverse_interference: '', adverse_help: ''
  });

  const sections = [
    { id: 'estado', title: 'Estado General', icon: '😊', description: '¿Cómo te sientes hoy?', fields: ['mood', 'anxiety', 'energy'] },
    { id: 'mental', title: 'Estado Mental', icon: '🧠', description: 'Tu claridad y enfoque', fields: ['focus', 'rumination', 'productivity'] },
    { id: 'social', title: 'Estado Social', icon: '💜', description: 'Tus conexiones', fields: ['sociability', 'connection', 'functionality'] },
    { id: 'fisico', title: 'Descanso', icon: '😴', description: 'Calidad de tu sueño', fields: ['sleep'] },
    { id: 'cambios', title: 'Cambios Percibidos', icon: '🔄', description: '¿Notaste algo diferente?', fields: ['change_perceived', 'change_attribution'] },
    { id: 'adversos', title: 'Efectos Adversos', icon: '⚠️', description: '¿Experimentaste algo negativo?', fields: ['adverse_event'] }
  ];

  const fieldLabels: FieldLabelsMap = sharedFieldLabels;

  const radarFields = ['mood', 'anxiety', 'energy', 'sleep', 'focus', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'];

  useEffect(() => {
    if (user?.id) loadExistingCheckin(user.id, selectedDate);
  }, [user, selectedDate]);

  const loadExistingCheckin = async (userId: string, date: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/checkins/${userId}?days=30`);
      const existing = data.find((c: Checkin) => c.date === date);
      if (existing) {
        setExistingCheckin(existing);
        setFormData({
          mood: existing.mood || 5, anxiety: existing.anxiety || 5, energy: existing.energy || 5,
          sleep: existing.sleep || 5, focus: existing.focus || 5, sociability: existing.sociability || 5,
          rumination: existing.rumination || 5, functionality: existing.functionality || 5,
          productivity: existing.productivity || 5, connection: existing.connection || 5,
          change_perceived: existing.change_perceived || '', change_attribution: existing.change_attribution || '',
          adverse_event: existing.adverse_event || 'no', adverse_type: existing.adverse_type || '',
          adverse_intensity: existing.adverse_intensity || '', adverse_duration: existing.adverse_duration || '',
          adverse_interference: existing.adverse_interference || '', adverse_help: existing.adverse_help || ''
        });
        setIsEditing(false);
      } else {
        setExistingCheckin(null);
        setIsEditing(true);
      }
    } catch (error) {
      toast!.error('Error al cargar check-in');
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  // Cargar borrador de localStorage al cambiar de fecha
  useEffect(() => {
    if (!existingCheckin && isEditing) {
      try {
        const draft = storage.getItem(`reflect_draft_${selectedDate}`);
        if (draft) {
          const parsed = JSON.parse(draft);
          setFormData(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {}
    }
  }, [selectedDate, existingCheckin, isEditing]);

  // Guardar borrador en localStorage mientras se edita
  useEffect(() => {
    if (isEditing && !existingCheckin) {
      storage.setItem(`reflect_draft_${selectedDate}`, JSON.stringify(formData));
    }
  }, [formData, selectedDate, isEditing, existingCheckin]);

  // Limpiar drafts viejos (>7 días) al montar
  useEffect(() => {
    try {
      const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const keys = Object.keys(localStorage).filter(k => k.startsWith('user_reflect_draft_'));
      for (const key of keys) {
        const dateStr = key.replace('user_reflect_draft_', '');
        const draftDate = new Date(dateStr).getTime();
        if (!isNaN(draftDate) && now - draftDate > DRAFT_MAX_AGE) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }, []);

  const handleChange = (field: string, value: string | number) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSaveCheckin = async () => {
    setSaving(true);
    try {
      const path = existingCheckin ? `/api/checkins/${existingCheckin.id}` : `/api/checkins`;
      const body = { user_id: user!.id, date: selectedDate, ...formData };
      const data = existingCheckin ? await api.put(path, body) : await api.post(path, body);
      trackEvent('dose_logged', { isEdit: !!existingCheckin });
      toast!.success('¡Check-in guardado! ✅');
      storage.removeItem(`reflect_draft_${selectedDate}`);
      setExistingCheckin(data);
      setIsEditing(false);
      setCurrentSection(0);
    } catch (error) {
      toast!.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (currentSection < sections.length - 1) { setCurrentSection(prev => prev + 1); window.scrollTo(0, 0); }
    else handleSaveCheckin();
  };

  const goBack = () => {
    if (currentSection > 0) { setCurrentSection(prev => prev - 1); window.scrollTo(0, 0); }
    else navigate('/dashboard');
  };

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(year, month - 1, day);
    
    if (dateOnly.getTime() === today.getTime()) return 'Hoy';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateOnly.getTime() === yesterday.getTime()) return 'Ayer';
    
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const section = sections[currentSection];
  const progress = ((currentSection + 1) / sections.length) * 100;

  const WellbeingGauge: React.FC<{ score: number }> = ({ score }) => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const offset = circumference - progress;
    
    const getColor = (s: number) => s >= 70 ? '#4CAF50' : s >= 40 ? '#FFC107' : '#F44336';
    const getLabel = (s: number) => s >= 70 ? 'Bien' : s >= 40 ? 'Regular' : 'Difícil';
    const getStatusClass = (s: number) => {
      if (s >= 80) return styles.wellbeingStatusExcellent;
      if (s >= 70) return styles.wellbeingStatusGood;
      if (s >= 40) return styles.wellbeingStatusMedium;
      return styles.wellbeingStatusLow;
    };
    
    return (
      <div className={styles.wellbeingGauge}>
        <span className={styles.wellbeingGaugeLabel}>Índice de Bienestar</span>
        <div className={styles.wellbeingCircle}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E8C9A1"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getColor(score)}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className={styles.wellbeingScoreContainer}>
            <div className={styles.wellbeingScoreValue} style={{ color: getColor(score) }}>{score}</div>
            <div className={styles.wellbeingScoreMax}>/ 100</div>
          </div>
        </div>
        <span className={`${styles.wellbeingStatus} ${getStatusClass(score)}`}>{getLabel(score)}</span>
      </div>
    );
  };

  const RadarChart: React.FC<{ data: Record<string, any> }> = ({ data }) => {
    const [hoveredDot, setHoveredDot] = useState<string | null>(null);
    const size = 280, center = size / 2, maxRadius = 100;
    const angleStep = (2 * Math.PI) / radarFields.length;
    const circles = [25, 50, 75, 100];
    const getPoint = (index: number, value: number) => {
      const angle = angleStep * index - Math.PI / 2;
      const radius = (value / 10) * maxRadius;
      return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
    };
    const axes = radarFields.map((f, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const endX = center + maxRadius * Math.cos(angle);
      const endY = center + maxRadius * Math.sin(angle);
      const labelRadius = maxRadius + 35;
      const labelX = center + labelRadius * Math.cos(angle);
      const labelY = center + labelRadius * Math.sin(angle);
      return { field: f, endX, endY, labelX, labelY };
    });
    const polygonPoints = radarFields.map((f, i) => { const p = getPoint(i, data[f] || 5); return `${p.x},${p.y}`; }).join(' ');

    return (
      <div className={styles.radarContainer}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {circles.map((r, i) => <circle key={i} cx={center} cy={center} r={r} fill="none" stroke="#E8C9A1" strokeWidth="1" opacity={0.6} />)}
          {axes.map((a, i) => <line key={i} x1={center} y1={center} x2={a.endX} y2={a.endY} stroke="#E8C9A1" strokeWidth="1" opacity={0.6} />)}
          <polygon points={polygonPoints} fill="rgba(193, 125, 74, 0.35)" stroke="#C17D4A" strokeWidth="2.5" />
          {radarFields.map((f, i) => {
            const p = getPoint(i, data[f] || 5);
            const isHovered = hoveredDot === f;
            const value = data[f] || 5;
            return (
              <g key={f}>
                <circle
                  cx={p.x} cy={p.y} r={isHovered ? 8 : 5} fill="#C17D4A"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  onMouseEnter={() => setHoveredDot(f)}
                  onMouseLeave={() => setHoveredDot(null)}
                  onTouchStart={() => setHoveredDot(hoveredDot === f ? null : f)}
                />
                {isHovered && (
                  <g>
                    <rect x={p.x - 40} y={p.y - 32} width={80} height={24} rx={6}
                      fill="#4A3F35" />
                    <text x={p.x} y={p.y - 16} textAnchor="middle" fill="white"
                      fontSize="11" fontWeight="600">
                      {fieldLabels[f].label}: {value}/10
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <div className={styles.radarLabels}>
          {axes.map((a, i) => (
            <div
              key={i}
              className={styles.radarLabel}
              style={{ left: `${(a.labelX / size) * 100}%`, top: `${(a.labelY / size) * 100}%` }}
              onMouseEnter={() => setHoveredField(a.field)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span className={styles.radarLabelEmoji}>{fieldLabels[a.field].emoji}</span>
              <span className={styles.radarLabelText}>{fieldLabels[a.field].label}</span>
              {hoveredField === a.field && (
                <div className={styles.radarTooltip}>
                  <strong>{fieldLabels[a.field].label}</strong>
                  <br />
                  {data[a.field] || 5} / 10
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCheckinSummary = () => {
    const data = existingCheckin!;
    const wellbeing = calcWellbeingPercent(data as unknown as Record<string, string | number | undefined>);
    return (
      <div className={styles.summaryContainer}>
        <div className={styles.radarCard}>
          <h3 className={styles.radarTitle}>Tu Estado</h3>
          <RadarChart data={data as Record<string, any>} />
          <WellbeingGauge score={wellbeing} />
        </div>
        {data.change_perceived && <div className={styles.infoCard}><h4>🔄 Cambios</h4><p>{data.change_perceived}</p></div>}
        {data.adverse_event === 'si' && (<div className={`${styles.infoCard} ${styles.adverseCard}`}><h4>⚠️ Efectos Adversos</h4><div className={styles.adverseTags}>{data.adverse_type && <span className={styles.tagRed}>{data.adverse_type}</span>}{data.adverse_intensity && <span className={styles.tagRed}>{data.adverse_intensity}</span>}</div></div>)}
        <button className={styles.editButton} onClick={() => setIsEditing(true)}><PencilSimple size={18} /> Modificar Check-in</button>
      </div>
    );
  };

  const renderSlider = (field: string) => {
    const info = fieldLabels[field], value = formData[field];
    return (
      <div key={field} className={styles.sliderContainer}>
        <div className={styles.sliderHeader}><span className={styles.sliderEmoji}>{info.emoji}</span><span className={styles.sliderLabel}>{info.label}</span><span className={styles.sliderValue}>{value}/10</span></div>
        <input type="range" min="0" max="10" value={value} onChange={(e) => handleChange(field, parseInt(e.target.value))} className={styles.slider} style={{ background: `linear-gradient(to right, #C17D4A 0%, #C17D4A ${Number(value) * 10}%, #E8C9A1 ${Number(value) * 10}%, #E8C9A1 100%)` }} />
        <div className={styles.sliderLabels}><span>{info.low}</span><span>{info.high}</span></div>
      </div>
    );
  };

  const renderChangesSection = () => (
    <div className={styles.changesContainer}>
      <div className={styles.field}><label className={styles.fieldLabel}>¿Notaste algún cambio hoy?</label><textarea className={styles.textarea} value={formData.change_perceived} onChange={(e) => handleChange('change_perceived', e.target.value)} placeholder="Describe cualquier cambio..." rows={3} /></div>
      {formData.change_perceived && (<div className={styles.field}><label className={styles.fieldLabel}>¿A qué lo atribuyes?</label><div className={styles.options}>{[['microdosis', '💊 Microdosis'], ['sueno', '😴 Sueño'], ['ejercicio', '🏃 Ejercicio'], ['alimentacion', '🥗 Alimentación'], ['estres', '😰 Estrés'], ['otro', '❓ Otro']].map(([v, l]) => (<button key={v} type="button" className={`${styles.option} ${formData.change_attribution === v ? styles.selected : ''}`} onClick={() => handleChange('change_attribution', v)}>{l}</button>))}</div></div>)}
    </div>
  );

  const renderAdverseSection = () => (
    <div className={styles.adverseContainer}>
      <div className={styles.field}><label className={styles.fieldLabel}>¿Algún efecto adverso?</label><div className={styles.options}><button type="button" className={`${styles.optionLarge} ${formData.adverse_event === 'no' ? styles.selected : ''}`} onClick={() => handleChange('adverse_event', 'no')}>✅ No</button><button type="button" className={`${styles.optionLarge} ${formData.adverse_event === 'si' ? styles.selected : ''}`} onClick={() => handleChange('adverse_event', 'si')}>⚠️ Sí</button></div></div>
      {formData.adverse_event === 'si' && (<><div className={styles.field}><label className={styles.fieldLabel}>Tipo</label><div className={styles.options}>{[['fisico', '🤕 Físico'], ['emocional', '😢 Emocional'], ['cognitivo', '🧠 Cognitivo']].map(([v, l]) => (<button key={v} type="button" className={`${styles.option} ${formData.adverse_type === v ? styles.selected : ''}`} onClick={() => handleChange('adverse_type', v)}>{l}</button>))}</div></div><div className={styles.field}><label className={styles.fieldLabel}>Intensidad</label><div className={styles.options}>{[['leve', 'Leve'], ['moderado', 'Moderado'], ['intenso', 'Intenso']].map(([v, l]) => (<button key={v} type="button" className={`${styles.option} ${formData.adverse_intensity === v ? styles.selected : ''}`} onClick={() => handleChange('adverse_intensity', v)}>{l}</button>))}</div></div></>)}
    </div>
  );

  const renderSectionContent = () => {
    if (section.id === 'cambios') return renderChangesSection();
    if (section.id === 'adversos') return renderAdverseSection();
    return <div className={styles.sliders}>{section.fields.map(f => renderSlider(f))}</div>;
  };

  const renderCheckinEditor = () => (
    <>
      <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progress}%` }}></div></div>
      <div className={styles.dateDisplay}><Calendar size={18} weight="regular" className={styles.dateIcon} /><span className={styles.dateText}>{formatDate(selectedDate)}</span>{existingCheckin && <span className={styles.editBadge}>Editando</span>}</div>
      <div className={styles.sectionHeader}><span className={styles.sectionIcon}>{section.icon}</span><div><h2 className={styles.sectionTitle}>{section.title}</h2><p className={styles.sectionDescription}>{section.description}</p></div></div>
      <div className={styles.content}>{renderSectionContent()}</div>
      
      <div className={styles.footer}><div className={styles.sectionIndicators}>{sections.map((s, i) => <button key={s.id} className={`${styles.indicator} ${i === currentSection ? styles.active : ""} ${i < currentSection ? styles.completed : ""}`} onClick={() => setCurrentSection(i)}>{s.icon}</button>)}</div><button className={styles.nextButton} onClick={goNext} disabled={saving}>{saving ? 'Guardando...' : currentSection === sections.length - 1 ? '✅ Guardar' : 'Continuar →'}</button></div>
    </>
  );

  const isSummaryView = !!(existingCheckin && !isEditing);

  if (loading) return (<div className={styles.reflect}><div className={styles.header}><button className={styles.backButton} onClick={goBack}><ArrowLeft size={20} weight="bold" /></button><h1 className={styles.title}>Seguimiento</h1><div style={{ width: 36 }}></div></div><div className={styles.loadingContainer}><div className={styles.loadingSpinner}></div><p>Cargando...</p></div></div>);

  return (
    <div className={`${styles.reflect} ${isSummaryView ? styles.reflectSummary : styles.reflectEditing}`}>
      <div className={styles.header}><button className={styles.backButton} onClick={goBack}><ArrowLeft size={20} weight="bold" /></button><h1 className={styles.title}>Seguimiento</h1><div style={{ width: 36 }}></div></div>

      {isSummaryView ? (<><div className={styles.dateDisplaySummary}><Calendar size={18} /> {formatDate(selectedDate)}</div>{renderCheckinSummary()}</>) : renderCheckinEditor()}

      {isSummaryView && <BottomNav activePage="reflect" />}
    </div>
  );
};

export default Reflect;
