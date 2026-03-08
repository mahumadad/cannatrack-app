import { useState, useEffect, useMemo } from 'react';
import { toLocalDateString, normalizeDate } from '../utils/dateHelpers';
import { calcWellbeing } from '../utils/wellbeing';
import { calculateDASS, calculatePANAS, calculatePSS } from '../utils/followUpScoring';
import { useCheckins, useDoses, useBaseline, useFollowUpsCompleted } from './queries';
import type { InsightsData, ComparisonData, ComparisonAverages, Checkin, DoseLog, Baseline, FollowUp } from '../types';

export interface PeriodAverages {
  [key: string]: string | number | undefined;
  totalCheckins: number;
}

interface TrendDataPoint {
  day: string;
  wellbeing: number;
  isDose: boolean;
}

interface InsightCard {
  field: string;
  icon: string;
  bg: string;
  label: string;
  inverse?: boolean;
  value: string;
  statusLabel: string;
  statusColor: string;
  description: string;
}

// Punto de datos del gráfico de evolución: label + métricas normalizadas + raw
// La forma es dinámica (depende de qué escalas existen), por eso se mantiene como
// Record con discriminante de tipo explícito en lugar de `any`.
type EvolutionDataPoint = Record<string, string | number | null>;

interface EvolutionMetric {
  label: string;
  emoji: string;
  color: string;
  lowerIsBetter: boolean;
  normalize: (v: number) => number;
  extract: (data: Baseline | FollowUp) => number | null;
}

// Punto de datos semanal: label + promedio de cada campo (string por .toFixed(1))
type WeeklyDataPoint = { label: string } & Record<string, string | number>;

export interface UseInsightsAnalyticsReturn {
  loading: boolean;
  insightsData: InsightsData | null;
  weeklyData: WeeklyDataPoint[];
  periodAverages: PeriodAverages | null;
  comparisonData: ComparisonData | null;
  wellbeingScore: number;
  wellbeingChange: number | null;
  trendData: TrendDataPoint[];
  bienestarAnalysis: string | null;
  insightCards: InsightCard[];
  periodDoseCount: number;
  periodCheckinCount: number;
  // Evolution
  showEvolution: boolean;
  evolutionMetrics: Record<string, EvolutionMetric>;
  chartData: EvolutionDataPoint[];
  availableMetrics: string[];
  baselineData: Baseline | null;
  completedFollowUps: FollowUp[];
}

const radarFields = ['mood', 'anxiety', 'energy', 'sleep', 'focus', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'];

const allFieldKeys = ['mood', 'energy', 'anxiety', 'focus', 'sleep', 'sociability', 'rumination', 'functionality', 'productivity', 'connection'];

const toNum = (v: unknown): number | null => { if (v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n; };

const EVOLUTION_METRICS: Record<string, EvolutionMetric> = {
  depression: { label: 'Depresión', emoji: '😔', color: '#7B1FA2', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.depression.scaled ?? null },
  anxiety: { label: 'Ansiedad', emoji: '😰', color: '#F44336', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.anxiety.scaled ?? null },
  stress: { label: 'Estrés', emoji: '😤', color: '#FF9800', lowerIsBetter: true, normalize: v => (v / 42) * 100, extract: d => calculateDASS(d)?.stress.scaled ?? null },
  positiveAffect: { label: 'Af. Positivo', emoji: '😊', color: '#4CAF50', lowerIsBetter: false, normalize: v => ((v - 10) / 40) * 100, extract: d => calculatePANAS(d)?.positiveAffect ?? null },
  negativeAffect: { label: 'Af. Negativo', emoji: '😞', color: '#795548', lowerIsBetter: true, normalize: v => ((v - 10) / 40) * 100, extract: d => calculatePANAS(d)?.negativeAffect ?? null },
  pss: { label: 'Estrés Percibido', emoji: '🧠', color: '#E91E63', lowerIsBetter: true, normalize: v => (v / 40) * 100, extract: d => calculatePSS(d)?.total ?? null },
  lifeSat: { label: 'Satisfacción', emoji: '⭐', color: '#FFC107', lowerIsBetter: false, normalize: v => (v / 10) * 100, extract: d => toNum(d.life_satisfaction) },
};

export function useInsightsAnalytics(
  userId: string | undefined,
  period: 'weekly' | 'monthly',
  allFields: Record<string, { label: string; emoji: string; color: string }>
): UseInsightsAnalyticsReturn {
  const { data: rawCheckins = [], isLoading: loadingCheckins } = useCheckins(userId, 30);
  const { data: rawDoses = [], isLoading: loadingDoses } = useDoses(userId, 30);
  const { data: rawBaseline } = useBaseline(userId);
  const { data: rawFollowUps = [] } = useFollowUpsCompleted(userId);

  const loading = loadingCheckins || loadingDoses;

  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [periodAverages, setPeriodAverages] = useState<PeriodAverages | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [baselineData, setBaselineData] = useState<Baseline | null>(null);
  const [completedFollowUps, setCompletedFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    if (rawBaseline?.is_locked) setBaselineData(rawBaseline);
    if (Array.isArray(rawFollowUps) && rawFollowUps.length > 0) setCompletedFollowUps(rawFollowUps as FollowUp[]);
  }, [rawBaseline, rawFollowUps]);

  // Build insights data from raw checkins/doses
  useEffect(() => {
    if (rawCheckins.length === 0) {
      setInsightsData(null);
      return;
    }

    const checkins = rawCheckins;
    const doses = rawDoses;

    const last7Days = checkins.slice(0, 7).reverse();
    const emotional = last7Days.map((c: Checkin) => ({
      day: new Date(c.date).toLocaleDateString('es-ES', { weekday: 'short' }),
      ...Object.keys(allFields).reduce<Record<string, number>>((acc, key) => ({ ...acc, [key]: (c[key] as number | undefined) ?? 5 }), {})
    }));

    const calcAvg = (field: string) => (checkins.reduce((sum: number, c: Checkin) => sum + ((c[field] as number | undefined) ?? 5), 0) / checkins.length).toFixed(1);

    setInsightsData({
      emotional,
      avgMood: calcAvg('mood'), avgEnergy: calcAvg('energy'), avgAnxiety: calcAvg('anxiety'),
      avgFocus: calcAvg('focus'), avgSleep: calcAvg('sleep'), avgSociability: calcAvg('sociability'),
      avgRumination: calcAvg('rumination'), avgFunctionality: calcAvg('functionality'),
      avgProductivity: calcAvg('productivity'), avgConnection: calcAvg('connection'),
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
        const weekPoint: WeeklyDataPoint = { label: weekLabel };
        Object.keys(allFields).forEach(field => {
          weekPoint[field] = (weekCheckins.reduce((s: number, c: Checkin) => s + ((c[field] as number | undefined) ?? 5), 0) / weekCheckins.length).toFixed(1);
        });
        weeks.push(weekPoint);
      }
    }
    setWeeklyData(weeks.reverse());
  }, [rawCheckins, rawDoses]);

  // Period averages
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

    const calcAvg = (arr: Checkin[], field: string) => (arr.reduce((s: number, c: Checkin) => s + (parseFloat(String(c[field] ?? 5)) || 5), 0) / arr.length).toFixed(1);

    const avgs: PeriodAverages = { totalCheckins: 0 };
    allFieldKeys.forEach(field => {
      avgs[field] = calcAvg(periodCheckins, field);
    });
    avgs.totalCheckins = periodCheckins.length;

    setPeriodAverages(avgs);
  }, [period, insightsData?.checkins]);

  // Comparison data
  useEffect(() => {
    if (!insightsData?.checkins || !insightsData?.doses) return;
    const periodDays = period === 'weekly' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    cutoffDate.setHours(0, 0, 0, 0);

    const cutoffStr = toLocalDateString(cutoffDate);
    const filteredCheckins = insightsData.checkins.filter(c => normalizeDate(c.date) > cutoffStr);
    const filteredDoses = insightsData.doses.filter(d => normalizeDate(d.date) > cutoffStr);

    const doseDates = new Set(filteredDoses.map(d => normalizeDate(d.date)));

    const withDose = filteredCheckins.filter(c => doseDates.has(normalizeDate(c.date)));
    const withoutDose = filteredCheckins.filter(c => !doseDates.has(normalizeDate(c.date)));

    if (withDose.length > 0 && withoutDose.length > 0) {
      const calcAvg = (arr: Checkin[], field: string) => (arr.reduce((s: number, c: Checkin) => s + ((c[field] as number | undefined) ?? 5), 0) / arr.length).toFixed(1);

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

      setComparisonData({ withDose: avgWithDose, withoutDose: avgWithoutDose });
    } else {
      setComparisonData(null);
    }
  }, [period, insightsData?.checkins, insightsData?.doses]);

  // Helper: extrae el valor numérico de un campo desde PeriodAverages o InsightsData
  // PeriodAverages indexa por nombre corto ("mood"), InsightsData por "avgMood"
  const resolveAvg = (avgs: PeriodAverages | InsightsData, field: string): string | number | undefined => {
    const avgKey = `avg${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    // PeriodAverages tiene índice de string, InsightsData tiene avgXxx
    const fromPeriod = (avgs as PeriodAverages)[field];
    const fromInsights = (avgs as InsightsData)[avgKey as keyof InsightsData];
    return (fromPeriod ?? fromInsights) as string | number | undefined;
  };

  // Helper: convierte Checkin al mapa que espera calcWellbeing (index string → number|undefined)
  const checkinToWellbeing = (c: Checkin): Record<string, string | number | undefined> =>
    Object.fromEntries(
      Object.entries(c).map(([k, v]) => [k, v as string | number | undefined])
    );

  // Derived values (computed from state, no side effects)
  const derivedData = useMemo(() => {
    if (!insightsData) {
      return {
        wellbeingScore: 0,
        wellbeingChange: null as number | null,
        trendData: [] as TrendDataPoint[],
        bienestarAnalysis: null as string | null,
        insightCards: [] as InsightCard[],
        periodDoseCount: 0,
        periodCheckinCount: 0,
        showEvolution: false,
        chartData: [] as EvolutionDataPoint[],
        availableMetrics: [] as string[],
      };
    }

    const avgs: PeriodAverages | InsightsData = periodAverages ?? insightsData;

    // Wellbeing score
    const wellbeingScore = calcWellbeing({
      mood: resolveAvg(avgs, 'mood'),
      energy: resolveAvg(avgs, 'energy'),
      anxiety: resolveAvg(avgs, 'anxiety'),
      focus: resolveAvg(avgs, 'focus'),
      sleep: resolveAvg(avgs, 'sleep'),
      sociability: resolveAvg(avgs, 'sociability'),
      rumination: resolveAvg(avgs, 'rumination'),
      functionality: resolveAvg(avgs, 'functionality'),
      productivity: resolveAvg(avgs, 'productivity'),
      connection: resolveAvg(avgs, 'connection'),
    });

    // Trend data
    const days = period === 'weekly' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toLocalDateString(cutoff);
    const periodCheckins = insightsData.checkins
      .filter((c: Checkin) => normalizeDate(c.date) > cutoffStr)
      .reverse();
    const doseDates = new Set(insightsData.doses.map((d: DoseLog) => normalizeDate(d.date)));
    const trendData: TrendDataPoint[] = periodCheckins.map((c: Checkin) => ({
      day: new Date(c.date).toLocaleDateString('es-ES', { weekday: 'short' }),
      wellbeing: parseFloat(calcWellbeing(checkinToWellbeing(c)).toFixed(1)),
      isDose: doseDates.has(normalizeDate(c.date))
    }));

    // Wellbeing change
    const now = new Date();
    const cutoff2 = new Date(now); cutoff2.setDate(now.getDate() - days);
    const prevCutoff = new Date(now); prevCutoff.setDate(now.getDate() - days * 2);
    const cutoffStr2 = toLocalDateString(cutoff2);
    const prevCutoffStr = toLocalDateString(prevCutoff);
    const current = insightsData.checkins.filter((c: Checkin) => normalizeDate(c.date) > cutoffStr2);
    const prev = insightsData.checkins.filter((c: Checkin) => {
      const d = normalizeDate(c.date);
      return d > prevCutoffStr && d <= cutoffStr2;
    });
    const wellbeingChange = (current.length > 0 && prev.length > 0)
      ? (() => {
          const currentAvg = current.reduce((sum: number, c: Checkin) => sum + calcWellbeing(checkinToWellbeing(c)), 0) / current.length;
          const prevAvg = prev.reduce((sum: number, c: Checkin) => sum + calcWellbeing(checkinToWellbeing(c)), 0) / prev.length;
          return prevAvg !== 0 ? Math.round(((currentAvg - prevAvg) / prevAvg) * 100) : 0;
        })()
      : null;

    // Bienestar analysis
    let bienestarAnalysis: string | null = null;
    if (trendData.length >= 2) {
      const values = trendData.map(d => d.wellbeing);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const trend = values[values.length - 1] - values[0];
      const doseDaysArr = trendData.filter(d => d.isDose);
      const pauseDaysArr = trendData.filter(d => !d.isDose);
      const doseAvg = doseDaysArr.length > 0 ? doseDaysArr.reduce((s, d) => s + d.wellbeing, 0) / doseDaysArr.length : 0;
      const pauseAvg = pauseDaysArr.length > 0 ? pauseDaysArr.reduce((s, d) => s + d.wellbeing, 0) / pauseDaysArr.length : 0;

      let text = '';
      if (trend > 1) {
        text = `Tu bienestar muestra una tendencia al alza. Has mejorado ${trend.toFixed(1)} puntos en ${period === 'weekly' ? 'la última semana' : 'el último mes'}.`;
      } else if (trend < -1) {
        text = `Tu bienestar ha disminuido ${Math.abs(trend).toFixed(1)} puntos recientemente. Considera revisar tus hábitos.`;
      } else {
        text = `Tu bienestar se mantiene estable con un promedio de ${avg.toFixed(1)}/10.`;
      }

      if (doseDaysArr.length > 0 && pauseDaysArr.length > 0 && Math.abs(doseAvg - pauseAvg) > 0.5) {
        const better = doseAvg > pauseAvg;
        text += ` ${better ? 'Los días de dosis muestran mejores resultados' : 'Los días de pausa muestran mejores resultados'} (${doseAvg.toFixed(1)} vs ${pauseAvg.toFixed(1)}).`;
      }
      bienestarAnalysis = text;
    }

    // Insight cards
    const insightDefs: { field: string; icon: string; bg: string; label: string; inverse?: boolean }[] = [
      { field: 'focus', icon: '🎯', bg: 'rgba(59, 130, 246, 0.1)', label: 'Enfoque Promedio' },
      { field: 'anxiety', icon: '😰', bg: 'rgba(147, 51, 234, 0.1)', label: 'Ansiedad', inverse: true },
      { field: 'sleep', icon: '😴', bg: 'rgba(249, 115, 22, 0.1)', label: 'Calidad de Sueño' },
      { field: 'energy', icon: '⚡', bg: 'rgba(34, 197, 94, 0.1)', label: 'Energía' },
      { field: 'mood', icon: '😊', bg: 'rgba(234, 179, 8, 0.1)', label: 'Estado de Ánimo' },
      { field: 'productivity', icon: '📈', bg: 'rgba(236, 72, 153, 0.1)', label: 'Productividad' },
    ];
    const insightCards: InsightCard[] = insightDefs.map(def => {
      const val = parseFloat(String(resolveAvg(avgs, def.field) ?? '5'));
      const numericValue = `${val.toFixed(1)}/10`;
      let statusLabel = numericValue;
      let statusColor = 'var(--color-text)';
      let desc = '';

      if (comparisonData) {
        const doseVal = parseFloat(String(comparisonData.withDose[def.field] || '5'));
        const noDoseVal = parseFloat(String(comparisonData.withoutDose[def.field] || '5'));
        const diff = doseVal - noDoseVal;
        const pct = noDoseVal > 0 ? Math.round(Math.abs(diff / noDoseVal) * 100) : 0;
        const isInverse = def.inverse === true;
        const better = isInverse ? diff < 0 : diff > 0;

        if (pct >= 15) {
          statusLabel = better
            ? (isInverse ? 'Reducción Alta' : 'Mejora Significativa')
            : (isInverse ? 'Aumento Notable' : 'Variación Alta');
          statusColor = better ? '#16a34a' : '#dc2626';
        } else if (pct >= 5) {
          statusLabel = better
            ? (isInverse ? 'Reducción Moderada' : 'Mejora Moderada')
            : (isInverse ? 'Aumento Leve' : 'Variación Leve');
          statusColor = better ? '#16a34a' : '#ea580c';
        } else {
          statusLabel = 'Estable';
          statusColor = '#6B5E50';
        }

        const descMap: Record<string, string> = {
          focus: pct >= 5 && better
            ? `Tu concentración es un ${pct}% mayor en los días de dosis comparado con los días de pausa.`
            : pct >= 5
              ? `Tu concentración varía un ${pct}% entre días de dosis y pausa. Monitorea factores externos.`
              : `Tu nivel de concentración se mantiene consistente independientemente de la dosis.`,
          anxiety: pct >= 15 && better
            ? `Has reportado niveles significativamente más bajos de ansiedad en días de dosis.`
            : pct >= 5 && better
              ? `Tu ansiedad tiende a disminuir un ${pct}% en días de dosis.`
              : pct >= 5
                ? `Tu ansiedad muestra variación de ${pct}% entre días con y sin dosis.`
                : `Tus patrones de ansiedad se mantienen estables sin alteraciones notables.`,
          sleep: pct >= 5 && better
            ? `Tu calidad de sueño mejora un ${pct}% en días de dosis. El descanso es clave para tu bienestar.`
            : `Tus patrones de sueño se mantienen consistentes sin alteraciones notables.`,
          energy: pct >= 5 && better
            ? `Tu nivel de energía aumenta un ${pct}% en días de dosis respecto a días de pausa.`
            : pct >= 5
              ? `Tu energía fluctúa un ${pct}% entre días de dosis y pausa.`
              : `Tu energía se mantiene estable independientemente del protocolo.`,
          mood: pct >= 5 && better
            ? `Tu estado de ánimo es un ${pct}% mejor en días de dosis. Tendencia positiva.`
            : pct >= 5
              ? `Tu ánimo varía un ${pct}% entre días de dosis y pausa.`
              : `Tu estado emocional se mantiene equilibrado durante todo el protocolo.`,
          productivity: pct >= 5 && better
            ? `Tu productividad incrementa un ${pct}% en días de dosis.`
            : pct >= 5
              ? `Tu productividad varía un ${pct}% entre días con y sin dosis.`
              : `Tu rendimiento productivo es consistente sin importar la dosis.`,
        };
        desc = descMap[def.field] || '';
      } else {
        if (val >= 7.5) {
          statusLabel = 'Excelente';
          statusColor = '#16a34a';
          desc = `Excelente ${def.label.toLowerCase()}. Mantén tus hábitos actuales.`;
        } else if (val >= 5) {
          statusLabel = 'Normal';
          statusColor = '#6B5E50';
          desc = `${def.label} dentro del rango normal. Registra más datos para análisis comparativo.`;
        } else {
          statusLabel = 'Bajo';
          statusColor = '#ea580c';
          desc = `${def.label} por debajo del promedio. Considera factores que puedan influir.`;
        }
      }

      return { ...def, value: numericValue, statusLabel, statusColor, description: desc };
    });

    // Period counts
    const cutoff3 = new Date(); cutoff3.setDate(cutoff3.getDate() - days);
    const cutoffStr3 = toLocalDateString(cutoff3);
    const periodDoseCount = insightsData.doses.filter((d: DoseLog) => normalizeDate(d.date) > cutoffStr3).length;
    const periodCheckinCount = insightsData.checkins.filter((c: Checkin) => normalizeDate(c.date) > cutoffStr3).length;

    // Evolution
    const showEvolution = period === 'monthly' && !!baselineData && completedFollowUps.length > 0;
    let chartData: EvolutionDataPoint[] = [];
    let availableMetrics: string[] = [];

    if (showEvolution && baselineData) {
      const allDataPoints: Array<Baseline | FollowUp> = [baselineData, ...completedFollowUps];
      availableMetrics = Object.keys(EVOLUTION_METRICS).filter(key => {
        const metric = EVOLUTION_METRICS[key];
        const baseVal = metric.extract(baselineData);
        if (baseVal === null) return false;
        return completedFollowUps.some(fu => metric.extract(fu) !== null);
      });

      chartData = allDataPoints.map((dp, idx) => {
        const monthName = (dp as FollowUp).month_year;
        const point: EvolutionDataPoint = { label: idx === 0 ? 'Baseline' : (monthName ?? `Mes ${idx}`) };
        Object.entries(EVOLUTION_METRICS).forEach(([key, metric]) => {
          const raw = metric.extract(dp);
          if (raw !== null) point[key] = metric.normalize(raw);
          point[`${key}_raw`] = raw;
        });
        return point;
      });
    }

    return {
      wellbeingScore,
      wellbeingChange,
      trendData,
      bienestarAnalysis,
      insightCards,
      periodDoseCount,
      periodCheckinCount,
      showEvolution,
      chartData,
      availableMetrics,
    };
  }, [insightsData, periodAverages, comparisonData, period, baselineData, completedFollowUps]);

  return {
    loading,
    insightsData,
    weeklyData,
    periodAverages,
    comparisonData,
    baselineData,
    completedFollowUps,
    evolutionMetrics: EVOLUTION_METRICS,
    ...derivedData,
  };
}
