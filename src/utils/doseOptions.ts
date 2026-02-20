import type { DoseOption } from '../types';

export const DOSE_OPTIONS: DoseOption[] = [
  { value: 0.05, label: '0.05g', sublabel: '50mg' },
  { value: 0.1,  label: '0.1g',  sublabel: '100mg' },
  { value: 0.15, label: '0.15g', sublabel: '150mg' },
  { value: 0.2,  label: '0.2g',  sublabel: '200mg' },
  { value: 0.25, label: '0.25g', sublabel: '250mg' },
  { value: 0.3,  label: '0.3g',  sublabel: '300mg' },
  { value: 0.5,  label: '0.5g',  sublabel: '500mg' },
];

// Internal constant - never displayed in UI
export const INTERNAL_SUBSTANCE: string = 'Psilocybe Cubensis';

// All doses are stored in grams
export const DOSE_UNIT: string = 'g';

// ─── Receta parsing utilities ────────────────────────────────────

/**
 * Parse a gramaje string from receta into numeric grams.
 * Handles: "0.2g", "0.2 g", "200mg", "200 mg", "0.2", "200"
 */
export function parseGramaje(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();

  const mgMatch = t.match(/^(\d+(?:\.\d+)?)\s*mg$/);
  if (mgMatch) return parseFloat(mgMatch[1]) / 1000;

  const gMatch = t.match(/^(\d+(?:\.\d+)?)\s*g$/);
  if (gMatch) return parseFloat(gMatch[1]);

  const numMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    return val >= 1 ? val / 1000 : val;
  }

  return null;
}

/**
 * Map a receta protocolo string to a ProtocolFrequency key.
 */
export function parseProtocolo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();

  if (n.includes('fadiman')) return 'fadiman';
  if (n.includes('stamets')) return 'stamets';
  if (n.includes('intuitivo') || n.includes('libre')) return 'intuitive';

  // "4 on, 3 off" or "4 días on / 3 off"
  if (/\d+\s*(?:d[ií]as?\s+)?on\s*[,/]\s*\d+\s*(?:d[ií]as?\s+)?off/.test(n)) return 'custom';

  // "cada 3 días"
  if (/cada\s+\d+\s*d[ií]as?/.test(n)) return 'every_x_days';

  return null;
}

/**
 * Extract custom on/off pattern from receta protocolo string.
 */
export function extractCustomPattern(raw: string | null | undefined): { on: number; off: number } | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();
  const m = n.match(/(\d+)\s*(?:d[ií]as?\s+)?on\s*[,/]\s*(\d+)\s*(?:d[ií]as?\s+)?off/);
  return m ? { on: parseInt(m[1]), off: parseInt(m[2]) } : null;
}

/**
 * Extract "cada X días" interval from receta protocolo string.
 */
export function extractEveryXDays(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().toLowerCase().match(/cada\s+(\d+)\s*d[ií]as?/);
  return m ? parseInt(m[1]) : null;
}

/**
 * Parse duration string from receta to days.
 * Handles: "30 días", "2 meses", "4 semanas", bare number.
 */
export function parseDuracion(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();

  const meses = t.match(/(\d+)\s*mes(?:es)?/);
  if (meses) return parseInt(meses[1]) * 30;

  const semanas = t.match(/(\d+)\s*semanas?/);
  if (semanas) return parseInt(semanas[1]) * 7;

  const dias = t.match(/(\d+)\s*d[ií]as?/);
  if (dias) return parseInt(dias[1]);

  const num = t.match(/^(\d+)$/);
  if (num) return parseInt(num[1]);

  return null;
}

/**
 * Estimate protocol duration in days from total authorized doses and frequency.
 */
export function estimateDuration(
  totalDoses: number,
  frequency: string,
  frequencyValue?: { on?: number; off?: number; days?: number; [k: string]: unknown } | null
): number | null {
  if (!totalDoses || totalDoses <= 0) return null;

  switch (frequency) {
    case 'fadiman':
      return totalDoses * 3; // 1 on, 2 off
    case 'stamets':
      return Math.ceil(totalDoses / 4) * 7; // 4 on, 3 off
    case 'every_x_days': {
      const days = frequencyValue?.days;
      return typeof days === 'number' && days > 0 ? totalDoses * days : null;
    }
    case 'custom': {
      const on = frequencyValue?.on;
      const off = frequencyValue?.off;
      if (typeof on === 'number' && typeof off === 'number' && on > 0) {
        return Math.ceil(totalDoses / on) * (on + off);
      }
      return null;
    }
    case 'specific_days': {
      if (!frequencyValue) return null;
      const daysPerWeek = Object.values(frequencyValue).filter(v => v === true).length;
      return daysPerWeek > 0 ? Math.ceil(totalDoses / daysPerWeek) * 7 : null;
    }
    case 'intuitive':
      return null;
    default:
      return null;
  }
}
