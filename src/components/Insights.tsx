import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcWellbeing } from '../utils/wellbeing';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from '@phosphor-icons/react';
import { EmptyChart } from './EmptyStates';
import BottomNav from './BottomNav';
import styles from './Insights.module.css';
import sharedFieldLabels from '../utils/fieldLabels';
import { useUser } from '../hooks/useUser';
import useSwipeBack from '../hooks/useSwipeBack';
import { useInsightsAnalytics } from '../hooks/useInsightsAnalytics';
import { useCarousel } from '../hooks/useCarousel';
import type { ComparisonAverages } from '../types';

const Insights: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedFields, setSelectedFields] = useState<string[]>(['mood', 'energy']);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [hoveredRadarField, setHoveredRadarField] = useState<string | null>(null);
  const [selectedEvolutionMetrics, setSelectedEvolutionMetrics] = useState<string[]>(['depression', 'anxiety', 'stress']);
  useSwipeBack();

  const { activeCard, carouselRef, handleCarouselScroll, scrollToCard } = useCarousel();

  const allFields = sharedFieldLabels;
  const radarFields = ['mood', 'anxiety', 'energy', 'sleep', 'focus', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'];

  const {
    loading, insightsData, weeklyData, periodAverages, comparisonData,
    wellbeingScore, wellbeingChange, trendData, bienestarAnalysis,
    insightCards, periodDoseCount, periodCheckinCount,
    showEvolution, evolutionMetrics, chartData, availableMetrics,
    baselineData, completedFollowUps,
  } = useInsightsAnalytics(user?.id, period, allFields);

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter(f => f !== field));
      }
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const selectAllFields = () => setSelectedFields(Object.keys(allFields));
  const clearFields = () => setSelectedFields(['mood']);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color, margin: '4px 0' }}>
              {allFields[p.dataKey]?.emoji} {allFields[p.dataKey]?.label}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const [hoveredMiniGauge, setHoveredMiniGauge] = useState<string | null>(null);

  const MiniGauge: React.FC<{ value: string | number; label: string; emoji: string; color: string; fieldKey?: string }> = ({ value, label, emoji, color, fieldKey }) => {
    const percentage = (Number(value) / 10) * 100;
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const isHovered = fieldKey ? hoveredMiniGauge === fieldKey : false;

    return (
      <div className={styles.miniGaugeItem}
        onMouseEnter={() => fieldKey && setHoveredMiniGauge(fieldKey)}
        onMouseLeave={() => setHoveredMiniGauge(null)}
        onTouchStart={() => fieldKey && setHoveredMiniGauge(hoveredMiniGauge === fieldKey ? null : fieldKey)}>
        <div className={styles.miniGaugeCircle}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r={radius} fill="none" stroke="#E8C9A1" strokeWidth="6" />
            <circle cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 30 30)" />
          </svg>
          <span className={styles.miniGaugeEmoji}>{emoji}</span>
        </div>
        <span className={styles.miniGaugeValue}>{value}</span>
        {isHovered && (
          <div className={styles.miniGaugeTooltip}>
            <strong>{label}</strong><br />{value} / 10
          </div>
        )}
      </div>
    );
  };

  const WellbeingGauge: React.FC<{ score: number }> = ({ score }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const percentage = (score / 10) * 100;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className={styles.periodGaugeContainer}>
        <div className={styles.gaugeItem}>
          <div className={styles.gaugeCircle}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4A574" />
                  <stop offset="100%" stopColor="#C17D4A" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#E8C9A1" strokeWidth="10" />
              <circle cx="60" cy="60" r={radius} fill="none" stroke="url(#gaugeGradient)" strokeWidth="10"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <span className={styles.gaugeValueLarge}>{score.toFixed(1)}</span>
          </div>
          <span className={styles.gaugeLabel}>Bienestar General</span>
        </div>
      </div>
    );
  };

  const ComparisonGauge: React.FC<{ score: string | number; label: string; color: string; days: number }> = ({ score, label, color, days }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const percentage = (Number(score) / 10) * 100;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={styles.compareGaugeItem}>
        <div className={styles.gaugeCircle}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={radius} fill="none" stroke="#E8C9A1" strokeWidth="8" />
            <circle cx="45" cy="45" r={radius} fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <span className={styles.gaugeValueMedium}>{score}</span>
        </div>
        <span className={styles.compareGaugeLabel}>{label}</span>
        <span className={styles.compareGaugeDays}>{days} días</span>
      </div>
    );
  };

  // Radar Chart Component for Comparison
  const ComparisonRadarChart: React.FC<{ withDose: ComparisonAverages; withoutDose: ComparisonAverages }> = ({ withDose, withoutDose }) => {
    const size = 280;
    const center = size / 2;
    const radius = 100;
    const levels = 5;

    const getPoint = (index: number, value: number, total: number) => {
      const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
      const r = (value / 10) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    const getLabelPosition = (index: number, total: number) => {
      const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
      const r = radius + 35;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    const createPath = (data: ComparisonAverages) => {
      const points = radarFields.map((field, i) => getPoint(i, parseFloat(String(data[field])) || 5, radarFields.length));
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    };

    return (
      <div className={styles.radarWrapper}>
        <div className={styles.radarContainer} style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            {/* Grid circles */}
            {[...Array(levels)].map((_, i) => (
              <circle key={i} cx={center} cy={center} r={(radius / levels) * (i + 1)}
                fill="none" stroke="#E8C9A1" strokeWidth="1" opacity="0.5" />
            ))}
            
            {/* Grid lines */}
            {radarFields.map((_, i) => {
              const angle = (Math.PI * 2 * i) / radarFields.length - Math.PI / 2;
              return (
                <line key={i} x1={center} y1={center}
                  x2={center + radius * Math.cos(angle)}
                  y2={center + radius * Math.sin(angle)}
                  stroke="#E8C9A1" strokeWidth="1" opacity="0.5" />
              );
            })}

            {/* Without Dose polygon (gray, behind) */}
            <path d={createPath(withoutDose)} fill="rgba(165, 127, 80, 0.15)" stroke="#c4b5a0" strokeWidth="2" />
            
            {/* With Dose polygon (green, in front) */}
            <path d={createPath(withDose)} fill="rgba(90, 122, 58, 0.2)" stroke="#5a7a3a" strokeWidth="2" />

            {/* Data points - Without Dose */}
            {radarFields.map((field, i) => {
              const point = getPoint(i, parseFloat(String(withoutDose[field])) || 5, radarFields.length);
              return <circle key={`wo-${i}`} cx={point.x} cy={point.y} r="4" fill="#c4b5a0" />;
            })}

            {/* Data points - With Dose */}
            {radarFields.map((field, i) => {
              const point = getPoint(i, parseFloat(String(withDose[field])) || 5, radarFields.length);
              return <circle key={`w-${i}`} cx={point.x} cy={point.y} r="4" fill="#5a7a3a" />;
            })}
          </svg>

          {/* Labels */}
          <div className={styles.radarLabels}>
            {radarFields.map((field, i) => {
              const pos = getLabelPosition(i, radarFields.length);
              const info = allFields[field];
              return (
                <div key={field} className={styles.radarLabel}
                  style={{ left: pos.x, top: pos.y }}
                  onMouseEnter={() => setHoveredRadarField(field)}
                  onMouseLeave={() => setHoveredRadarField(null)}>
                  <span className={styles.radarLabelEmoji}>{info.emoji}</span>
                  {hoveredRadarField === field && (
                    <div className={styles.radarTooltip}>
                      <strong>{info.label}</strong><br />
                      <span style={{ color: '#5a7a3a' }}>Con: {withDose[field]}</span> / <span style={{ color: '#c4b5a0' }}>Sin: {withoutDose[field]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.insights}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
          <h1 className={styles.title}>Análisis y Tendencias</h1>
          <div className={styles.headerSpacer}></div>
        </div>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className={styles.insights}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
          <h1 className={styles.title}>Análisis y Tendencias</h1>
          <div className={styles.headerSpacer}></div>
        </div>
        <div className={styles.noData}>
          <EmptyChart size={100} />
          <h2>Sin datos suficientes</h2>
          <p>Completa algunas reflexiones para ver tus análisis</p>
          <button className={styles.startButton} onClick={() => navigate('/reflect')}>Hacer reflexión</button>
        </div>
      </div>
    );
  }

  const avgs: any = periodAverages || insightsData;

  let evolutionCard: React.ReactNode = null;
  if (showEvolution && baselineData) {
    const lastFU = completedFollowUps[completedFollowUps.length - 1];
    const effectiveSelection = selectedEvolutionMetrics.filter(k => availableMetrics.includes(k));
    if (effectiveSelection.length === 0 && availableMetrics.length > 0) {
      setTimeout(() => setSelectedEvolutionMetrics(availableMetrics.slice(0, 3)), 0);
    }
    const activeMetrics = effectiveSelection.length > 0 ? effectiveSelection : availableMetrics.slice(0, 3);

    const toggleEvolutionMetric = (key: string) => {
      setSelectedEvolutionMetrics(prev => {
        const current = prev.filter(k => availableMetrics.includes(k));
        if (current.includes(key)) {
          return current.length > 1 ? current.filter(k => k !== key) : current;
        }
        return [...current, key];
      });
    };

    const EvolutionTooltip = ({ active, payload, label: tooltipLabel }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className={styles.tooltip}>
            <p className={styles.tooltipLabel}>{tooltipLabel}</p>
            {payload.map((p: any, i: number) => {
              const metric = evolutionMetrics[p.dataKey];
              const rawVal = p.payload[`${p.dataKey}_raw`];
              return (
                <p key={i} style={{ color: p.color, margin: '4px 0' }}>
                  {metric?.emoji} {metric?.label}: {rawVal ?? '-'}
                </p>
              );
            })}
          </div>
        );
      }
      return null;
    };

    evolutionCard = (
      <>
        <h2 className={styles.cardTitle}>📈 Evolución Clínica</h2>
        <p className={styles.cardSubtitle}>Comparación con tu baseline</p>
        <div className={styles.evolutionChips}>
          {Object.entries(evolutionMetrics).map(([key, metric]) => {
            const hasData = availableMetrics.includes(key);
            return (
              <button
                key={key}
                className={`${styles.evolutionChip} ${activeMetrics.includes(key) ? styles.evolutionChipActive : ''}`}
                onClick={() => hasData && toggleEvolutionMetric(key)}
                style={{
                  ...(activeMetrics.includes(key) ? { borderColor: metric.color, background: `${metric.color}15` } : {}),
                  ...(!hasData ? { opacity: 0.35, cursor: 'default' } : {})
                }}
                title={!hasData ? 'Sin datos en follow-up' : metric.label}
              >
                <span>{metric.emoji}</span>
                <span className={styles.evolutionChipLabel}>{metric.label}</span>
              </button>
            );
          })}
        </div>
        {activeMetrics.length > 0 ? (
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8C9A1" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B5D52' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B5D52' }} width={30} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip content={<EvolutionTooltip />} />
                {activeMetrics.map(key => (
                  <Line key={key} type="monotone" dataKey={key} stroke={evolutionMetrics[key].color} strokeWidth={2} dot={{ r: 4, fill: evolutionMetrics[key].color }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.noMetricsMessage}>
            No hay métricas comparables aún. Completa todas las secciones de tu próximo follow-up.
          </p>
        )}
        <div className={styles.evolutionChanges}>
          <p className={styles.evolutionChangesTitle}>Cambios desde tu Baseline</p>
          {Object.entries(evolutionMetrics).map(([key, metric]) => {
            const baseVal = metric.extract(baselineData);
            const lastVal = metric.extract(lastFU);
            const hasData = baseVal !== null && lastVal !== null;
            if (!hasData) {
              return (
                <div key={key} className={styles.evolutionChangeRow} style={{ opacity: 0.4 }}>
                  <span className={styles.evolutionChangeEmoji}>{metric.emoji}</span>
                  <span className={styles.evolutionChangeLabel}>{metric.label}</span>
                  <span className={styles.evolutionChangeValues}>Sin datos</span>
                  <span className={styles.evolutionChangeArrow} style={{ color: 'var(--color-text-secondary)' }}>—</span>
                </div>
              );
            }
            const diff = lastVal - baseVal;
            const pctChange = baseVal !== 0 ? Math.round(Math.abs(diff / baseVal) * 100) : 0;
            const improved = metric.lowerIsBetter ? diff < 0 : diff > 0;
            const unchanged = diff === 0;
            return (
              <div key={key} className={styles.evolutionChangeRow}>
                <span className={styles.evolutionChangeEmoji}>{metric.emoji}</span>
                <span className={styles.evolutionChangeLabel}>{metric.label}</span>
                <span className={styles.evolutionChangeValues}>{baseVal} → {lastVal}</span>
                <span className={styles.evolutionChangeArrow} style={{ color: unchanged ? 'var(--color-text-secondary)' : improved ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {unchanged ? '—' : diff > 0 ? `↑ ${pctChange}%` : `↓ ${pctChange}%`}
                </span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const WellbeingTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p style={{ margin: '4px 0' }}>Bienestar: <strong>{data.wellbeing}</strong>/10</p>
          {data.isDose && <p style={{ color: 'var(--color-danger)', margin: '4px 0', fontSize: '12px' }}>💊 Día de dosis</p>}
        </div>
      );
    }
    return null;
  };

  // Build sections array — filter conditional ones
  const sections: React.ReactNode[] = [
    /* 0: Resumen (siempre, estilo Stitch list) */
    <>
      <h2 className={styles.cardTitle}>📊 Resumen {period === 'weekly' ? 'Semanal' : 'Mensual'}</h2>
      <p className={styles.cardSubtitle}>Tu actividad en {period === 'weekly' ? 'la semana' : 'el mes'}</p>
      <div className={styles.resumenList}>
        <div className={styles.resumenRow}>
          <div className={styles.resumenLeft}>
            <div className={`${styles.resumenIcon} ${styles.resumenIconDosis}`}>💊</div>
            <div>
              <p className={styles.resumenLabel}>Tomas Registradas</p>
              <p className={styles.resumenSub}>{periodDoseCount} en {period === 'weekly' ? 'la semana' : 'el mes'}</p>
            </div>
          </div>
          <span className={styles.resumenValue}>{periodDoseCount}</span>
        </div>
        <div className={styles.resumenRow}>
          <div className={styles.resumenLeft}>
            <div className={`${styles.resumenIcon} ${styles.resumenIconReflexion}`}>📝</div>
            <div>
              <p className={styles.resumenLabel}>Reflexiones</p>
              <p className={styles.resumenSub}>{periodCheckinCount} en {period === 'weekly' ? 'la semana' : 'el mes'}</p>
            </div>
          </div>
          <span className={styles.resumenValue}>{periodCheckinCount}</span>
        </div>
        <div className={styles.resumenRow}>
          <div className={styles.resumenLeft}>
            <div className={`${styles.resumenIcon} ${styles.resumenIconBienestar}`}>🌟</div>
            <div>
              <p className={styles.resumenLabel}>Bienestar General</p>
              <p className={styles.resumenSub}>Puntuación promedio</p>
            </div>
          </div>
          <span className={styles.resumenValue}>{wellbeingScore.toFixed(1)}</span>
        </div>
        {comparisonData && (
          <div className={styles.resumenRow}>
            <div className={styles.resumenLeft}>
              <div className={`${styles.resumenIcon} ${styles.resumenIconImpacto}`}>⚖️</div>
              <div>
                <p className={styles.resumenLabel}>Impacto de Dosis</p>
                <p className={styles.resumenSub}>Con vs sin dosis</p>
              </div>
            </div>
            <span className={styles.resumenValue}>{comparisonData.withDose.wellbeing} vs {comparisonData.withoutDose.wellbeing}</span>
          </div>
        )}
      </div>
    </>,

    /* 1: Bienestar General (trend chart + analysis) */
    <>
      <div className={styles.bienestarHeader}>
        <p className={styles.bienestarLabel}>Bienestar General</p>
        <div className={styles.bienestarValueRow}>
          <span className={styles.bienestarValue}>
            {wellbeingScore.toFixed(1)}<span className={styles.bienestarUnit}>/10</span>
          </span>
          {wellbeingChange !== null && (
            <span className={`${styles.bienestarBadge} ${wellbeingChange >= 0 ? styles.badgeUp : styles.badgeDown}`}>
              {wellbeingChange >= 0 ? '↑' : '↓'} {Math.abs(wellbeingChange)}% vs {period === 'weekly' ? 'semana' : 'mes'} ant.
            </span>
          )}
        </div>
      </div>
      {trendData.length > 1 ? (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="wbGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4A574" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#D4A574" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8C9A1" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B5D52', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6B5D52' }} width={30} axisLine={false} tickLine={false} />
              <Tooltip content={<WellbeingTrendTooltip />} />
              <Area type="monotone" dataKey="wellbeing" stroke="#C17D4A" strokeWidth={2.5} fill="url(#wbGradient)"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  if (payload.isDose) {
                    return <circle key={`dose-${index}`} cx={cx} cy={cy} r={5} fill="#b84c3a" stroke="white" strokeWidth={2} />;
                  }
                  return <circle key={`no-${index}`} cx={cx} cy={cy} r={3} fill="#D4A574" stroke="white" strokeWidth={1.5} />;
                }}
                activeDot={{ r: 6, fill: '#C17D4A', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={styles.noMetricsMessage}>
          Necesitas al menos 2 reflexiones para ver la tendencia.
        </p>
      )}
      <div className={styles.chartLegendRow}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#b84c3a' }} />
          <span>Día de Dosis</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: '#D4A574' }} />
          <span>Día de Pausa</span>
        </div>
      </div>
      {bienestarAnalysis && (
        <p className={styles.bienestarAnalysis}>{bienestarAnalysis}</p>
      )}
    </>,

    /* 1: Estado Emocional */
    <>
      <h2 className={styles.cardTitle}>📈 Estado Emocional</h2>
      <p className={styles.cardSubtitle}>{period === 'weekly' ? 'Evolución diaria' : 'Evolución semanal'}</p>
      <div className={styles.fieldSelectorContainer}>
        <div className={styles.fieldSelectorActions}>
          <button className={`${styles.fieldActionBtn} ${selectedFields.length === Object.keys(allFields).length ? styles.fieldActionBtnActive : ''}`} onClick={selectAllFields}>Todas</button>
          <button className={styles.fieldActionBtn} onClick={clearFields}>Limpiar</button>
        </div>
        <div className={styles.fieldSelectorRow}>
          {Object.entries(allFields).slice(0, 5).map(([key, field]) => (
            <div key={key} className={styles.fieldChipWrapper}
              onMouseEnter={() => setHoveredField(key)}
              onMouseLeave={() => setHoveredField(null)}>
              <button className={styles.fieldChip} onClick={() => toggleField(key)}
                style={{ borderColor: selectedFields.includes(key) ? field.color : '#E8C9A1', background: selectedFields.includes(key) ? `${field.color}20` : 'transparent' }}>
                {field.emoji}
              </button>
              {hoveredField === key && <div className={styles.fieldChipTooltip}>{field.label}</div>}
            </div>
          ))}
        </div>
        <div className={styles.fieldSelectorRow}>
          {Object.entries(allFields).slice(5).map(([key, field]) => (
            <div key={key} className={styles.fieldChipWrapper}
              onMouseEnter={() => setHoveredField(key)}
              onMouseLeave={() => setHoveredField(null)}>
              <button className={styles.fieldChip} onClick={() => toggleField(key)}
                style={{ borderColor: selectedFields.includes(key) ? field.color : '#E8C9A1', background: selectedFields.includes(key) ? `${field.color}20` : 'transparent' }}>
                {field.emoji}
              </button>
              {hoveredField === key && <div className={styles.fieldChipTooltip}>{field.label}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={period === 'weekly' ? insightsData.emotional : weeklyData.map(w => ({ ...w, day: w.label }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8C9A1" />
            <XAxis dataKey={period === 'weekly' ? 'day' : 'label'} tick={{ fontSize: 10, fill: '#6B5D52' }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#6B5D52' }} width={30} />
            <Tooltip content={<CustomTooltip />} />
            {selectedFields.map(field => (
              <Line key={field} type="monotone" dataKey={field} stroke={allFields[field].color} strokeWidth={2} dot={{ r: 3, fill: allFields[field].color }} name={allFields[field].label} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>,

    /* 1: Bienestar */
    <>
      <h2 className={styles.cardTitle}>{period === 'weekly' ? '🌟 Bienestar Semana' : '🌟 Bienestar Mes'}</h2>
      <p className={styles.cardSubtitle}>Puntuación general basada en tus métricas</p>
      <WellbeingGauge score={wellbeingScore} />
      <div className={styles.miniGaugesGrid}>
        <MiniGauge value={avgs.avgMood || avgs.mood} label="Ánimo" emoji="😊" color="#FF9800" fieldKey="mood" />
        <MiniGauge value={avgs.avgEnergy || avgs.energy} label="Energía" emoji="⚡" color="#2196F3" fieldKey="energy" />
        <MiniGauge value={avgs.avgAnxiety || avgs.anxiety} label="Ansiedad" emoji="😰" color="#F44336" fieldKey="anxiety" />
        <MiniGauge value={avgs.avgFocus || avgs.focus} label="Enfoque" emoji="🎯" color="#5a7a3a" fieldKey="focus" />
        <MiniGauge value={avgs.avgSleep || avgs.sleep} label="Sueño" emoji="😴" color="#9C27B0" fieldKey="sleep" />
        <MiniGauge value={avgs.avgSociability || avgs.sociability} label="Social" emoji="👥" color="#00BCD4" fieldKey="sociability" />
        <MiniGauge value={avgs.avgRumination || avgs.rumination} label="Rumiación" emoji="🌀" color="#795548" fieldKey="rumination" />
        <MiniGauge value={avgs.avgFunctionality || avgs.functionality} label="Función" emoji="✅" color="#607D8B" fieldKey="functionality" />
        <MiniGauge value={avgs.avgProductivity || avgs.productivity} label="Productivo" emoji="📈" color="#E91E63" fieldKey="productivity" />
        <MiniGauge value={avgs.avgConnection || avgs.connection} label="Conexión" emoji="❤️" color="#FF5722" fieldKey="connection" />
      </div>
    </>,

    /* 2: Comparación (condicional) */
    ...(comparisonData ? [
      <>
        <h2 className={styles.cardTitle}>⚖️ Comparación: Con vs Sin Dosis</h2>
        <p className={styles.cardSubtitle}>Bienestar promedio según días de microdosis</p>
        <div className={styles.compareGauges}>
          <ComparisonGauge score={comparisonData.withDose.wellbeing} label="Con Dosis" color="#5a7a3a" days={comparisonData.withDose.count} />
          <ComparisonGauge score={comparisonData.withoutDose.wellbeing} label="Sin Dosis" color="#c4b5a0" days={comparisonData.withoutDose.count} />
        </div>
      </>,

      <>
        <h2 className={styles.cardTitle}>🕸️ Métricas Comparadas</h2>
        <p className={styles.cardSubtitle}>Radar comparativo de días con y sin dosis</p>
        <ComparisonRadarChart withDose={comparisonData.withDose} withoutDose={comparisonData.withoutDose} />
        <div className={styles.radarLegend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#5a7a3a' }}></span>
            <span>Con Dosis</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#c4b5a0' }}></span>
            <span>Sin Dosis</span>
          </div>
        </div>
      </>
    ] : []),

    /* Evolución Clínica (condicional) */
    ...(evolutionCard ? [evolutionCard] : []),

    /* Insights Rápidos */
    <>
      <h2 className={styles.cardTitle}>💡 Insights Rápidos</h2>
      <p className={styles.cardSubtitle}>Análisis basado en tus datos</p>
      <div className={styles.insightsGrid}>
        {insightCards.map((card, i) => (
          <div key={i} className={styles.insightCard}>
            <div className={styles.insightHeader}>
              <div className={styles.insightIconBadge} style={{ background: card.bg }}>
                <span>{card.icon}</span>
              </div>
              <div>
                <p className={styles.insightLabel}>{card.label}</p>
                <p className={styles.insightStatus} style={{ color: card.statusColor }}>{card.statusLabel}</p>
              </div>
            </div>
            <p className={styles.insightDesc}>{card.description}</p>
          </div>
        ))}
      </div>
    </>,

  ];

  return (
    <div className={styles.insights}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
        <h1 className={styles.title}>Análisis y Tendencias</h1>
        <div className={styles.headerSpacer}></div>
      </div>

      <div className={styles.periodToggle}>
        <button className={`${styles.periodButton} ${period === 'weekly' ? styles.active : ''}`} onClick={() => setPeriod('weekly')}>Semana</button>
        <button className={`${styles.periodButton} ${period === 'monthly' ? styles.active : ''}`} onClick={() => setPeriod('monthly')}>Mes</button>
      </div>

      <div className={styles.dotsContainer}>
        {sections.map((_, i) => (
          <button key={i} className={`${styles.dot} ${activeCard === i ? styles.dotActive : ''}`} onClick={() => scrollToCard(i)} />
        ))}
      </div>

      <div className={styles.carouselContainer} ref={carouselRef} onScroll={handleCarouselScroll}>
        {sections.map((section, i) => (
          <div key={i} className={styles.card}>{section}</div>
        ))}
      </div>

      <BottomNav activePage="insights" />
    </div>
  );
};

export default Insights;
