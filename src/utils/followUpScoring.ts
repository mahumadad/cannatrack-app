// Shared scoring functions for DASS-21, PANAS, PSS-10
// Used by FollowUp.tsx (completed analysis) and Insights.tsx (clinical evolution)

interface ScoringData {
  [key: string]: unknown;
}

// ============================
// DASS-21
// ============================

export interface DASSResult {
  depression: { scaled: number; severity: string };
  anxiety: { scaled: number; severity: string };
  stress: { scaled: number; severity: string };
}

export const calculateDASS = (data: ScoringData): DASSResult | null => {
  const get = (key: string) => { const v = data[key]; if (v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n; };
  const depressionItems = [3, 5, 10, 13, 16, 17, 21];
  const anxietyItems = [2, 4, 7, 9, 15, 19, 20];
  const stressItems = [1, 6, 8, 11, 12, 14, 18];

  const sumItems = (items: number[]) => {
    let sum = 0;
    for (const i of items) { const v = get(`dass_${i}`); if (v === null) return null; sum += v; }
    return sum;
  };

  const depRaw = sumItems(depressionItems);
  const anxRaw = sumItems(anxietyItems);
  const strRaw = sumItems(stressItems);
  if (depRaw === null || anxRaw === null || strRaw === null) return null;

  const depS = depRaw * 2, anxS = anxRaw * 2, strS = strRaw * 2;

  const depSev = (s: number) => s <= 9 ? 'Normal' : s <= 13 ? 'Leve' : s <= 20 ? 'Moderado' : s <= 27 ? 'Severo' : 'Muy severo';
  const anxSev = (s: number) => s <= 7 ? 'Normal' : s <= 9 ? 'Leve' : s <= 14 ? 'Moderado' : s <= 19 ? 'Severo' : 'Muy severo';
  const strSev = (s: number) => s <= 14 ? 'Normal' : s <= 18 ? 'Leve' : s <= 25 ? 'Moderado' : s <= 33 ? 'Severo' : 'Muy severo';

  return {
    depression: { scaled: depS, severity: depSev(depS) },
    anxiety: { scaled: anxS, severity: anxSev(anxS) },
    stress: { scaled: strS, severity: strSev(strS) },
  };
};

// ============================
// PANAS
// ============================

export interface PANASResult {
  positiveAffect: number;
  negativeAffect: number;
  paLabel: string;
  naLabel: string;
}

export const calculatePANAS = (data: ScoringData): PANASResult | null => {
  const get = (key: string) => { const v = data[key]; if (v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n; };
  const paItems = [1, 3, 5, 9, 10, 12, 14, 16, 17, 19];
  const naItems = [2, 4, 6, 7, 8, 11, 13, 15, 18, 20];

  let paSum = 0, naSum = 0;
  for (const i of paItems) { const v = get(`panas_${i}`); if (v === null) return null; paSum += v; }
  for (const i of naItems) { const v = get(`panas_${i}`); if (v === null) return null; naSum += v; }

  return {
    positiveAffect: paSum,
    negativeAffect: naSum,
    paLabel: paSum >= 38 ? 'Alto' : paSum >= 28 ? 'Promedio' : 'Bajo',
    naLabel: naSum <= 15 ? 'Bajo (favorable)' : naSum <= 25 ? 'Promedio' : 'Alto (desfavorable)',
  };
};

// ============================
// PSS-10
// ============================

export interface PSSResult {
  total: number;
  severity: string;
}

export const calculatePSS = (data: ScoringData): PSSResult | null => {
  const get = (key: string) => { const v = data[key]; if (v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n; };
  const positiveItems = [2, 3, 6, 7, 10];
  const negativeItems = [1, 4, 5, 8, 9];

  let total = 0;
  for (const i of positiveItems) { const v = get(`pss_${i}`); if (v === null) return null; total += (4 - v); }
  for (const i of negativeItems) { const v = get(`pss_${i}`); if (v === null) return null; total += v; }

  return { total, severity: total <= 13 ? 'Bajo' : total <= 26 ? 'Moderado' : 'Alto' };
};

// ============================
// Helpers
// ============================

export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'Normal': case 'Bajo': case 'Bajo (favorable)': return '#5a7a3a'; // --color-success (oliva)
    case 'Leve': case 'Promedio': return '#c07a28'; // --color-warning (ámbar tostado)
    case 'Moderado': case 'Alto (desfavorable)': return '#8f5a1a'; // --color-warning-text
    case 'Severo': case 'Alto': return '#b84c3a'; // --color-danger (terracota)
    case 'Muy severo': return '#8f3226'; // --color-danger-dark
    default: return '#6B5B4E'; // --color-text-secondary
  }
};

// ============================
// Label Maps
// ============================

export const overallChangeLabels: Record<string, string> = {
  mucho_peor: '😢 Mucho peor', peor: '😕 Algo peor', igual: '😐 Igual',
  mejor: '🙂 Algo mejor', mucho_mejor: '😄 Mucho mejor'
};

export const changeAreaLabels: Record<string, string> = {
  animo: '😊 Ánimo', ansiedad: '😰 Ansiedad', foco: '🎯 Foco',
  relaciones: '❤️ Relaciones', creatividad: '🎨 Creatividad', energia: '⚡ Energía',
  sentido_vital: '🌟 Sentido vital', ninguna: '❌ Ninguna'
};

export const attributionLabels: Record<string, string> = {
  microdosis: '💊 Microdosis', trabajo_personal: '🧘 Trabajo personal',
  terapia: '💬 Terapia', entorno: '🏡 Entorno', mezcla: '🔀 Mezcla de factores'
};

export const continueLabels: Record<string, string> = {
  si: '✅ Sí, continuar igual', modificar: '🔄 Sí, pero modificar', no: '❌ No, pausar'
};
