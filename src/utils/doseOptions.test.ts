import { describe, it, expect } from 'vitest';
import { DOSE_OPTIONS, INTERNAL_SUBSTANCE, DOSE_UNIT } from './doseOptions';

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
