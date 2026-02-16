import { describe, it, expect } from 'vitest';
import { formatCLP } from './formatters';

describe('formatCLP', () => {
  it('formatea con símbolo $ y separador de miles', () => {
    const result = formatCLP(15000);
    expect(result).toContain('15.000');
    expect(result).toContain('$');
  });

  it('formatea cero', () => {
    const result = formatCLP(0);
    expect(result).toContain('0');
    expect(result).toContain('$');
  });

  it('formatea número grande', () => {
    const result = formatCLP(2500000);
    expect(result).toContain('2.500.000');
  });

  it('no muestra decimales', () => {
    const result = formatCLP(1234.56);
    expect(result).not.toContain(',56');
  });

  it('formatea número negativo', () => {
    const result = formatCLP(-10000);
    expect(result).toContain('10.000');
  });
});
