const POSITIVE_FIELDS: string[] = ['mood', 'energy', 'sleep', 'focus', 'sociability', 'functionality', 'productivity', 'connection'];
const NEGATIVE_FIELDS: string[] = ['anxiety', 'rumination'];

export const calcWellbeing = (data: Record<string, string | number | undefined>): number => {
  let score: number = 0;
  POSITIVE_FIELDS.forEach(f => score += (parseFloat(String(data[f])) || 5));
  NEGATIVE_FIELDS.forEach(f => score += (10 - (parseFloat(String(data[f])) || 5)));
  return score / (POSITIVE_FIELDS.length + NEGATIVE_FIELDS.length);
};

export const calcWellbeingPercent = (data: Record<string, string | number | undefined>): number => {
  return Math.round(calcWellbeing(data) * 10);
};

export { POSITIVE_FIELDS, NEGATIVE_FIELDS };
