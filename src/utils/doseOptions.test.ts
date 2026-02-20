import { describe, it, expect } from 'vitest';
import {
  DOSE_OPTIONS, INTERNAL_SUBSTANCE, DOSE_UNIT,
  parseGramaje, parseProtocolo, extractCustomPattern,
  extractEveryXDays, parseDuracion, estimateDuration,
  inferFrequencyFromDosesAndDuration
} from './doseOptions';

describe('DOSE_OPTIONS', () => {
  it('tiene 7 opciones de dosis', () => {
    expect(DOSE_OPTIONS).toHaveLength(7);
  });

  it('cada opción tiene value, label y sublabel', () => {
    DOSE_OPTIONS.forEach(opt => {
      expect(typeof opt.value).toBe('number');
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.sublabel).toBe('string');
    });
  });

  it('valores están ordenados de menor a mayor', () => {
    for (let i = 1; i < DOSE_OPTIONS.length; i++) {
      expect(DOSE_OPTIONS[i].value).toBeGreaterThan(DOSE_OPTIONS[i - 1].value);
    }
  });

  it('rango va de 0.05g a 0.5g', () => {
    expect(DOSE_OPTIONS[0].value).toBe(0.05);
    expect(DOSE_OPTIONS[DOSE_OPTIONS.length - 1].value).toBe(0.5);
  });

  it('labels contienen unidad g', () => {
    DOSE_OPTIONS.forEach(opt => {
      expect(opt.label).toContain('g');
    });
  });
});

describe('Constants', () => {
  it('INTERNAL_SUBSTANCE es string definido', () => {
    expect(typeof INTERNAL_SUBSTANCE).toBe('string');
    expect(INTERNAL_SUBSTANCE.length).toBeGreaterThan(0);
  });

  it('DOSE_UNIT es g', () => {
    expect(DOSE_UNIT).toBe('g');
  });
});

// ─── Parsing utilities ──────────────────────────────────────────

describe('parseGramaje', () => {
  it('parsea formato "Xg"', () => {
    expect(parseGramaje('0.2g')).toBe(0.2);
    expect(parseGramaje('0.1g')).toBe(0.1);
    expect(parseGramaje('0.05g')).toBe(0.05);
  });

  it('parsea formato "X g" con espacio', () => {
    expect(parseGramaje('0.15 g')).toBe(0.15);
  });

  it('parsea formato "Xmg"', () => {
    expect(parseGramaje('200mg')).toBe(0.2);
    expect(parseGramaje('100mg')).toBe(0.1);
    expect(parseGramaje('50mg')).toBe(0.05);
  });

  it('parsea formato "X mg" con espacio', () => {
    expect(parseGramaje('150 mg')).toBe(0.15);
  });

  it('parsea número sin unidad (< 1 = gramos)', () => {
    expect(parseGramaje('0.2')).toBe(0.2);
  });

  it('parsea número sin unidad (>= 1 = miligramos)', () => {
    expect(parseGramaje('200')).toBe(0.2);
  });

  it('retorna null para null/undefined/vacío', () => {
    expect(parseGramaje(null)).toBeNull();
    expect(parseGramaje(undefined)).toBeNull();
    expect(parseGramaje('')).toBeNull();
  });

  it('retorna null para texto no parseable', () => {
    expect(parseGramaje('abc')).toBeNull();
    expect(parseGramaje('mucho')).toBeNull();
  });
});

describe('parseProtocolo', () => {
  it('detecta Fadiman', () => {
    expect(parseProtocolo('Fadiman')).toBe('fadiman');
    expect(parseProtocolo('protocolo fadiman')).toBe('fadiman');
    expect(parseProtocolo('FADIMAN clásico')).toBe('fadiman');
  });

  it('detecta Stamets', () => {
    expect(parseProtocolo('Stamets')).toBe('stamets');
    expect(parseProtocolo('Protocolo Stamets')).toBe('stamets');
  });

  it('detecta intuitivo', () => {
    expect(parseProtocolo('intuitivo')).toBe('intuitive');
    expect(parseProtocolo('libre')).toBe('intuitive');
  });

  it('detecta patrón custom "X on Y off"', () => {
    expect(parseProtocolo('4 dias on, 3 dias off')).toBe('custom');
    expect(parseProtocolo('1 on / 2 off')).toBe('custom');
  });

  it('detecta "cada X días"', () => {
    expect(parseProtocolo('cada 3 días')).toBe('every_x_days');
    expect(parseProtocolo('cada 5 dias')).toBe('every_x_days');
  });

  it('retorna null para null/undefined/no reconocido', () => {
    expect(parseProtocolo(null)).toBeNull();
    expect(parseProtocolo(undefined)).toBeNull();
    expect(parseProtocolo('algo random')).toBeNull();
  });
});

describe('extractCustomPattern', () => {
  it('extrae patrón "X on, Y off"', () => {
    expect(extractCustomPattern('4 dias on, 3 dias off')).toEqual({ on: 4, off: 3 });
    expect(extractCustomPattern('1 on / 2 off')).toEqual({ on: 1, off: 2 });
  });

  it('retorna null si no hay patrón', () => {
    expect(extractCustomPattern(null)).toBeNull();
    expect(extractCustomPattern('Fadiman')).toBeNull();
  });
});

describe('extractEveryXDays', () => {
  it('extrae intervalo "cada X días"', () => {
    expect(extractEveryXDays('cada 3 días')).toBe(3);
    expect(extractEveryXDays('cada 5 dias')).toBe(5);
  });

  it('retorna null si no matchea', () => {
    expect(extractEveryXDays(null)).toBeNull();
    expect(extractEveryXDays('Fadiman')).toBeNull();
  });
});

describe('parseDuracion', () => {
  it('parsea "X días"', () => {
    expect(parseDuracion('30 días')).toBe(30);
    expect(parseDuracion('60 dias')).toBe(60);
  });

  it('parsea "X meses"', () => {
    expect(parseDuracion('2 meses')).toBe(60);
    expect(parseDuracion('1 mes')).toBe(30);
  });

  it('parsea "X semanas"', () => {
    expect(parseDuracion('4 semanas')).toBe(28);
  });

  it('parsea número sin unidad', () => {
    expect(parseDuracion('60')).toBe(60);
  });

  it('retorna null para null/undefined/vacío', () => {
    expect(parseDuracion(null)).toBeNull();
    expect(parseDuracion(undefined)).toBeNull();
    expect(parseDuracion('')).toBeNull();
  });
});

describe('estimateDuration', () => {
  it('Fadiman: totalDoses * 3', () => {
    expect(estimateDuration(9, 'fadiman')).toBe(27);
  });

  it('Stamets: ceil(totalDoses/4) * 7', () => {
    expect(estimateDuration(9, 'stamets')).toBe(21);
    expect(estimateDuration(8, 'stamets')).toBe(14);
  });

  it('every_x_days: totalDoses * days', () => {
    expect(estimateDuration(9, 'every_x_days', { days: 5 })).toBe(45);
  });

  it('custom: ceil(totalDoses/on) * (on+off)', () => {
    expect(estimateDuration(9, 'custom', { on: 2, off: 3 })).toBe(25);
    expect(estimateDuration(9, 'custom', { on: 1, off: 2 })).toBe(27);
  });

  it('specific_days: ceil(totalDoses/daysPerWeek) * 7', () => {
    expect(estimateDuration(9, 'specific_days', { lunes: true, miercoles: true, viernes: true })).toBe(21);
  });

  it('intuitive retorna null', () => {
    expect(estimateDuration(9, 'intuitive')).toBeNull();
  });

  it('retorna null si totalDoses <= 0', () => {
    expect(estimateDuration(0, 'fadiman')).toBeNull();
    expect(estimateDuration(-1, 'fadiman')).toBeNull();
  });
});

describe('inferFrequencyFromDosesAndDuration', () => {
  it('infiere "cada 4 días" de 23 dosis / 90 días', () => {
    expect(inferFrequencyFromDosesAndDuration(23, 90))
      .toEqual({ frequency: 'every_x_days', everyXDays: 4 });
  });

  it('infiere "cada 3 días" de 30 dosis / 90 días', () => {
    expect(inferFrequencyFromDosesAndDuration(30, 90))
      .toEqual({ frequency: 'every_x_days', everyXDays: 3 });
  });

  it('infiere "cada 5 días" de 12 dosis / 60 días', () => {
    expect(inferFrequencyFromDosesAndDuration(12, 60))
      .toEqual({ frequency: 'every_x_days', everyXDays: 5 });
  });

  it('infiere "cada 7 días" (semanal)', () => {
    expect(inferFrequencyFromDosesAndDuration(4, 28))
      .toEqual({ frequency: 'every_x_days', everyXDays: 7 });
  });

  it('retorna null si intervalo > 14', () => {
    expect(inferFrequencyFromDosesAndDuration(2, 90)).toBeNull();
  });

  it('retorna null si totalDoses es 0 o null', () => {
    expect(inferFrequencyFromDosesAndDuration(0, 90)).toBeNull();
    expect(inferFrequencyFromDosesAndDuration(null, 90)).toBeNull();
  });

  it('retorna null si durationDays es 0 o null', () => {
    expect(inferFrequencyFromDosesAndDuration(23, 0)).toBeNull();
    expect(inferFrequencyFromDosesAndDuration(23, null)).toBeNull();
  });

  it('retorna null si undefined', () => {
    expect(inferFrequencyFromDosesAndDuration(undefined, undefined)).toBeNull();
  });
});
