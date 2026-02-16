import { describe, it, expect } from 'vitest';
import { calcWellbeing, calcWellbeingPercent, POSITIVE_FIELDS, NEGATIVE_FIELDS } from './wellbeing';

describe('calcWellbeing', () => {
  it('calcula con todos en 5 (neutral) → 5', () => {
    const data: Record<string, number> = {
      mood: 5, energy: 5, sleep: 5, focus: 5,
      sociability: 5, functionality: 5, productivity: 5, connection: 5,
      anxiety: 5, rumination: 5
    };
    expect(calcWellbeing(data)).toBe(5);
  });

  it('calcula con valores mixtos', () => {
    const data = {
      mood: 8, energy: 6, sleep: 7, focus: 5,
      sociability: 9, functionality: 4, productivity: 3, connection: 8,
      anxiety: 2, rumination: 3
    };
    // pos: 8+6+7+5+9+4+3+8 = 50
    // neg: (10-2)+(10-3) = 15
    // total: 65 / 10 = 6.5
    expect(calcWellbeing(data)).toBe(6.5);
  });

  it('usa 5 por defecto para campos faltantes', () => {
    const data = {};
    // 8 positivas: parseFloat("undefined") || 5 = 5 cada una = 40
    // 2 negativas: 10 - 5 = 5 cada una = 10
    // (40+10)/10 = 5
    expect(calcWellbeing(data)).toBe(5);
  });

  it('parsea strings numéricos', () => {
    const data = { mood: '8', energy: '6', sleep: '7', focus: '5',
      sociability: '9', functionality: '4', productivity: '3', connection: '8',
      anxiety: '2', rumination: '3' };
    expect(calcWellbeing(data)).toBe(6.5);
  });

  it('retorna número entre 0 y 10', () => {
    const data = { mood: 1, energy: 10, sleep: 3, focus: 7,
      sociability: 5, functionality: 8, productivity: 2, connection: 9,
      anxiety: 6, rumination: 4 };
    const result = calcWellbeing(data);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(10);
  });

  it('0 en campos positivos coerce a 5 (falsy fallback)', () => {
    const data = { mood: 0, energy: 10, sleep: 10, focus: 10,
      sociability: 10, functionality: 10, productivity: 10, connection: 10,
      anxiety: 1, rumination: 1 };
    // mood: parseFloat("0") = 0 || 5 = 5 (0 is falsy)
    // rest positivas: 7×10 = 70, total pos = 75
    // neg: (10-1)+(10-1) = 18
    // (75+18)/10 = 9.3
    expect(calcWellbeing(data)).toBe(9.3);
  });
});

describe('calcWellbeingPercent', () => {
  it('multiplica wellbeing por 10 y redondea', () => {
    const data = { mood: 5, energy: 5, sleep: 5, focus: 5,
      sociability: 5, functionality: 5, productivity: 5, connection: 5,
      anxiety: 5, rumination: 5 };
    expect(calcWellbeingPercent(data)).toBe(50);
  });

  it('retorna 65 para wellbeing 6.5', () => {
    const data = { mood: 8, energy: 6, sleep: 7, focus: 5,
      sociability: 9, functionality: 4, productivity: 3, connection: 8,
      anxiety: 2, rumination: 3 };
    expect(calcWellbeingPercent(data)).toBe(65);
  });

  it('retorna valor entre 0 y 100', () => {
    const data = { mood: 3, energy: 7, sleep: 9, focus: 1,
      sociability: 5, functionality: 8, productivity: 2, connection: 6,
      anxiety: 4, rumination: 7 };
    const result = calcWellbeingPercent(data);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('POSITIVE_FIELDS & NEGATIVE_FIELDS', () => {
  it('POSITIVE_FIELDS tiene 8 campos', () => {
    expect(POSITIVE_FIELDS).toHaveLength(8);
    expect(POSITIVE_FIELDS).toContain('mood');
    expect(POSITIVE_FIELDS).toContain('connection');
  });

  it('NEGATIVE_FIELDS tiene 2 campos', () => {
    expect(NEGATIVE_FIELDS).toHaveLength(2);
    expect(NEGATIVE_FIELDS).toContain('anxiety');
    expect(NEGATIVE_FIELDS).toContain('rumination');
  });

  it('no hay overlap entre positivos y negativos', () => {
    const overlap = POSITIVE_FIELDS.filter(f => NEGATIVE_FIELDS.includes(f));
    expect(overlap).toHaveLength(0);
  });
});
