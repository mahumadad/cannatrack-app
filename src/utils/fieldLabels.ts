export interface FieldLabel {
  label: string;
  emoji: string;
  color: string;
  low: string;
  high: string;
}

export type FieldKey = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'focus' | 'sociability' | 'rumination' | 'functionality' | 'productivity' | 'connection';

// Fuente unica de verdad para los 10 campos de check-in
// Colores basados en Dashboard (los mas consistentes), labels con acentos correctos
const fieldLabels: Record<string, FieldLabel> = {
  mood:          { label: 'Ánimo',         emoji: '😊', color: '#4CAF50', low: 'Muy bajo',          high: 'Excelente' },
  anxiety:       { label: 'Ansiedad',      emoji: '😰', color: '#FF7043', low: 'Sin ansiedad',      high: 'Muy ansioso' },
  energy:        { label: 'Energía',       emoji: '⚡', color: '#FFC107', low: 'Sin energía',       high: 'Muy energético' },
  sleep:         { label: 'Sueño',         emoji: '😴', color: '#9C27B0', low: 'Muy mal',           high: 'Excelente' },
  focus:         { label: 'Enfoque',       emoji: '🎯', color: '#2196F3', low: 'Muy disperso',      high: 'Muy enfocado' },
  sociability:   { label: 'Sociabilidad',  emoji: '👥', color: '#00BCD4', low: 'Muy retraído',      high: 'Muy sociable' },
  rumination:    { label: 'Rumiación',     emoji: '🌀', color: '#E91E63', low: 'Mente clara',       high: 'Muchos pensamientos' },
  functionality: { label: 'Funcionalidad', emoji: '✅', color: '#8BC34A', low: 'No funcional',      high: 'Muy funcional' },
  productivity:  { label: 'Productividad', emoji: '📈', color: '#FF9800', low: 'Nada productivo',   high: 'Muy productivo' },
  connection:    { label: 'Conexión',      emoji: '❤️', color: '#F44336', low: 'Desconectado',      high: 'Muy conectado' }
};

export const FIELD_KEYS: FieldKey[] = Object.keys(fieldLabels) as FieldKey[];

export default fieldLabels;
