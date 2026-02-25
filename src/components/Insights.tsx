import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toLocalDateString, normalizeDate } from '../utils/dateHelpers';
import { calcWellbeing } from '../utils/wellbeing';
import { calculateDASS, calculatePANAS, calculatePSS } from '../utils/followUpScoring';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from '@phosphor-icons/react';
import { EmptyChart } from './EmptyStates';
import BottomNav from './BottomNav';
import styles from './Insights.module.css';
import sharedFieldLabels from '../utils/fieldLabels';
import { useUser } from '../hooks/useUser';
import useSwipeBack from '../hooks/useSwipeBack';
import { useCheckins, useDoses, useBaseline, useFollowUpsCompleted } from '../hooks/queries';
import type { InsightsData, ComparisonData, ComparisonAverages, Checkin, DoseLog } from '../types';

interface PeriodAverages {
  [key: string]: string | number | undefined;
  totalCheckins: number;
}

const Insights: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: rawCheckins = [], isLoading: loadingCheckins } = useCheckins(user?.id, 30);
  const { data: rawDoses = [], isLoading: loadingDoses } = useDoses(user?.id, 30);
  const { data: rawBaseline } = useBaseline(user?.id);
  const { data: rawFollowUps = [] } = useFollowUpsCompleted(user?.id);

  const loading = loadingCheckins || loadingDoses;

  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [weeklyData, setWeeklyData] = useState<Record<string, any>[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>(['mood', 'energy']);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [hoveredRadarField, setHoveredRadarField] = useState<string | null>(null);
  const [periodAverages, setPeriodAverages] = useState<PeriodAverages | null>(null);
  const [baselineData, setBaselineData] = useState<Record<string, any> | null>(null);
  const [completedFollowUps, setCompletedFollowUps] = useState<Record<string, any>[]>([]);
  const [selectedEvolutionMetrics, setSelectedEvolutionMetrics] = useState<string[]>(['depression', 'anxiety', 'stress']);
  useSwipeBack();

  const [activeCard, setActiveCard] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 1;
    const gap = 16;
    const index = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveCard(index);
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el || !el.firstElementChild) return;
    const cardWidth = el.firstElementChild.getBoundingClientRect().width;
    const gap = 16;
    el.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
  }, []);

  const allFields = sharedFieldLabels;

  const radarFields = ['mood', 'anxiety', 'energy', 'sleep', 'focus', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'];

  useEffect(() => {
    if (rawBaseline?.is_locked) setBaselineData(rawBaseline);
    if (Array.isArray(rawFollowUps) && rawFollowUps.length > 0) setCompletedFollowUps(rawFollowUps);
  }, [rawBaseline, rawFollowUps]);

  useEffect(() => {
    if (rawCheckins.length === 0) {
      setInsightsData(null);
      return;
    }

    const checkins = rawCheckins;
    const doses = rawDoses;

    const last7Days = checkins.slice(0, 7).reverse();
    const emotional = last7Days.map((c: any) => ({
      day: new Date(c.date).toLocaleDateString('es-ES', { weekday: 'short' }),
      ...Object.keys(allFields).reduce((acc: any, key: string) => ({ ...acc, [key]: c[key] || 5 }), {})
    }));

    const avgMood = (checkins.reduce((sum: number, c: any) => sum + (c.mood || 5), 0) / checkins.length).toFixed(1);
    const avgEnergy = (checkins.reduce((sum: number, c: any) => sum + (c.energy || 5), 0) / checkins.length).toFixed(1);
    const avgAnxiety = (checkins.reduce((sum: number, c: any) => sum + (c.anxiety || 5), 0) / checkins.length).toFixed(1);
    const avgFocus = (checkins.reduce((sum: number, c: any) => sum + (c.focus || 5), 0) / checkins.length).toFixed(1);
    const avgSleep = (checkins.reduce((sum: number, c: any) => sum + (c.sleep || 5), 0) / checkins.length).toFixed(1);
    const avgSociability = (checkins.reduce((sum: number, c: any) => sum + (c.sociability || 5), 0) / checkins.length).toFixed(1);
    const avgRumination = (checkins.reduce((sum: number, c: any) => sum + (c.rumination || 5), 0) / checkins.length).toFixed(1);
    const avgFunctionality = (checkins.reduce((sum: number, c: any) => sum + (c.functionality || 5), 0) / checkins.length).toFixed(1);
    const avgProductivity = (checkins.reduce((sum: number, c: any) => sum + (c.productivity || 5), 0) / checkins.length).toFixed(1);
    const avgConnection = (checkins.reduce((sum: number, c: any) => sum + (c.connection || 5), 0) / checkins.length).toFixed(1);

    setInsightsData({
      emotional,
      avgMood, avgEnergy, avgAnxiety, avgFocus, avgSleep,
      avgSociability, avgRumination, avgFunctionality, avgProductivity, avgConnection,
      totalDoses: doses.length,
      totalCheckins: checkins.length,
      checkins,
      doses
    });

    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const weekCheckins = checkins.slice(i * 7, (i + 1) * 7);
      if (weekCheckins.length > 0) {
        const firstDate = new Date(weekCheckins[weekCheckins.length - 1].date);
        const lastDate = new Date(weekCheckins[0].date);
        const formatDay = (d: Date) => d.getDate();
        const formatMonth = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' });
        const weekLabel = firstDate.getMonth() === lastDate.getMonth()
          ? `${formatDay(firstDate)}-${formatDay(lastDate)} ${formatMonth(lastDate)}`
          : `${formatDay(firstDate)} ${formatMonth(firstDate)}-${formatDay(lastDate)} ${formatMonth(lastDate)}`;
        const weekPoint: Record<string, any> = { label: weekLabel };
        Object.keys(allFields).forEach(field => {
          weekPoint[field] = (weekCheckins.reduce((s: number, c: any) => s + (c[field] || 5), 0) / weekCheckins.length).toFixed(1);
        });
        weeks.push(weekPoint);
      }
    }
    setWeeklyData(weeks.reverse());
  }, [rawCheckins, rawDoses]);

  useEffect(() => {
    if (!insightsData?.checkins) return;
    const days = period === 'weekly' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const periodCheckins = insightsData.checkins.filter(c => {
      const cDate = normalizeDate(c.date);
      return cDate > toLocalDateString(cutoff);
    });

    if (periodCheckins.length === 0) {
      setPeriodAverages(null);
      return;
    }

    const calcAvg = (arr: any[], field: string) => (arr.reduce((s: number, c: any) => s + (parseFloat(c[field]) || 5), 0) / arr.length).toFixed(1);

    const avgs: PeriodAverages = { totalCheckins: 0 };
    ['mood', 'energy', 'anxiety', 'focus', 'sleep', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'].forEach(field => {
      avgs[field] = calcAvg(periodCheckins, field);
    });
    avgs.totalCheckins = periodCheckins.length;

    setPeriodAverages(avgs);
  }, [period, insightsData?.checkins]);

  // Recalcular comparación cuando cambia el período
  useEffect(() => {
    if (insightsData?.checkins && insightsData?.doses) {
      const days = period === 'weekly' ? 7 : 30;
      calculateComparison(insightsData.checkins, insightsData.doses, days);
    }
  }, [period, insightsData?.checkins, insightsData?.doses]);

  const calculateComparison = (checkins: Checkin[], doses: DoseLog[], periodDays: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    cutoffDate.setHours(0, 0, 0, 0);

    const cutoffStr = toLocalDateString(cutoffDate);
    const filteredCheckins = checkins.filter(c => normalizeDate(c.date) > cutoffStr);
    const filteredDoses = doses.filter(d => normalizeDate(d.date) > cutoffStr);

    const doseDates = new Set(filteredDoses.map(d => normalizeDate(d.date)));

    const withDose = filteredCheckins.filter(c => doseDates.has(normalizeDate(c.date)));
    const withoutDose = filteredCheckins.filter(c => !doseDates.has(normalizeDate(c.date)));

    if (withDose.length > 0 && withoutDose.length > 0) {
      const calcAvg = (arr: Checkin[], field: string) => (arr.reduce((s: number, c: any) => s + (c[field] || 5), 0) / arr.length).toFixed(1);

      const avgWithDose: ComparisonAverages = { count: 0, wellbeing: '0' };
      const avgWithoutDose: ComparisonAverages = { count: 0, wellbeing: '0' };

      radarFields.forEach(field => {
        avgWithDose[field] = calcAvg(withDose, field);
        avgWithoutDose[field] = calcAvg(withoutDose, field);
      });

      avgWithDose.count = withDose.length;
      avgWithoutDose.count = withoutDose.length;

      avgWithDose.wellbeing = calcWellbeing(avgWithDose).toFixed(1);
      avgWithoutDose.wellbeing = calcWellbeing(avgWithoutDose).toFixed(1);

      setComparisonData({
        withDose: avgWithDose,
        withoutDose: avgWithoutDose
      });
    } else {
      setComparisonData(null);
    }
  };

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
            <span className={styles.gaugeValue} style={{ fontSize: '28px' }}>{score.toFixed(1)}</span>
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
          <span className={styles.gaugeValue} style={{ fontSize: '20px' }}>{score}</span>
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
            <path d={createPath(withoutDose)} fill="rgba(158, 158, 158, 0.2)" stroke="#9E9E9E" strokeWidth="2" />
            
            {/* With Dose polygon (green, in front) */}
            <path d={createPath(withDose)} fill="rgba(76, 175, 80, 0.2)" stroke="#4CAF50" strokeWidth="2" />

            {/* Data points - Without Dose */}
            {radarFields.map((field, i) => {
              const point = getPoint(i, parseFloat(String(withoutDose[field])) || 5, radarFields.length);
              return <circle key={`wo-${i}`} cx={point.x} cy={point.y} r="4" fill="#9E9E9E" />;
            })}

            {/* Data points - With Dose */}
            {radarFields.map((field, i) => {
              const point = getPoint(i, parseFloat(String(withDose[field])) || 5, radarFields.length);
              return <circle key={`w-${i}`} cx={point.x} cy={point.y} r="4" fill="#4CAF50" />;
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
                      <span style={{ color: '#4CAF50' }}>Con: {withDose[field]}</span> / <span style={{ color: '#9E9E9E' }}>Sin: {withoutDose[field]}</span>
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
          <div style={{ width: 36 }}></div>
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
          <div style={{ width: 36 }}></div>
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
  const wellbeingScore = calcWellbeing({
    mood: avgs.avgMood || avgs.mood,
    energy: avgs.avgEnergy || avgs.energy,
    anxiety: avgs.avgAnxiety || avgs.anxiety,
    focus: avgs.avgFocus || avgs.focus,
    sleep: avgs.avgSleep || avgs.sleep,
    sociability: avgs.avgSociability || avgs.sociability,
    rumination: avgs.avgRumination || avgs.rumination,
    functionality: avgs.avgFunctionality || avgs.functionality,
    productivity: avgs.avgProductivity || avgs.productivity,
    connection: avgs.avgConnection || avgs.connection
  });

  // Build evolution card data (needed for sections array)
  const showEvolution = period === 'monthly' && baselineData && completedFollowUps.length > 0;

  const toNum = (v: unknown): number | null => { if (v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n; };

  const evolutionMetrics: Record<string, { label: string; emoji: string; color: string; lowerIsBetter: boolean; normalize: (v: number) => number; extract: (data: Record<string, any>) => number | null }> = {
    depression: { label: 'Depresión', emoji: '😔', color: '#7B1FA2', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.depression.scaled ?? null },
    anxiety: { label: 'Ansiedad', emoji: '😰', color: '#F44336', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.anxiety.scaled ?? null },
    stress: { label: 'Estrés', emoji: '😤', color: '#FF9800', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.stress.scaled ?? null },
    positiveAffect: { label: 'Af. Positivo', emoji: '😊', color: '#4CAF50', lowerIsBetter: false, normalize: v => ((v - 10) / 40) * 100, extract: d => calculatePANAS(d)?.positiveAffect ?? null },
    negativeAffect: { label: 'Af. Negativo', emoji: '😞', color: '#795548', lowerIsBetter: true, normalize: v => ((v - 10) / 40) * 100, extract: d => calculatePANAS(d)?.negativeAffect ?? null },
    pss: { label: 'Estrés Percibido', emoji: '🧠', color: '#E91E63', lowerIsBetter: true, normalize: v => (v / 40) * 100, extract: d => calculatePSS(d)?.total ?? null },
    lifeSat: { label: 'Satisfacción', emoji: '⭐', color: '#FFC107', lowerIsBetter: false, normalize: v => (v / 10) * 100, extract: d => toNum(d.life_satisfaction) },
  };

  let evolutionCard: React.ReactNode = null;
  if (showEvolution && baselineData) {
    const allDataPoints = [baselineData, ...completedFollowUps];
    const availableMetrics = Object.keys(evolutionMetrics).filter(key => {
      const metric = evolutionMetrics[key];
      const baseVal = metric.extract(baselineData);
      if (baseVal === null) return false;
      return completedFollowUps.some(fu => metric.extract(fu) !== null);
    });

    const chartData = allDataPoints.map((dp, idx) => {
      const point: Record<string, any> = { label: idx === 0 ? 'Baseline' : (dp.monthName || `Mes ${idx}`) };
      Object.entries(evolutionMetrics).forEach(([key, metric]) => {
        const raw = metric.extract(dp);
        if (raw !== null) point[key] = metric.normalize(raw);
        point[`${key}_raw`] = raw;
      });
      return point;
    });

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
          <p style={{ textAlign: 'center', color: '#6B5E50', padding: '20px 0', fontSize: '14px' }}>
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
                  <span className={styles.evolutionChangeArrow} style={{ color: '#6B5E50' }}>—</span>
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
                <span className={styles.evolutionChangeArrow} style={{ color: unchanged ? '#6B5E50' : improved ? '#4CAF50' : '#F44336' }}>
                  {unchanged ? '—' : diff > 0 ? `↑ ${pctChange}%` : `↓ ${pctChange}%`}
                </span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  // Build sections array — filter conditional ones
  const sections: React.ReactNode[] = [
    /* 0: Estado Emocional */
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
        <MiniGauge value={avgs.avgFocus || avgs.focus} label="Enfoque" emoji="🎯" color="#4CAF50" fieldKey="focus" />
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
          <ComparisonGauge score={comparisonData.withDose.wellbeing} label="Con Dosis" color="#4CAF50" days={comparisonData.withDose.count} />
          <ComparisonGauge score={comparisonData.withoutDose.wellbeing} label="Sin Dosis" color="#9E9E9E" days={comparisonData.withoutDose.count} />
        </div>
      </>,

      <>
        <h2 className={styles.cardTitle}>🕸️ Métricas Comparadas</h2>
        <p className={styles.cardSubtitle}>Radar comparativo de días con y sin dosis</p>
        <ComparisonRadarChart withDose={comparisonData.withDose} withoutDose={comparisonData.withoutDose} />
        <div className={styles.radarLegend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#4CAF50' }}></span>
            <span>Con Dosis</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#9E9E9E' }}></span>
            <span>Sin Dosis</span>
          </div>
        </div>
      </>
    ] : []),

    /* Evolución Clínica (condicional) */
    ...(evolutionCard ? [evolutionCard] : []),

    /* Resumen (siempre) */
    <>
      <h2 className={styles.cardTitle}>📊 Resumen</h2>
      <p className={styles.cardSubtitle}>Tu actividad en {period === 'weekly' ? 'la semana' : 'el mes'}</p>
      <div className={styles.compareGauges}>
        <div className={styles.compareGaugeItem}>
          <span style={{ fontSize: '32px' }}>💊</span>
          <span className={styles.compareGaugeLabel}>
            {(() => {
              const days = period === 'weekly' ? 7 : 30;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              const cutoffStr = toLocalDateString(cutoff);
              return insightsData.doses.filter(d => normalizeDate(d.date) > cutoffStr).length;
            })()}
          </span>
          <span className={styles.compareGaugeDays}>Dosis</span>
        </div>
        <div className={styles.compareGaugeItem}>
          <span style={{ fontSize: '32px' }}>📝</span>
          <span className={styles.compareGaugeLabel}>
            {(() => {
              const days = period === 'weekly' ? 7 : 30;
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              const cutoffStr = toLocalDateString(cutoff);
              return insightsData.checkins.filter(c => normalizeDate(c.date) > cutoffStr).length;
            })()}
          </span>
          <span className={styles.compareGaugeDays}>Reflexiones</span>
        </div>
      </div>
      {comparisonData && (
        <>
          <div className={styles.summaryDivider} />
          <p className={styles.cardSubtitle} style={{ marginTop: 8 }}>Bienestar: con dosis vs sin dosis</p>
          <div className={styles.compareGauges}>
            <ComparisonGauge score={comparisonData.withDose.wellbeing} label="Con Dosis" color="#4CAF50" days={comparisonData.withDose.count} />
            <ComparisonGauge score={comparisonData.withoutDose.wellbeing} label="Sin Dosis" color="#9E9E9E" days={comparisonData.withoutDose.count} />
          </div>
        </>
      )}
    </>
  ];

  return (
    <div className={styles.insights}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={20} weight="bold" /></button>
        <h1 className={styles.title}>Análisis y Tendencias</h1>
        <div style={{ width: 36 }}></div>
      </div>

      <div className={styles.periodToggle}>
        <button className={`${styles.periodButton} ${period === 'weekly' ? styles.active : ''}`} onClick={() => setPeriod('weekly')}>Semana</button>
        <button className={`${styles.periodButton} ${period === 'monthly' ? styles.active : ''}`} onClick={() => setPeriod('monthly')}>Mes</button>
      </div>

      <div className={styles.carouselContainer} ref={carouselRef} onScroll={handleCarouselScroll}>
        {sections.map((section, i) => (
          <div key={i} className={styles.card}>{section}</div>
        ))}
      </div>

      <div className={styles.dotsContainer}>
        {sections.map((_, i) => (
          <button key={i} className={`${styles.dot} ${activeCard === i ? styles.dotActive : ''}`} onClick={() => scrollToCard(i)} />
        ))}
      </div>

      <BottomNav activePage="insights" />
    </div>
  );
};

export default Insights;
