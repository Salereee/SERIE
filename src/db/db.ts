import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, ExerciseLog, Program, Session, Settings } from './schema';
import { DEFAULT_SETTINGS } from './schema';
import { EXERCISE_SEED_VERSION, SEED_EXERCISES } from './seed/exercises';
import { buildLogs } from '../domain/logs';

export class SerieDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  logs!: EntityTable<ExerciseLog, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'serie') {
    super(name);
    applySchema(this);
  }
}

/**
 * Historial de esquemas. Reglas:
 *  - Nunca edites una versión ya publicada: agrega una nueva con .stores() y, si hace falta, .upgrade().
 *  - Solo se declaran índices; los demás campos se guardan igual sin declararlos.
 *  - Poner una tabla en null la elimina: no lo hagas sin migrar antes sus datos.
 */
export function applySchema(db: Dexie) {
  // v1: modelo inicial.
  db.version(1).stores({
    exercises: 'id, name, primaryMuscle, equipment',
    programs: 'id, updatedAt',
    sessions: 'id, status, startedAt',
    settings: 'id',
  });

  // v2: índice derivado de logs por ejercicio (gráficas e historial rápidos),
  //     índice "custom" en ejercicios y programId en sesiones.
  db.version(2)
    .stores({
      exercises: 'id, name, primaryMuscle, equipment, custom',
      sessions: 'id, status, startedAt, programId',
      logs: 'id, exerciseId, sessionId, date, [exerciseId+date]',
    })
    .upgrade(async (tx) => {
      await tx
        .table('exercises')
        .toCollection()
        .modify((e: Exercise) => {
          e.custom = e.isCustom ? 1 : 0;
        });
      const finished = (await tx.table('sessions').where('status').equals('terminada').toArray()) as Session[];
      const logs = finished.flatMap(buildLogs);
      if (logs.length) await tx.table('logs').bulkPut(logs);
    });

  // v3: los logs pasan a fecharse con el INICIO de la sesión (antes, el fin). Sin cambio de índices:
  //     solo se reconstruye la tabla derivada desde las sesiones.
  db.version(3)
    .stores({})
    .upgrade(async (tx) => {
      const finished = (await tx.table('sessions').where('status').equals('terminada').toArray()) as Session[];
      await tx.table('logs').clear();
      const logs = finished.flatMap(buildLogs);
      if (logs.length) await tx.table('logs').bulkPut(logs);
    });
}

export const db = new SerieDB();

/** Crea ajustes por defecto y sincroniza la biblioteca predefinida sin tocar los ejercicios personalizados. */
export async function ensureSeed(target: SerieDB = db): Promise<Settings> {
  return target.transaction('rw', target.exercises, target.settings, async () => {
    let settings = await target.settings.get('app');
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS };
      await target.settings.put(settings);
    }
    if ((settings.seedVersion ?? 0) < EXERCISE_SEED_VERSION) {
      const existing = await target.exercises.bulkGet(SEED_EXERCISES.map((e) => e.id));
      // Conserva la marca de archivado si el usuario ya la tenía.
      const merged = SEED_EXERCISES.map((e, i) => (existing[i]?.archived ? { ...e, archived: true } : e));
      await target.exercises.bulkPut(merged);
      settings = { ...settings, seedVersion: EXERCISE_SEED_VERSION };
      await target.settings.put(settings);
    }
    return settings;
  });
}
