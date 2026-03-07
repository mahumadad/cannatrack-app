/**
 * Format a number as Chilean Pesos (CLP).
 * @example formatCLP(15000) → "$15.000"
 */
export const formatCLP = (n: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

/** Format a date string as "dd/mm/yyyy" */
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-CL');
};

/**
 * Decode common HTML entities in a string.
 * @example decodeHtml("Café &amp; Té") → "Café & Té"
 */
export const decodeHtml = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Format a date string as "15 de enero de 2025" */
export const formatDateLong = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};
