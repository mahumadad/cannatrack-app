import React from 'react';

interface EmptyStateProps {
  size?: number;
}

/**
 * Lightweight SVG empty state illustrations using theme colors.
 * Each one is ~20 lines of inline SVG — no external assets needed.
 */

export const EmptyCalendar: React.FC<EmptyStateProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="30" width="80" height="70" rx="12" fill="#FFF8F0" stroke="#E8C9A1" strokeWidth="2" />
    <rect x="20" y="30" width="80" height="20" rx="12" fill="#D4A574" />
    <rect x="20" y="42" width="80" height="8" fill="#D4A574" />
    <circle cx="40" cy="40" r="3" fill="white" />
    <circle cx="80" cy="40" r="3" fill="white" />
    <rect x="34" y="60" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.5" />
    <rect x="53" y="60" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.5" />
    <rect x="72" y="60" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.5" />
    <rect x="34" y="76" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.3" />
    <rect x="53" y="76" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.3" />
    <rect x="72" y="76" width="14" height="10" rx="3" fill="#E8C9A1" opacity="0.3" />
    <line x1="60" y1="55" x2="60" y2="95" stroke="#D4A574" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.3" />
  </svg>
);

export const EmptyNotebook: React.FC<EmptyStateProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="15" width="60" height="90" rx="8" fill="#FFF8F0" stroke="#E8C9A1" strokeWidth="2" />
    <line x1="42" y1="15" x2="42" y2="105" stroke="#E8C9A1" strokeWidth="1" />
    <rect x="50" y="35" width="30" height="3" rx="1.5" fill="#D4A574" opacity="0.4" />
    <rect x="50" y="44" width="24" height="3" rx="1.5" fill="#E8C9A1" opacity="0.4" />
    <rect x="50" y="53" width="28" height="3" rx="1.5" fill="#E8C9A1" opacity="0.3" />
    <rect x="50" y="62" width="20" height="3" rx="1.5" fill="#E8C9A1" opacity="0.2" />
    <circle cx="82" cy="90" r="16" fill="#D4A574" opacity="0.15" />
    <text x="82" y="95" textAnchor="middle" fontSize="16">✨</text>
  </svg>
);

export const EmptyChart: React.FC<EmptyStateProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="90" width="14" height="5" rx="2" fill="#E8C9A1" opacity="0.3" />
    <rect x="44" y="80" width="14" height="15" rx="2" fill="#E8C9A1" opacity="0.4" />
    <rect x="63" y="65" width="14" height="30" rx="2" fill="#D4A574" opacity="0.4" />
    <rect x="82" y="50" width="14" height="45" rx="2" fill="#D4A574" opacity="0.5" />
    <line x1="20" y1="95" x2="100" y2="95" stroke="#E8C9A1" strokeWidth="1.5" />
    <line x1="20" y1="20" x2="20" y2="95" stroke="#E8C9A1" strokeWidth="1.5" />
    <path d="M25 75 Q 44 60, 50 65 Q 63 40, 70 50 Q 82 25, 96 30" stroke="#D4A574" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="4 4" opacity="0.5" />
    <circle cx="70" cy="35" r="12" fill="#D4A574" opacity="0.1" />
    <text x="70" y="40" textAnchor="middle" fontSize="14">📊</text>
  </svg>
);

export const EmptyInbox: React.FC<EmptyStateProps> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M25 50 L60 30 L95 50 V90 H25 V50Z" fill="#FFF8F0" stroke="#E8C9A1" strokeWidth="2" strokeLinejoin="round" />
    <path d="M25 50 L60 70 L95 50" stroke="#D4A574" strokeWidth="2" strokeLinejoin="round" fill="none" />
    <line x1="25" y1="90" x2="50" y2="68" stroke="#E8C9A1" strokeWidth="1" opacity="0.4" />
    <line x1="95" y1="90" x2="70" y2="68" stroke="#E8C9A1" strokeWidth="1" opacity="0.4" />
    <circle cx="60" cy="55" r="8" fill="#D4A574" opacity="0.15" />
    <rect x="56" y="52" width="8" height="6" rx="1" fill="#E8C9A1" opacity="0.5" />
  </svg>
);
