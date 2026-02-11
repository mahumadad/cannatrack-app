import React, { useState } from 'react';
import type { FieldLabelsMap } from '../types';
import styles from './Dashboard.module.css';

interface Props {
  fieldKey: string;
  value: number;
  fieldLabels: FieldLabelsMap;
}

const MiniGauge: React.FC<Props> = ({ fieldKey, value, fieldLabels }) => {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const info = fieldLabels[fieldKey];
  const size: number = 56, radius: number = 22, circumference: number = 2 * Math.PI * radius;
  const progress: number = (value / 10) * circumference, offset: number = circumference - progress;
  const isHovered: boolean = hoveredStat === fieldKey;

  return (
    <div
      className={styles.miniGaugeItem}
      onMouseEnter={() => setHoveredStat(fieldKey)}
      onMouseLeave={() => setHoveredStat(null)}
    >
      <div className={styles.miniGaugeCircle}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E8C9A1" strokeWidth="4" />
          <circle
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={info.color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        </svg>
        <span className={styles.miniGaugeEmoji}>{info.emoji}</span>
      </div>
      {isHovered && (
        <div className={styles.miniGaugeTooltip}>
          <strong>{info.label}</strong><br />{value} / 10
        </div>
      )}
    </div>
  );
};

export default MiniGauge;
