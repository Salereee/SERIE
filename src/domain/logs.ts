import type { ExerciseLog, Session, SetEntry } from '../db/schema';
import { epley } from './oneRm';

/** Series efectivas: completadas, no de calentamiento, con peso y reps válidos. */
export function workSets(sets: SetEntry[]): { w: number; r: number }[] {
  return sets
    .filter((s) => s.done && !s.isWarmup && s.reps != null && s.reps > 0 && s.weightKg != null && s.weightKg >= 0)
    .map((s) => ({ w: s.weightKg as number, r: s.reps as number }));
}

export function setsVolume(sets: { w: number; r: number }[]): number {
  return sets.reduce((acc, s) => acc + s.w * s.r, 0);
}

/** Un ExerciseLog por ejercicio con al menos una serie efectiva. Si un ejercicio aparece dos veces, se combinan. */
export function buildLogs(session: Session): ExerciseLog[] {
  const byExercise = new Map<string, ExerciseLog>();
  // Siempre la fecha de INICIO: una sesión de 23:30 a 00:40 cuenta para el día en que empezó
  // (igual que el calendario), no se reparte ni se duplica entre dos días.
  const date = session.startedAt;
  for (const ex of session.exercises) {
    const ws = workSets(ex.sets);
    if (ws.length === 0) continue;
    const prev = byExercise.get(ex.exerciseId);
    const all = prev ? [...prev.workSets, ...ws] : ws;
    byExercise.set(ex.exerciseId, {
      id: `${session.id}:${ex.exerciseId}`,
      exerciseId: ex.exerciseId,
      sessionId: session.id,
      date,
      topWeightKg: Math.max(...all.map((s) => s.w)),
      best1RM: Math.max(...all.map((s) => epley(s.w, s.r))),
      volumeKg: setsVolume(all),
      totalReps: all.reduce((a, s) => a + s.r, 0),
      workSets: all,
      repMin: prev?.repMin ?? ex.repMin,
      repMax: prev?.repMax ?? ex.repMax,
      targetSets: prev?.targetSets ?? ex.targetSets,
      isDemo: session.isDemo,
    });
  }
  return [...byExercise.values()];
}
