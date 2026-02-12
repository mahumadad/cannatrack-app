/**
 * Format a number as Chilean Pesos (CLP).
 * @example formatCLP(15000) → "$15.000"
 */
export const formatCLP = (n: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
