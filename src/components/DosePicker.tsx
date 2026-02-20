import React, { useMemo } from 'react';
import { DOSE_OPTIONS } from '../utils/doseOptions';
import styles from './DosePicker.module.css';
import type { DoseOption } from '../types';

interface Props {
  selectedDose: number;
  onSelect: (value: number) => void;
  compact?: boolean;
  recommendedDose?: number | null;
  extraOptions?: DoseOption[];
}

const DosePicker: React.FC<Props> = ({ selectedDose, onSelect, compact = false, recommendedDose, extraOptions }) => {
  const allOptions = useMemo(() => {
    if (!extraOptions?.length) return DOSE_OPTIONS;
    const merged = [...DOSE_OPTIONS];
    for (const extra of extraOptions) {
      if (!merged.some(o => o.value === extra.value)) {
        merged.push(extra);
      }
    }
    return merged.sort((a, b) => a.value - b.value);
  }, [extraOptions]);

  return (
    <div className={compact ? styles.compactGrid : styles.grid}>
      {allOptions.map(option => {
        const isActive = selectedDose === option.value;
        const isRecommended = recommendedDose != null && option.value === recommendedDose && !isActive;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.doseButton} ${isActive ? styles.active : ''} ${isRecommended ? styles.recommended : ''}`}
            onClick={() => onSelect(option.value)}
          >
            <span className={styles.doseLabel}>{option.label}</span>
            <span className={styles.doseSublabel}>{option.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DosePicker;
