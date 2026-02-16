import { describe, it, expect } from 'vitest';
import { toLocalDateString, padZero, normalizeDate } from './dateHelpers';

// ─── toLocalDateString ─────────────────────────────────────────
describe('toLocalDateString', () => {
  it('formatea fecha como YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    expect(toLocalDateString(date)).toBe('2024-01-15');
  });

  it('padea meses y días con cero', () => {
    const date = new Date(2024, 2, 5); // Mar 5, 2024
    expect(toLocalDateString(date)).toBe('2024-03-05');
  });

  it('maneja diciembre (mes 12)', () => {
    const date = new Date(2024, 11, 31); // Dec 31, 2024
    expect(toLocalDateString(date)).toBe('2024-12-31');
  });

  it('maneja enero (mes 1)', () => {
    const date = new Date(2024, 0, 1); // Jan 1, 2024
    expect(toLocalDateString(date)).toBe('2024-01-01');
  });

  it('usa fecha actual si no se pasa argumento', () => {
    const result = toLocalDateString();
    // Debe ser formato YYYY-MM-DD
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('retorna fecha local, no UTC', () => {
    // Para una fecha a las 23:30 local, toISOString podría dar el día siguiente en UTC
    // pero toLocalDateString siempre da el día local
    const date = new Date(2024, 5, 15, 23, 30); // Jun 15, 23:30 local
    expect(toLocalDateString(date)).toBe('2024-06-15');
  });
});

// ─── padZero ───────────────────────────────────────────────────
describe('padZero', () => {
  it('agrega cero a dígito simple', () => {
    expect(padZero(5)).toBe('05');
  });

  it('no agrega cero a dos dígitos', () => {
    expect(padZero(12)).toBe('12');
  });

  it('maneja cero', () => {
    expect(padZero(0)).toBe('00');
  });

  it('maneja 9', () => {
    expect(padZero(9)).toBe('09');
  });

  it('maneja 10', () => {
    expect(padZero(10)).toBe('10');
  });
});

// ─── normalizeDate ─────────────────────────────────────────────
describe('normalizeDate', () => {
  it('extrae fecha de ISO con T', () => {
    expect(normalizeDate('2024-01-15T12:00:00.000Z')).toBe('2024-01-15');
  });

  it('preserva fecha sin T', () => {
    expect(normalizeDate('2024-01-15')).toBe('2024-01-15');
  });

  it('maneja ISO con timezone', () => {
    expect(normalizeDate('2024-06-30T23:59:59+03:00')).toBe('2024-06-30');
  });

  it('preserva string sin T tal cual', () => {
    expect(normalizeDate('2024-12-25')).toBe('2024-12-25');
  });
});
