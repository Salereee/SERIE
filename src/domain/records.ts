import type { ExerciseLog, PRHit, PRKind, Session } from '../db/schema';
import { setsVolume, workSets } from './logs';
import { epley } from './oneRm';

export interface Records {
  bestWeight: number;
  bestWeightDate?: number;
  best1RM: number;
  best1RMDate?: number;
  bestVolume: number;
  bestVolumeDate?: number;
  /** Peso (kg) → máximo de reps logradas con ese peso. */
  repsByWeight: Map<number, number>;
  sessions: number;
}

export function emptyRecords(): Records {
  return { bestWeight: 0, best1RM: 0, bestVolume: 0, repsByWeight: new Map(), sessions: 0 };
}

const key = (w: number) => Math.round(w * 1000) / 1000;

export function computeRecords(logs: ExerciseLog[]): Records {
  const r = emptyRecords();
  for (const l of logs) {
    r.sessions++;
    if (l.topWeightKg > r.bestWeight) {
      r.bestWeight = l.topWeightKg;
      r.bestWeightDate = l.date;
    }
    if (l.best1RM > r.best1RM) {
      r.best1RM = l.best1RM;
      r.best1RMDate = l.date;
    }
    if (l.volumeKg > r.bestVolume) {
      r.bestVolume = l.volumeKg;
      r.bestVolumeDate = l.date;
    }
    for (const s of l.workSets) {
      const k = key(s.w);
      r.repsByWeight.set(k, Math.max(r.repsByWeight.get(k) ?? 0, s.r));
    }
  }
  return r;
}

/** Suma series de la sesión en curso al récord, para comparar la siguiente serie contra todo lo anterior. */
export function withSets(base: Records, sets: { w: number; r: number }[]): Records {
  const r: Records = { ...base, repsByWeight: new Map(base.repsByWeight) };
  for (const s of sets) {
    r.bestWeight = Math.max(r.bestWeight, s.w);
    r.best1RM = Math.max(r.best1RM, epley(s.w, s.r));
    const k = key(s.w);
    r.repsByWeight.set(k, Math.max(r.repsByWeight.get(k) ?? 0, s.r));
  }
  return r;
}

/**
 * PRs que rompe una serie frente al historial más las series previas de esta sesión.
 * Sin historial no se marca nada: la primera vez que haces un ejercicio no es un récord útil.
 */
export function setPRs(history: Records, earlierSets: { w: number; r: number }[], set: { w: number; r: number }): PRKind[] {
  if (history.sessions === 0 || !(set.r > 0)) return [];
  const ref = withSets(history, earlierSets);
  const out: PRKind[] = [];
  if (set.w > ref.bestWeight && set.w > 0) out.push('peso');
  if (epley(set.w, set.r) > ref.best1RM + 1e-9) out.push('1rm');
  const prevReps = ref.repsByWeight.get(key(set.w));
  if (prevReps != null && set.r > prevReps) out.push('reps');
  return out;
}

/** PRs finales de una sesión, uno por tipo y ejercicio. */
export function sessionPRs(session: Session, historyByExercise: Map<string, Records>): PRHit[] {
  const hits: PRHit[] = [];
  const grouped = new Map<string, { w: number; r: number }[]>();
  for (const ex of session.exercises) {
    grouped.set(ex.exerciseId, [...(grouped.get(ex.exerciseId) ?? []), ...workSets(ex.sets)]);
  }
  for (const [exerciseId, ws] of grouped) {
    const h = historyByExercise.get(exerciseId);
    if (!h || h.sessions === 0 || ws.length === 0) continue;
    const top = Math.max(...ws.map((s) => s.w));
    if (top > h.bestWeight && top > 0) hits.push({ exerciseId, kind: 'peso', value: top, previous: h.bestWeight });
    const orm = Math.max(...ws.map((s) => epley(s.w, s.r)));
    if (orm > h.best1RM + 1e-9) hits.push({ exerciseId, kind: '1rm', value: orm, previous: h.best1RM });
    const vol = setsVolume(ws);
    if (vol > h.bestVolume && vol > 0) hits.push({ exerciseId, kind: 'volumen', value: vol, previous: h.bestVolume });
    // Reps: el avance con el peso más alto que ya se había usado antes.
    let bestRep: PRHit | null = null;
    for (const s of ws) {
      const prev = h.repsByWeight.get(key(s.w));
      if (prev != null && s.r > prev && (!bestRep || s.w > (bestRep.atWeightKg ?? 0))) {
        bestRep = { exerciseId, kind: 'reps', value: s.r, atWeightKg: s.w, previous: prev };
      }
    }
    if (bestRep) hits.push(bestRep);
  }
  return hits;
}

export const PR_LABEL: Record<PRKind, string> = {
  peso: 'Peso máximo',
  '1rm': '1RM estimado',
  volumen: 'Volumen',
  reps: 'Reps',
};

/** En modo básico el 1RM estimado se nombra por lo que es: tu mejor serie combinando peso y reps. */
export const prLabel = (kind: PRKind, advanced: boolean) => (kind === '1rm' && !advanced ? 'Mejor serie' : PR_LABEL[kind]);
