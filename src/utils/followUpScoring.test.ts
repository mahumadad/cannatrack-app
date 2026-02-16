import { describe, it, expect } from 'vitest';
import {
  calculateDASS,
  calculatePANAS,
  calculatePSS,
  getSeverityColor,
  overallChangeLabels,
  changeAreaLabels,
  attributionLabels,
  continueLabels
} from './followUpScoring';

// Helper: create DASS data
const makeDASS = (value: number) => {
  const data: Record<string, number> = {};
  for (let i = 1; i <= 21; i++) data[`dass_${i}`] = value;
  return data;
};

// Helper: create PANAS data
const makePANAS = (value: number) => {
  const data: Record<string, number> = {};
  for (let i = 1; i <= 20; i++) data[`panas_${i}`] = value;
  return data;
};

// Helper: create PSS data
const makePSS = (value: number) => {
  const data: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) data[`pss_${i}`] = value;
  return data;
};

// ─── calculateDASS ─────────────────────────────────────────────
describe('calculateDASS', () => {
  it('todos en 0 → Normal en las 3 subescalas', () => {
    const result = calculateDASS(makeDASS(0));
    expect(result).not.toBeNull();
    expect(result!.depression.scaled).toBe(0);
    expect(result!.depression.severity).toBe('Normal');
    expect(result!.anxiety.severity).toBe('Normal');
    expect(result!.stress.severity).toBe('Normal');
  });

  it('todos en 3 → Muy severo', () => {
    const result = calculateDASS(makeDASS(3));
    expect(result).not.toBeNull();
    expect(result!.depression.scaled).toBe(42);
    expect(result!.depression.severity).toBe('Muy severo');
  });

  it('retorna null con datos incompletos', () => {
    expect(calculateDASS({ dass_1: 2 })).toBeNull();
  });

  it('acepta strings numéricos', () => {
    const data = makeDASS(0);
    data.dass_1 = '2' as unknown as number;
    const result = calculateDASS(data);
    expect(result).not.toBeNull();
  });

  it('escala es raw × 2', () => {
    // Todos depression items (3,5,10,13,16,17,21) en 1, rest en 0
    const data = makeDASS(0);
    data.dass_3 = 1; data.dass_5 = 1; data.dass_10 = 1;
    data.dass_13 = 1; data.dass_16 = 1; data.dass_17 = 1; data.dass_21 = 1;
    const result = calculateDASS(data);
    expect(result!.depression.scaled).toBe(14); // 7*2
    expect(result!.depression.severity).toBe('Moderado');
  });
});

// ─── calculatePANAS ────────────────────────────────────────────
describe('calculatePANAS', () => {
  it('todos en 1 → afecto bajo favorable', () => {
    const result = calculatePANAS(makePANAS(1));
    expect(result).not.toBeNull();
    expect(result!.positiveAffect).toBe(10);
    expect(result!.negativeAffect).toBe(10);
    expect(result!.paLabel).toBe('Bajo');
    expect(result!.naLabel).toBe('Bajo (favorable)');
  });

  it('todos en 5 → alto PA y NA desfavorable', () => {
    const result = calculatePANAS(makePANAS(5));
    expect(result!.positiveAffect).toBe(50);
    expect(result!.paLabel).toBe('Alto');
    expect(result!.naLabel).toBe('Alto (desfavorable)');
  });

  it('retorna null si faltan datos', () => {
    expect(calculatePANAS({ panas_1: 3 })).toBeNull();
  });

  it('PA promedio con valores 3', () => {
    const result = calculatePANAS(makePANAS(3));
    expect(result!.positiveAffect).toBe(30);
    expect(result!.paLabel).toBe('Promedio');
  });
});

// ─── calculatePSS ──────────────────────────────────────────────
describe('calculatePSS', () => {
  it('todos en 0 → total 20, moderado', () => {
    const result = calculatePSS(makePSS(0));
    expect(result!.total).toBe(20);
    expect(result!.severity).toBe('Moderado');
  });

  it('estrés bajo', () => {
    const data = makePSS(0);
    [2, 3, 6, 7, 10].forEach(i => data[`pss_${i}`] = 4);
    [1, 4, 5, 8, 9].forEach(i => data[`pss_${i}`] = 2);
    const result = calculatePSS(data);
    expect(result!.total).toBe(10);
    expect(result!.severity).toBe('Bajo');
  });

  it('estrés alto', () => {
    const data = makePSS(0);
    [1, 4, 5, 8, 9].forEach(i => data[`pss_${i}`] = 4);
    const result = calculatePSS(data);
    expect(result!.total).toBe(40);
    expect(result!.severity).toBe('Alto');
  });

  it('retorna null si faltan datos', () => {
    expect(calculatePSS({ pss_1: 2 })).toBeNull();
  });
});

// ─── getSeverityColor ──────────────────────────────────────────
describe('getSeverityColor', () => {
  it('Normal → verde', () => expect(getSeverityColor('Normal')).toBe('#4CAF50'));
  it('Bajo → verde', () => expect(getSeverityColor('Bajo')).toBe('#4CAF50'));
  it('Leve → naranja', () => expect(getSeverityColor('Leve')).toBe('#FF9800'));
  it('Moderado → naranja oscuro', () => expect(getSeverityColor('Moderado')).toBe('#F57C00'));
  it('Severo → rojo', () => expect(getSeverityColor('Severo')).toBe('#F44336'));
  it('Muy severo → rojo oscuro', () => expect(getSeverityColor('Muy severo')).toBe('#D32F2F'));
  it('desconocido → gris', () => expect(getSeverityColor('???')).toBe('#6B5E50'));
});

// ─── Label Maps ────────────────────────────────────────────────
describe('Label Maps', () => {
  it('overallChangeLabels tiene 5 opciones', () => {
    expect(Object.keys(overallChangeLabels)).toHaveLength(5);
  });

  it('changeAreaLabels tiene 8 áreas', () => {
    expect(Object.keys(changeAreaLabels)).toHaveLength(8);
  });

  it('attributionLabels tiene 5 atribuciones', () => {
    expect(Object.keys(attributionLabels)).toHaveLength(5);
  });

  it('continueLabels tiene 3 opciones', () => {
    expect(Object.keys(continueLabels)).toHaveLength(3);
  });
});
