import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from './db';
import type { Exercise, ExerciseLog, Settings } from './schema';
import { DEFAULT_SETTINGS } from './schema';

// Se precarga antes del primer render para no parpadear con valores por defecto.
let settingsCache: Settings = DEFAULT_SETTINGS;
export function primeSettings(s: Settings) {
  settingsCache = s;
}
/** Último valor conocido de los ajustes, para código fuera de React (sonidos, vibración). */
export function getSettingsSnapshot(): Settings {
  return settingsCache;
}

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('app'), [], settingsCache);
  if (s) settingsCache = s;
  return s ?? settingsCache;
}

export function updateSettings(patch: Partial<Settings>) {
  return db.settings.update('app', patch);
}

/** Toda la biblioteca (incluye archivados) indexada por id. */
export function useExerciseMap(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  return useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
}

export function useActiveSession() {
  return useLiveQuery(() => db.sessions.where('status').equals('activa').first(), [], null);
}

export function useActiveProgram() {
  const s = useSettings();
  return useLiveQuery(() => (s.activeProgramId ? db.programs.get(s.activeProgramId) : undefined), [s.activeProgramId], undefined);
}

/** Logs de un ejercicio, del más reciente al más antiguo. */
export function useExerciseLogs(exerciseId: string | undefined): ExerciseLog[] | undefined {
  return useLiveQuery(
    () =>
      exerciseId
        ? db.logs.where('[exerciseId+date]').between([exerciseId, -Infinity], [exerciseId, Infinity]).reverse().toArray()
        : [],
    [exerciseId],
  );
}

export function getExerciseLogs(exerciseId: string, limit = 50): Promise<ExerciseLog[]> {
  return db.logs.where('[exerciseId+date]').between([exerciseId, -Infinity], [exerciseId, Infinity]).reverse().limit(limit).toArray();
}

/** Ids de ejercicios usados recientemente (más reciente primero). */
export function useRecentExerciseIds(limit = 8): string[] {
  return (
    useLiveQuery(async () => {
      const logs = await db.logs.orderBy('date').reverse().limit(200).toArray();
      const seen: string[] = [];
      for (const l of logs) if (!seen.includes(l.exerciseId)) seen.push(l.exerciseId);
      return seen.slice(0, limit);
    }, [limit]) ?? []
  );
}
