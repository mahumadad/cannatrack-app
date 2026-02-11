// DASS-21 (Depression Anxiety Stress Scale)
export const dassQuestions: string[] = [
  'Me costó relajarme', 'Sentí sequedad en la boca', 'No podía sentir cosas positivas',
  'Tuve dificultad para respirar', 'Me costó tomar iniciativa', 'Reaccioné exageradamente',
  'Sentí temblores', 'Estuve muy nervioso/a', 'Me preocupé por situaciones de pánico',
  'Sentí que no tenía nada que esperar', 'Me sentí agitado/a', 'Me fue difícil relajarme',
  'Me sentí desanimado/a y triste', 'No toleré interrupciones', 'Sentí que iba a entrar en pánico',
  'No me pude entusiasmar', 'Sentí que no valía mucho', 'Estuve muy irritable',
  'Sentí latidos sin esfuerzo físico', 'Tuve miedo sin razón', 'Sentí que la vida no tenía sentido'
];

// PANAS (Positive and Negative Affect Schedule)
export const panasPositive = [
  { key: 'panas_1', label: 'Interesado/a' }, { key: 'panas_3', label: 'Entusiasmado/a' },
  { key: 'panas_5', label: 'Fuerte' }, { key: 'panas_9', label: 'Inspirado/a' },
  { key: 'panas_10', label: 'Activo/a' }, { key: 'panas_12', label: 'Orgulloso/a' },
  { key: 'panas_14', label: 'Atento/a' }, { key: 'panas_16', label: 'Decidido/a' },
  { key: 'panas_17', label: 'Animado/a' }, { key: 'panas_19', label: 'Despierto/a' }
] as const;

export const panasNegative = [
  { key: 'panas_2', label: 'Angustiado/a' }, { key: 'panas_4', label: 'Molesto/a' },
  { key: 'panas_6', label: 'Culpable' }, { key: 'panas_7', label: 'Asustado/a' },
  { key: 'panas_8', label: 'Hostil' }, { key: 'panas_11', label: 'Irritable' },
  { key: 'panas_13', label: 'Avergonzado/a' }, { key: 'panas_15', label: 'Nervioso/a' },
  { key: 'panas_18', label: 'Intranquilo/a' }, { key: 'panas_20', label: 'Temeroso/a' }
] as const;

// PSS-10 (Perceived Stress Scale)
export const pssQuestions = [
  { key: 'pss_1', label: 'No pude controlar las cosas importantes' },
  { key: 'pss_2', label: 'Me sentí capaz de manejar mis problemas' },
  { key: 'pss_3', label: 'Sentí que las cosas me iban bien' },
  { key: 'pss_4', label: 'Sentí que las dificultades se acumulaban' },
  { key: 'pss_5', label: 'Sentí que no podía afrontar todo' },
  { key: 'pss_6', label: 'Pude controlar las irritaciones' },
  { key: 'pss_7', label: 'Sentí que tenía el control' },
  { key: 'pss_8', label: 'Me enojé por cosas fuera de mi control' },
  { key: 'pss_9', label: 'Pensé en lo que me quedaba por hacer' },
  { key: 'pss_10', label: 'Sentí que estaba encima de las cosas' }
] as const;
