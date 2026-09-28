import { db } from '../../db/db';
import { getExerciseLogs } from '../../db/hooks';
import type { Program, Session, SessionExercise, SetEntry } from '../../db/schema';
import { uid } from '../../domain/ids';
import { buildLogs, setsVolume, workSets } from '../../domain/logs';
import { computeRecords, sessionPRs, type Records } from '../../domain/records';

/** Series prellenadas con lo que se hizo la última vez (peso × reps de cada serie). */
async function prefilledSets(exerciseId: string, count: number, repMin?: number): Promise<SetEntry[]> {
  const [last] = await getExerciseLogs(exerciseId, 1);
  const ws = last?.workSets ?? [];
  return Array.from({ length: count }, (_, i) => {
    const prev = ws[i] ?? ws[ws.length - 1];
    return {
      id: uid(),
      weightKg: prev ? prev.w : null,
      reps: prev ? prev.r : repMin ?? null,
      isWarmup: false,
      done: false,
    };
  });
}

export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('activa').first();
}

/** Crea la sesión. Si ya hay una en curso, la devuelve sin crear otra. */
export async function startSession(opts: { program?: Program; dayId?: string } = {}): Promise<Session> {
  const existing = await getActiveSession();
  if (existing) return existing;
  const day = opts.program?.days.find((d) => d.id === opts.dayId);
  const exercises: SessionExercise[] = [];
  for (const it of day?.items ?? []) {
    exercises.push({
      id: uid(),
      exerciseId: it.exerciseId,
      targetSets: it.targetSets,
      repMin: it.repMin,
      repMax: it.repMax,
      restSec: it.restSec,
      supersetGroup: it.supersetGroup,
      sets: await prefilledSets(it.exerciseId, it.targetSets, it.repMin),
    });
  }
  const session: Session = {
    id: uid(),
    programId: day ? opts.program!.id : undefined,
    dayId: day?.id,
    dayName: day?.name ?? 'Sesión libre',
    startedAt: Date.now(),
    status: 'activa',
    exercises,
    focusIndex: 0,
    restTimer: null,
  };
  await db.sessions.add(session);
  return session;
}

/** Lee, modifica y guarda la sesión en una transacción: cada cambio queda persistido al instante. */
export async function mutate(id: string, fn: (s: Session) => void): Promise<Session | undefined> {
  return db.transaction('rw', db.sessions, async () => {
    const s = await db.sessions.get(id);
    if (!s) return undefined;
    fn(s);
    await db.sessions.put(s);
    return s;
  });
}

/** Ejercicios consecutivos que comparten superset con el índice dado. */
export function supersetMembers(s: Session, i: number): number[] {
  const g = s.exercises[i]?.supersetGroup;
  if (!g) return [i];
  let a = i;
  let b = i;
  while (a > 0 && s.exercises[a - 1].supersetGroup === g) a--;
  while (b < s.exercises.length - 1 && s.exercises[b + 1].supersetGroup === g) b++;
  return Array.from({ length: b - a + 1 }, (_, k) => a + k);
}

const pending = (e: SessionExercise) => e.sets.some((x) => !x.done);

/**
 * Marca una serie como hecha. Decide el siguiente foco y arranca el descanso:
 *  - En superset pasa al siguiente ejercicio del grupo sin descanso; al cerrar la ronda, descansa.
 *  - Si el ejercicio ya no tiene series pendientes, pasa al siguiente con pendientes.
 */
export function completeSet(id: string, exIdx: number, setIdx: number, restFallback: number) {
  return mutate(id, (s) => {
    const ex = s.exercises[exIdx];
    const set = ex?.sets[setIdx];
    if (!set || set.weightKg == null || set.reps == null) return;
    set.done = true;
    set.doneAt = Date.now();
    // Si las siguientes series están vacías (primera vez con el ejercicio), heredan estos valores.
    for (const next of ex.sets.slice(setIdx + 1)) {
      if (next.done || next.isWarmup !== set.isWarmup) continue;
      if (next.weightKg == null) {
        next.weightKg = set.weightKg;
        next.reps = set.reps;
      } else if (next.reps == null) next.reps = set.reps;
    }

    const members = supersetMembers(s, exIdx);
    const pos = members.indexOf(exIdx);
    const nextInRound = members.slice(pos + 1).find((m) => pending(s.exercises[m]));
    if (members.length > 1 && nextInRound !== undefined) {
      s.focusIndex = nextInRound;
      s.restTimer = null;
      return;
    }

    const rest = ex.restSec || restFallback;
    s.restTimer = { endsAt: Date.now() + rest * 1000, totalSec: rest, exerciseId: ex.exerciseId };

    if (members.length > 1) {
      const first = members.find((m) => pending(s.exercises[m]));
      if (first !== undefined) {
        s.focusIndex = first;
        return;
      }
    }
    if (!pending(ex)) {
      const after = members[members.length - 1];
      const next = s.exercises.findIndex((e, i) => i > after && pending(e));
      const any = next !== -1 ? next : s.exercises.findIndex(pending);
      if (any !== -1) s.focusIndex = any;
    }
  });
}

export const uncompleteSet = (id: string, exIdx: number, setIdx: number) =>
  mutate(id, (s) => {
    const set = s.exercises[exIdx]?.sets[setIdx];
    if (set) {
      set.done = false;
      delete set.doneAt;
    }
  });

export const updateSet = (id: string, exIdx: number, setIdx: number, patch: Partial<SetEntry>) =>
  mutate(id, (s) => {
    const set = s.exercises[exIdx]?.sets[setIdx];
    if (set) Object.assign(set, patch);
  });

export const addSet = (id: string, exIdx: number, warmup = false) =>
  mutate(id, (s) => {
    const ex = s.exercises[exIdx];
    if (!ex) return;
    const ref = [...ex.sets].reverse().find((x) => !x.isWarmup) ?? ex.sets[ex.sets.length - 1];
    const set: SetEntry = {
      id: uid(),
      weightKg: warmup && ref?.weightKg != null ? Math.round((ref.weightKg * 0.5) / 2.5) * 2.5 : ref?.weightKg ?? null,
      reps: warmup ? 8 : ref?.reps ?? ex.repMin ?? null,
      isWarmup: warmup,
      done: false,
    };
    if (warmup) {
      // Los calentamientos van antes de la primera serie efectiva.
      const firstWork = ex.sets.findIndex((x) => !x.isWarmup);
      ex.sets.splice(firstWork === -1 ? ex.sets.length : firstWork, 0, set);
    } else ex.sets.push(set);
  });

export const removeSet = (id: string, exIdx: number, setIdx: number) =>
  mutate(id, (s) => {
    s.exercises[exIdx]?.sets.splice(setIdx, 1);
  });

export async function addExercise(id: string, exerciseId: string, restSec: number) {
  const sets = await prefilledSets(exerciseId, 3);
  return mutate(id, (s) => {
    s.exercises.push({ id: uid(), exerciseId, restSec, sets });
    s.focusIndex = s.exercises.length - 1;
  });
}

export async function replaceExercise(id: string, exIdx: number, exerciseId: string) {
  const s0 = await db.sessions.get(id);
  const ex0 = s0?.exercises[exIdx];
  if (!ex0) return;
  const sets = await prefilledSets(exerciseId, Math.max(1, ex0.sets.filter((x) => !x.isWarmup).length), ex0.repMin);
  return mutate(id, (s) => {
    const ex = s.exercises[exIdx];
    ex.exerciseId = exerciseId;
    ex.sets = sets;
  });
}

export const removeExercise = (id: string, exIdx: number) =>
  mutate(id, (s) => {
    s.exercises.splice(exIdx, 1);
    s.focusIndex = Math.max(0, Math.min(s.focusIndex ?? 0, s.exercises.length - 1));
  });

export const moveExercise = (id: string, from: number, to: number) =>
  mutate(id, (s) => {
    if (to < 0 || to >= s.exercises.length) return;
    const [e] = s.exercises.splice(from, 1);
    s.exercises.splice(to, 0, e);
    // Mover rompe el superset con los vecinos anteriores.
    delete e.supersetGroup;
    s.focusIndex = to;
  });

export const setFocus = (id: string, i: number) => mutate(id, (s) => void (s.focusIndex = i));

export const adjustTimer = (id: string, deltaSec: number) =>
  mutate(id, (s) => {
    if (!s.restTimer) return;
    const endsAt = Math.max(Date.now(), s.restTimer.endsAt + deltaSec * 1000);
    s.restTimer = { ...s.restTimer, endsAt, totalSec: Math.max(1, s.restTimer.totalSec + deltaSec) };
  });

export const skipTimer = (id: string) => mutate(id, (s) => void (s.restTimer = null));

export const applyToPending = (id: string, exIdx: number, weightKg: number, reps: number) =>
  mutate(id, (s) => {
    for (const set of s.exercises[exIdx]?.sets ?? []) {
      if (!set.done && !set.isWarmup) {
        set.weightKg = weightKg;
        set.reps = reps;
      }
    }
  });

export const setNotes = (id: string, notes: string) => mutate(id, (s) => void (s.notes = notes));

/** Cierra la sesión: descarta series sin completar, calcula resumen, PRs y logs. */
export async function finishSession(id: string): Promise<Session | undefined> {
  const s = await db.sessions.get(id);
  if (!s) return;
  const history = new Map<string, Records>();
  for (const e of s.exercises) {
    if (!history.has(e.exerciseId)) history.set(e.exerciseId, computeRecords(await getExerciseLogs(e.exerciseId, 1000)));
  }
  return db.transaction('rw', db.sessions, db.logs, async () => {
    const cur = await db.sessions.get(id);
    if (!cur || cur.status !== 'activa') return cur;
    const endedAt = Date.now();
    cur.exercises = cur.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
      .filter((e) => e.sets.length > 0);
    cur.status = 'terminada';
    cur.endedAt = endedAt;
    cur.durationSec = Math.round((endedAt - cur.startedAt) / 1000);
    cur.restTimer = null;
    cur.summary = {
      volumeKg: cur.exercises.reduce((a, e) => a + setsVolume(workSets(e.sets)), 0),
      setsDone: cur.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.isWarmup).length, 0),
      prs: sessionPRs(cur, history),
    };
    await db.sessions.put(cur);
    await db.logs.where('sessionId').equals(id).delete();
    await db.logs.bulkPut(buildLogs(cur));
    return cur;
  });
}

export const discardSession = (id: string) => db.sessions.delete(id);

/** Borra una sesión terminada y sus logs. Devuelve lo necesario para deshacer. */
export async function deleteFinishedSession(id: string) {
  return db.transaction('rw', db.sessions, db.logs, async () => {
    const s = await db.sessions.get(id);
    const logs = await db.logs.where('sessionId').equals(id).toArray();
    await db.sessions.delete(id);
    await db.logs.where('sessionId').equals(id).delete();
    return async () => {
      if (!s) return;
      await db.transaction('rw', db.sessions, db.logs, async () => {
        await db.sessions.put(s);
        await db.logs.bulkPut(logs);
      });
    };
  });
}
