import type { ExerciseLog, Region, Unit } from '../db/schema';
import { fmtWeight, fromDisplay, roundTo, toDisplay } from './units';

export type SuggestionKind = 'subir' | 'reps' | 'mantener' | 'deload';

export interface Suggestion {
  kind: SuggestionKind;
  weightKg: number;
  reps: number;
  /** Una línea: por qué se sugiere. */
  reason: string;
}

export interface ProgressionInput {
  /** Logs del ejercicio, el más reciente primero. */
  logs: ExerciseLog[];
  region: Region;
  repMin?: number;
  repMax?: number;
  targetSets?: number;
  incrementUpperKg: number;
  incrementLowerKg: number;
  unit: Unit;
}

const DEFAULT_RANGE = { repMin: 8, repMax: 12 };

function trend(logs: ExerciseLog[]): 'deload' | 'mantener' | null {
  if (logs.length < 3) return null;
  const [a, b, c] = logs.map((l) => l.best1RM);
  // Tres sesiones bajando de forma sostenida (≥3 % en total).
  if (a < b && b < c && a <= c * 0.97) return 'deload';
  // Dos sesiones seguidas claramente por debajo de la anterior a ellas.
  if (a < c * 0.98 && b < c * 0.98) return 'mantener';
  return null;
}

/**
 * Doble progresión: primero reps hasta el tope del rango en todas las series; luego sube peso.
 * Detecta caídas sostenidas y sugiere mantener o descargar. Nunca modifica nada: solo sugiere.
 */
export function suggest(input: ProgressionInput): Suggestion | null {
  const last = input.logs[0];
  if (!last || last.workSets.length === 0) return null;
  const repMin = input.repMin ?? last.repMin ?? DEFAULT_RANGE.repMin;
  const repMax = input.repMax ?? last.repMax ?? DEFAULT_RANGE.repMax;
  const inc = input.region === 'inferior' ? input.incrementLowerKg : input.incrementUpperKg;
  const u = input.unit;
  const w = last.topWeightKg;
  const atTop = last.workSets.filter((s) => s.w === w);
  const needed = Math.max(1, Math.min(input.targetSets ?? atTop.length, 99));
  const range = `${repMin}–${repMax}`;
  const wTxt = `${fmtWeight(w, u)} ${u}`;

  const t = trend(input.logs);
  if (t === 'deload') {
    const step = toDisplay(inc, u);
    const dw = fromDisplay(roundTo(toDisplay(w * 0.9, u), step), u);
    return {
      kind: 'deload',
      weightKg: dw,
      reps: repMin,
      reason: `Tu 1RM estimado bajó 3 sesiones seguidas: baja ~10 % a ${fmtWeight(dw, u)} ${u} y reconstruye.`,
    };
  }
  if (t === 'mantener') {
    return {
      kind: 'mantener',
      weightKg: w,
      reps: repMin,
      reason: `Rendiste por debajo de lo normal 2 sesiones seguidas: mantén ${wTxt} y cuida descanso y técnica.`,
    };
  }

  const allTop = atTop.length >= needed && atTop.every((s) => s.r >= repMax);
  if (allTop) {
    const nw = w + inc;
    return {
      kind: 'subir',
      weightKg: nw,
      reps: repMin,
      reason:
        w === 0
          ? `Hiciste ${atTop.length}×${repMax}, tope del rango ${range}: agrega lastre o pasa a una variante más difícil.`
          : `Completaste ${atTop.length}×${repMax} con ${wTxt}, el tope del rango ${range}: sube a ${fmtWeight(nw, u)} ${u}.`,
    };
  }

  const minReps = Math.min(...atTop.map((s) => s.r));
  const goal = Math.min(repMax, Math.max(repMin, minReps + 1));
  const missing = atTop.length < needed;
  return {
    kind: 'reps',
    weightKg: w,
    reps: goal,
    reason: missing
      ? `Solo hiciste ${atTop.length} de ${needed} series con ${wTxt}: complétalas antes de subir peso.`
      : `Aún no llegas a ${repMax} reps en todas las series con ${wTxt}: busca ${goal} en cada una.`,
  };
}
