import type { Questionnaire } from '../db/schema';
import { TEMPLATES, type TemplateKey } from '../db/seed/programs';

export interface Recommendation {
  key: TemplateKey;
  reason: string;
}

export interface RecommendationResult {
  best: Recommendation;
  alternatives: Recommendation[];
}

const whyAlt: Record<TemplateKey, (q: Questionnaire) => string> = {
  fullbody: () => 'Cada músculo 3 veces por semana con poco volumen por sesión. Aguanta bien si a veces faltas.',
  'upper-lower': () => 'Frecuencia 2 por músculo con sesiones más cortas que un Full Body.',
  ppl: (q) =>
    q.daysPerWeek >= 6
      ? 'Cada músculo dos veces por semana con volumen alto.'
      : 'Rota empuje, tirón y pierna en orden aunque entrenes menos de 6 días.',
  phul: () => 'Combina días pesados de fuerza con días de volumen para hipertrofia.',
  arnold: () => 'Más volumen de torso; exige buena recuperación.',
  bro: () => 'Un grupo por día con mucho volumen, pero cada músculo solo una vez por semana.',
};

/** Reglas simples y explicables: días disponibles primero, luego experiencia y objetivo. */
export function recommend(q: Questionnaire): RecommendationResult {
  const d = q.daysPerWeek;
  let best: Recommendation;

  if (d <= 3) {
    best = {
      key: 'fullbody',
      reason:
        q.experience === 'principiante'
          ? `Con ${d} días y poca experiencia, practicar los básicos ${d === 2 ? 'dos' : 'tres'} veces por semana es lo que más rápido te hace progresar.`
          : `Con ${d} días, un Full Body es la forma de trabajar cada músculo más de una vez por semana.`,
    };
  } else if (d === 4) {
    best =
      q.experience !== 'principiante' && q.goal === 'fuerza'
        ? { key: 'phul', reason: 'Con 4 días y objetivo de fuerza, PHUL te da dos días pesados sin perder volumen.' }
        : { key: 'upper-lower', reason: 'Con 4 días, alternar torso y pierna entrena cada músculo dos veces por semana con buena recuperación.' };
  } else if (q.experience === 'principiante') {
    best = {
      key: 'upper-lower',
      reason: `Siendo principiante, ${d} días no aceleran el progreso: Torso/Pierna en rotación te da frecuencia 2 y tiempo para recuperarte.`,
    };
  } else if (d === 5) {
    best = { key: 'ppl', reason: 'Con 5 días, PPL en rotación reparte bien el volumen y mantiene una frecuencia cercana a 2.' };
  } else {
    best = { key: 'ppl', reason: 'Con 6 días, Push/Pull/Legs dos veces por semana es el estándar: frecuencia 2 y volumen alto.' };
  }

  const alternatives = TEMPLATES.filter((t) => t.key !== best.key && d >= t.daysRange[0] && d <= t.daysRange[1])
    // Sin equipo, el Bro Split se queda corto de ejercicios por día.
    .filter((t) => !(q.equipment === 'corporal' && t.key === 'bro'))
    .map((t) => ({ key: t.key, reason: whyAlt[t.key](q) }));

  return { best, alternatives };
}
