import React from 'react';
import { DOSE_OPTIONS } from '../utils/doseOptions';
import styles from './DosePicker.module.css';

interface Props {
  selectedDose: number;
  onSelect: (value: number) => void;
  compact?: boolean;
}

const DosePicker: React.FC<Props> = ({ selectedDose, onSelect, compact = false }) => {
  return (
    <div className={compact ? styles.compactGrid : styles.grid}>
      {DOSE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={`${styles.doseButton} ${selectedDose === option.value ? styles.active : ''}`}
          onClick={() => onSelect(option.value)}
        >
          <span className={styles.doseLabel}>{option.label}</span>
          <span className={styles.doseSublabel}>{option.sublabel}</span>
        </button>
      ))}
    </div>
  );
};

export default DosePicker;
