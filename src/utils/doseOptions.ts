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
