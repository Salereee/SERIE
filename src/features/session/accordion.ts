import type { Session, SessionExercise, Unit } from '../../db/schema';
import { fmtClock } from '../../domain/format';
import { fmtWeight } from '../../domain/units';

export type ExerciseStatus = 'hecho' | 'actual' | 'pendiente';

export interface ExerciseRowState {
  open: boolean;
  status: ExerciseStatus;
  done: number;
  total: number;
  /** Resumen para el encabezado cerrado. */
  summary: string;
}

export function progressOf(e: SessionExercise) {
  const work = e.sets.filter((s) => !s.isWarmup);
  return { done: work.filter((s) => s.done).length, total: work.length };
}

/**
 * Estado del acordeón de la sesión: solo el ejercicio en foco está abierto (salvo que el usuario lo cierre);
 * los terminados muestran lo que se hizo y los pendientes su objetivo.
 */
export function accordionState(session: Session, unit: Unit, collapsed = false): ExerciseRowState[] {
  const focus = Math.min(session.focusIndex ?? 0, Math.max(0, session.exercises.length - 1));
  return session.exercises.map((e, i) => {
    const { done, total } = progressOf(e);
    const complete = total > 0 && done === total;
    const status: ExerciseStatus = i === focus ? 'actual' : complete ? 'hecho' : 'pendiente';
    const doneSets = e.sets.filter((s) => s.done && !s.isWarmup && s.weightKg != null && s.reps);
    let summary: string;
    if (doneSets.length) summary = doneSets.map((s) => `${fmtWeight(s.weightKg, unit)}×${s.reps}`).join(' · ');
    else if (e.targetSets) summary = `${e.targetSets} × ${e.repMin}–${e.repMax} · ${fmtClock(e.restSec)}`;
    else summary = `${total} ${total === 1 ? 'serie' : 'series'}`;
    return { open: i === focus && !collapsed, status, done, total, summary };
  });
}
