import { db } from './db';
import type { ExerciseLog, PRHit, Program, Session, SessionExercise, SetEntry } from './schema';
import { buildProgram } from './seed/programs';
import { SEED_EXERCISES } from './seed/exercises';
import { uid } from '../domain/ids';
import { buildLogs, setsVolume, workSets } from '../domain/logs';
import { computeRecords, sessionPRs, type Records } from '../domain/records';

/** Pesos iniciales (kg) razonables para un intermedio. */
const START: Record<string, number> = {
  'press-banca-barra': 60,
  'remo-barra': 55,
  'press-militar': 37.5,
  'jalon-pecho': 50,
  'curl-barra': 25,
  'extension-triceps-cuerda': 22.5,
  sentadilla: 80,
  'peso-muerto-rumano': 70,
  prensa: 140,
  'curl-femoral-acostado': 35,
  'elevacion-talones-pie': 60,
  'crunch-polea': 30,
  'press-inclinado-mancuerna': 22,
  'remo-polea-baja': 50,
  'elevaciones-laterales': 8,
  'press-frances': 25,
  'curl-martillo': 14,
  'peso-muerto': 110,
  'hip-thrust': 90,
  'extension-cuadriceps': 45,
  'elevacion-piernas-colgado': 0,
};

/** PRNG determinista (mulberry32) para que el ejemplo sea siempre igual. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ExState {
  w: number;
  reps: number[];
}

/**
 * Genera ~10 semanas de historial con doble progresión simulada, un ejercicio en caída
 * (para ver la sugerencia de deload) y otro listo para subir de peso.
 */
export async function loadDemoData(weeks = 10): Promise<void> {
  await removeDemoData();
  const rand = rng(42);
  const program: Program = {
    ...buildProgram('upper-lower', { equipment: 'gimnasio', goal: 'hipertrofia', experience: 'intermedio' }),
    name: 'Torso / Pierna (ejemplo)',
    isDemo: true,
  };
  const region = new Map(SEED_EXERCISES.map((e) => [e.id, e]));
  const state = new Map<string, ExState>();
  const sessions: Session[] = [];
  const logs: ExerciseLog[] = [];
  const history = new Map<string, ExerciseLog[]>();

  // Lunes, martes, jueves y viernes de las últimas `weeks` semanas.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const offsets = [0, 1, 3, 4];
  let dayIdx = 0;
  const totalSessions = weeks * offsets.length;
  let n = 0;

  for (let wk = 0; wk < weeks; wk++) {
    for (const off of offsets) {
      // Faltas ocasionales para que el calendario se vea real.
      if (rand() < 0.1) continue;
      n++;
      const day = program.days[dayIdx % program.days.length];
      dayIdx++;
      const start = new Date(monday);
      start.setDate(monday.getDate() + wk * 7 + off);
      start.setHours(7 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
      if (start.getTime() > Date.now() - 3600_000) continue;
      const remaining = totalSessions - n;

      const exercises: SessionExercise[] = day.items.map((it) => {
        const ex = region.get(it.exerciseId)!;
        const inc = ex.region === 'inferior' ? 5 : 2.5;
        let st = state.get(it.exerciseId);
        // Press militar: cae en las últimas sesiones (dispara la sugerencia de deload).
        if (st && it.exerciseId === 'press-militar' && remaining < 14) {
          st = { w: st.w, reps: st.reps.map((r) => Math.max(3, r - 1)) };
        } else if (!st) {
          // Arranca en la parte baja del rango, no siempre en el mínimo exacto.
          const r0 = it.repMin + Math.floor(rand() * Math.max(1, Math.floor((it.repMax - it.repMin) / 2) + 1));
          st = { w: START[it.exerciseId] ?? (ex.region === 'inferior' ? 60 : 20), reps: Array(it.targetSets).fill(r0) };
        } else if (st.reps.every((r) => r >= it.repMax)) {
          st = { w: st.w + inc, reps: Array(it.targetSets).fill(it.repMin) };
        } else {
          st = { w: st.w, reps: st.reps.map((r, i) => Math.min(it.repMax, r + (rand() < 0.8 - i * 0.08 ? 1 : 0))) };
        }
        // Curl con barra: la última vez llegó al tope en todas las series.
        if (it.exerciseId === 'curl-barra' && remaining < 3) st = { w: st.w, reps: st.reps.map(() => it.repMax) };
        state.set(it.exerciseId, st);

        const sets: SetEntry[] = [];
        let t = start.getTime() + 5 * 60_000;
        if (ex.kind === 'compuesto' && st.w >= 40) {
          sets.push({ id: uid(), weightKg: Math.round((st.w * 0.5) / 2.5) * 2.5, reps: 8, isWarmup: true, done: true, doneAt: (t += 90_000) });
        }
        st.reps.forEach((r) => {
          sets.push({ id: uid(), weightKg: st!.w, reps: r, isWarmup: false, rir: Math.max(0, Math.round(3 - rand() * 3)), done: true, doneAt: (t += it.restSec * 1000 + 40_000) });
        });
        return { id: uid(), exerciseId: it.exerciseId, targetSets: it.targetSets, repMin: it.repMin, repMax: it.repMax, restSec: it.restSec, sets };
      });

      const durationSec = Math.round((48 + rand() * 30) * 60);
      const session: Session = {
        id: uid(),
        programId: program.id,
        dayId: day.id,
        dayName: day.name,
        startedAt: start.getTime(),
        endedAt: start.getTime() + durationSec * 1000,
        durationSec,
        status: 'terminada',
        exercises,
        isDemo: true,
      };
      const recs = new Map<string, Records>();
      for (const e of exercises) recs.set(e.exerciseId, computeRecords(history.get(e.exerciseId) ?? []));
      const prs: PRHit[] = sessionPRs(session, recs);
      session.summary = {
        volumeKg: exercises.reduce((a, e) => a + setsVolume(workSets(e.sets)), 0),
        setsDone: exercises.reduce((a, e) => a + e.sets.filter((s) => s.done && !s.isWarmup).length, 0),
        prs,
      };
      const sLogs = buildLogs(session);
      for (const l of sLogs) history.set(l.exerciseId, [...(history.get(l.exerciseId) ?? []), l]);
      logs.push(...sLogs);
      sessions.push(session);
    }
  }

  await db.transaction('rw', db.programs, db.sessions, db.logs, db.settings, async () => {
    await db.programs.put(program);
    await db.sessions.bulkPut(sessions);
    await db.logs.bulkPut(logs);
    const s = await db.settings.get('app');
    const activeExists = s?.activeProgramId ? await db.programs.get(s.activeProgramId) : undefined;
    await db.settings.update('app', { onboardingDone: true, ...(activeExists ? {} : { activeProgramId: program.id }) });
  });
}

export async function removeDemoData(): Promise<number> {
  return db.transaction('rw', db.programs, db.sessions, db.logs, db.settings, async () => {
    const demoPrograms = await db.programs.filter((p) => !!p.isDemo).primaryKeys();
    const n = await db.sessions.filter((s) => !!s.isDemo).delete();
    await db.logs.filter((l) => !!l.isDemo).delete();
    await db.programs.bulkDelete(demoPrograms);
    const s = await db.settings.get('app');
    if (s?.activeProgramId && demoPrograms.includes(s.activeProgramId)) {
      const other = await db.programs.orderBy('updatedAt').last();
      await db.settings.update('app', { activeProgramId: other?.id });
    }
    return n;
  });
}

export async function hasDemoData(): Promise<boolean> {
  return (await db.sessions.filter((s) => !!s.isDemo).count()) > 0;
}
