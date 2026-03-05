import { useState } from 'react';

type Step = 'micro' | 'macro' | 'recetas' | 'resumen';
const ALL_STEPS: Step[] = ['micro', 'macro', 'recetas', 'resumen'];

export const STEP_COLORS: Record<Step, { color: string; light: string; label: string }> = {
  micro:   { color: '#14b858', light: '#f0fdf4', label: 'Selección Microdosis' },
  macro:   { color: '#5048e5', light: '#f0efff', label: 'Selección Macrodosis' },
  recetas: { color: '#5048e5', light: '#f0efff', label: 'Adjuntar Receta' },
  resumen: { color: '#a57f50', light: '#fbfaf9', label: 'Finalizar' },
};

export interface UseSolicitudStepsReturn {
  step: Step;
  setStep: (s: Step) => void;
  steps: Step[];
  stepIndex: number;
  stepProgress: string;
  stepTheme: { color: string; light: string; label: string };
  canGoNext: () => boolean;
  goNext: () => void;
  goBack: () => void;
}

export function useSolicitudSteps(
  skipRecetas: boolean,
  loadingRecetas: boolean,
  hasMicro: boolean,
  hasMacro: boolean,
  recetaMicro: any,
  recetaMacro: any,
  recipeFile: string | null,
  onBackFromFirst: () => void
): UseSolicitudStepsReturn {
  const [step, setStep] = useState<Step>('micro');

  const steps: Step[] = skipRecetas
    ? ALL_STEPS.filter(s => s !== 'recetas')
    : ALL_STEPS;

  const stepIndex = steps.indexOf(step);
  const stepProgress = `${Math.round(((stepIndex + 1) / steps.length) * 100)}%`;
  const stepTheme = STEP_COLORS[step];

  const canGoNext = () => {
    if (step === 'recetas') {
      if (loadingRecetas) return false;
      const needsReceta = (hasMicro && !recetaMicro) || (hasMacro && !recetaMacro);
      if (needsReceta && !recipeFile) return false;
      return true;
    }
    return true;
  };

  const goNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else onBackFromFirst();
  };

  return { step, setStep, steps, stepIndex, stepProgress, stepTheme, canGoNext, goNext, goBack };
}
