import { EQUIPMENT, MUSCLES, type Exercise, type Program, type Session, type Settings } from './schema';

/**
 * Validación estricta de respaldos. Se revisa TODO antes de tocar la base:
 * estructura, tipos, rangos y campos desconocidos. Si algo falla, se rechaza el archivo
 * completo con la ruta exacta del problema (p. ej. "sessions[3].exercises[0].sets[2].reps").
 */

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const MAX_ITEMS = 100_000;
const MAX_TEXT = 2000;
const MAX_NAME = 120;
export const MAX_NOTE = 500;
const MAX_WEIGHT_KG = 2000;
const MAX_REPS = 1000;
/** 2000-01-01 … 2100-01-01 en ms. */
const MIN_TS = 946_684_800_000;
const MAX_TS = 4_102_444_800_000;

type Obj = Record<string, unknown>;

function fail(path: string, msg: string): never {
  throw new BackupError(`${path}: ${msg}`);
}

function obj(v: unknown, path: string, allowed: readonly string[], required: readonly string[]): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'debe ser un objeto');
  const o = v as Obj;
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${path}.${k}`, 'campo no reconocido');
  for (const k of required) if (o[k] === undefined) fail(`${path}.${k}`, 'falta este campo');
  return o;
}

function arr(v: unknown, path: string, max = MAX_ITEMS): unknown[] {
  if (!Array.isArray(v)) fail(path, 'debe ser una lista');
  if (v.length > max) fail(path, `tiene demasiados elementos (máximo ${max})`);
  return v;
}

function str(v: unknown, path: string, max = MAX_NAME, { optional = false, nonEmpty = true } = {}) {
  if (v === undefined && optional) return;
  if (typeof v !== 'string') fail(path, 'debe ser texto');
  if (nonEmpty && v.trim() === '') fail(path, 'no puede estar vacío');
  if (v.length > max) fail(path, `es demasiado largo (máximo ${max} caracteres)`);
}

function num(v: unknown, path: string, min: number, max: number, { int = false, optional = false, nullable = false } = {}) {
  if (v === undefined && optional) return;
  if (v === null && nullable) return;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(path, 'debe ser un número');
  if (int && !Number.isInteger(v)) fail(path, 'debe ser un número entero');
  if (v < min || v > max) fail(path, `debe estar entre ${min} y ${max}`);
}

function bool(v: unknown, path: string, optional = false) {
  if (v === undefined && optional) return;
  if (typeof v !== 'boolean') fail(path, 'debe ser verdadero o falso');
}

function oneOf(v: unknown, path: string, values: readonly unknown[], optional = false) {
  if (v === undefined && optional) return;
  if (!values.includes(v)) fail(path, `valor no válido (${JSON.stringify(v)})`);
}

const ts = (v: unknown, path: string, optional = false) => num(v, path, MIN_TS, MAX_TS, { optional });
const id = (v: unknown, path: string) => str(v, path, 100);

function validateExercise(v: unknown, p: string): Exercise {
  const o = obj(v, p, ['id', 'name', 'primaryMuscle', 'secondaryMuscles', 'equipment', 'kind', 'region', 'isCustom', 'archived', 'custom', 'note'], ['id', 'name', 'primaryMuscle', 'secondaryMuscles', 'equipment', 'kind', 'region', 'isCustom']);
  id(o.id, `${p}.id`);
  str(o.name, `${p}.name`);
  oneOf(o.primaryMuscle, `${p}.primaryMuscle`, MUSCLES);
  arr(o.secondaryMuscles, `${p}.secondaryMuscles`, MUSCLES.length).forEach((m, i) => oneOf(m, `${p}.secondaryMuscles[${i}]`, MUSCLES));
  oneOf(o.equipment, `${p}.equipment`, EQUIPMENT);
  oneOf(o.kind, `${p}.kind`, ['compuesto', 'aislamiento']);
  oneOf(o.region, `${p}.region`, ['superior', 'inferior', 'core']);
  bool(o.isCustom, `${p}.isCustom`);
  bool(o.archived, `${p}.archived`, true);
  str(o.note, `${p}.note`, MAX_NOTE, { optional: true, nonEmpty: false });
  oneOf(o.custom, `${p}.custom`, [0, 1], true);
  if (o.isCustom && !String(o.id).startsWith('custom-')) fail(`${p}.id`, 'los ejercicios propios deben empezar con "custom-"');
  return o as unknown as Exercise;
}

function validateProgram(v: unknown, p: string): Program {
  const o = obj(v, p, ['id', 'name', 'templateKey', 'equipmentProfile', 'days', 'createdAt', 'updatedAt', 'isDemo'], ['id', 'name', 'days', 'createdAt', 'updatedAt']);
  id(o.id, `${p}.id`);
  str(o.name, `${p}.name`);
  str(o.templateKey, `${p}.templateKey`, 40, { optional: true });
  oneOf(o.equipmentProfile, `${p}.equipmentProfile`, ['gimnasio', 'mancuernas', 'corporal'], true);
  ts(o.createdAt, `${p}.createdAt`);
  ts(o.updatedAt, `${p}.updatedAt`);
  bool(o.isDemo, `${p}.isDemo`, true);
  arr(o.days, `${p}.days`, 14).forEach((d, i) => {
    const dp = `${p}.days[${i}]`;
    const day = obj(d, dp, ['id', 'name', 'items'], ['id', 'name', 'items']);
    id(day.id, `${dp}.id`);
    str(day.name, `${dp}.name`);
    arr(day.items, `${dp}.items`, 40).forEach((it, j) => {
      const ip = `${dp}.items[${j}]`;
      const item = obj(it, ip, ['id', 'exerciseId', 'targetSets', 'repMin', 'repMax', 'restSec', 'supersetGroup'], ['id', 'exerciseId', 'targetSets', 'repMin', 'repMax', 'restSec']);
      id(item.id, `${ip}.id`);
      id(item.exerciseId, `${ip}.exerciseId`);
      num(item.targetSets, `${ip}.targetSets`, 1, 20, { int: true });
      num(item.repMin, `${ip}.repMin`, 1, MAX_REPS, { int: true });
      num(item.repMax, `${ip}.repMax`, 1, MAX_REPS, { int: true });
      if ((item.repMax as number) < (item.repMin as number)) fail(`${ip}.repMax`, 'debe ser mayor o igual que repMin');
      num(item.restSec, `${ip}.restSec`, 0, 3600, { int: true });
      str(item.supersetGroup, `${ip}.supersetGroup`, 100, { optional: true });
    });
  });
  return o as unknown as Program;
}

function validateSession(v: unknown, p: string): Session {
  const o = obj(
    v,
    p,
    ['id', 'programId', 'dayId', 'dayName', 'startedAt', 'endedAt', 'durationSec', 'status', 'notes', 'exercises', 'focusIndex', 'restTimer', 'summary', 'isDemo'],
    ['id', 'dayName', 'startedAt', 'status', 'exercises'],
  );
  id(o.id, `${p}.id`);
  if (o.programId !== undefined) id(o.programId, `${p}.programId`);
  if (o.dayId !== undefined) id(o.dayId, `${p}.dayId`);
  str(o.dayName, `${p}.dayName`);
  ts(o.startedAt, `${p}.startedAt`);
  ts(o.endedAt, `${p}.endedAt`, true);
  if (o.endedAt !== undefined && (o.endedAt as number) < (o.startedAt as number)) fail(`${p}.endedAt`, 'no puede ser anterior al inicio');
  num(o.durationSec, `${p}.durationSec`, 0, 7 * 24 * 3600, { optional: true });
  oneOf(o.status, `${p}.status`, ['activa', 'terminada']);
  str(o.notes, `${p}.notes`, MAX_TEXT, { optional: true, nonEmpty: false });
  num(o.focusIndex, `${p}.focusIndex`, 0, 100, { int: true, optional: true });
  bool(o.isDemo, `${p}.isDemo`, true);
  if (o.restTimer !== undefined && o.restTimer !== null) {
    const t = obj(o.restTimer, `${p}.restTimer`, ['endsAt', 'totalSec', 'exerciseId'], ['endsAt', 'totalSec']);
    ts(t.endsAt, `${p}.restTimer.endsAt`);
    num(t.totalSec, `${p}.restTimer.totalSec`, 0, 3600);
    if (t.exerciseId !== undefined) id(t.exerciseId, `${p}.restTimer.exerciseId`);
  }
  if (o.summary !== undefined) {
    const s = obj(o.summary, `${p}.summary`, ['volumeKg', 'setsDone', 'prs'], ['volumeKg', 'setsDone', 'prs']);
    num(s.volumeKg, `${p}.summary.volumeKg`, 0, 1e8);
    num(s.setsDone, `${p}.summary.setsDone`, 0, 10_000, { int: true });
    arr(s.prs, `${p}.summary.prs`, 500).forEach((pr, i) => {
      const pp = `${p}.summary.prs[${i}]`;
      const h = obj(pr, pp, ['exerciseId', 'kind', 'value', 'atWeightKg', 'previous'], ['exerciseId', 'kind', 'value']);
      id(h.exerciseId, `${pp}.exerciseId`);
      oneOf(h.kind, `${pp}.kind`, ['peso', '1rm', 'volumen', 'reps']);
      num(h.value, `${pp}.value`, 0, 1e8);
      num(h.atWeightKg, `${pp}.atWeightKg`, 0, MAX_WEIGHT_KG, { optional: true });
      num(h.previous, `${pp}.previous`, 0, 1e8, { optional: true });
    });
  }
  arr(o.exercises, `${p}.exercises`, 60).forEach((e, i) => {
    const ep = `${p}.exercises[${i}]`;
    const ex = obj(e, ep, ['id', 'exerciseId', 'targetSets', 'repMin', 'repMax', 'restSec', 'supersetGroup', 'sets'], ['id', 'exerciseId', 'restSec', 'sets']);
    id(ex.id, `${ep}.id`);
    id(ex.exerciseId, `${ep}.exerciseId`);
    num(ex.targetSets, `${ep}.targetSets`, 1, 20, { int: true, optional: true });
    num(ex.repMin, `${ep}.repMin`, 1, MAX_REPS, { int: true, optional: true });
    num(ex.repMax, `${ep}.repMax`, 1, MAX_REPS, { int: true, optional: true });
    num(ex.restSec, `${ep}.restSec`, 0, 3600, { int: true });
    str(ex.supersetGroup, `${ep}.supersetGroup`, 100, { optional: true });
    arr(ex.sets, `${ep}.sets`, 50).forEach((st, j) => {
      const sp = `${ep}.sets[${j}]`;
      const set = obj(st, sp, ['id', 'weightKg', 'reps', 'isWarmup', 'rir', 'rpe', 'done', 'doneAt'], ['id', 'weightKg', 'reps', 'isWarmup', 'done']);
      id(set.id, `${sp}.id`);
      num(set.weightKg, `${sp}.weightKg`, 0, MAX_WEIGHT_KG, { nullable: true });
      num(set.reps, `${sp}.reps`, 0, MAX_REPS, { int: true, nullable: true });
      bool(set.isWarmup, `${sp}.isWarmup`);
      num(set.rir, `${sp}.rir`, 0, 10, { int: true, optional: true, nullable: true });
      num(set.rpe, `${sp}.rpe`, 1, 10, { optional: true, nullable: true });
      bool(set.done, `${sp}.done`);
      ts(set.doneAt, `${sp}.doneAt`, true);
    });
  });
  return o as unknown as Session;
}

function validateSettings(v: unknown, p: string): Settings {
  const o = obj(
    v,
    p,
    ['id', 'mode', 'unit', 'incrementUpperKg', 'incrementLowerKg', 'defaultRestSec', 'sound', 'vibration', 'theme', 'activeProgramId', 'onboardingDone', 'questionnaire', 'seedVersion', 'lastExportAt', 'exportReminderSnoozedUntil', 'installHintSeen', 'effortTracking', 'barKg'],
    ['id', 'mode', 'unit', 'incrementUpperKg', 'incrementLowerKg', 'defaultRestSec', 'sound', 'vibration', 'theme', 'onboardingDone'],
  );
  oneOf(o.id, `${p}.id`, ['app']);
  oneOf(o.mode, `${p}.mode`, ['basico', 'avanzado']);
  oneOf(o.unit, `${p}.unit`, ['kg', 'lb']);
  num(o.incrementUpperKg, `${p}.incrementUpperKg`, 0.1, 50);
  num(o.incrementLowerKg, `${p}.incrementLowerKg`, 0.1, 50);
  num(o.defaultRestSec, `${p}.defaultRestSec`, 0, 3600, { int: true });
  bool(o.sound, `${p}.sound`);
  bool(o.vibration, `${p}.vibration`);
  oneOf(o.theme, `${p}.theme`, ['sistema', 'claro', 'oscuro']);
  if (o.activeProgramId !== undefined) id(o.activeProgramId, `${p}.activeProgramId`);
  bool(o.onboardingDone, `${p}.onboardingDone`);
  num(o.seedVersion, `${p}.seedVersion`, 0, 1000, { int: true, optional: true });
  ts(o.lastExportAt, `${p}.lastExportAt`, true);
  ts(o.exportReminderSnoozedUntil, `${p}.exportReminderSnoozedUntil`, true);
  bool(o.installHintSeen, `${p}.installHintSeen`, true);
  bool(o.effortTracking, `${p}.effortTracking`, true);
  num(o.barKg, `${p}.barKg`, 0, 50, { optional: true });
  if (o.questionnaire !== undefined) {
    const q = obj(o.questionnaire, `${p}.questionnaire`, ['daysPerWeek', 'experience', 'goal', 'equipment'], ['daysPerWeek', 'experience', 'goal', 'equipment']);
    num(q.daysPerWeek, `${p}.questionnaire.daysPerWeek`, 1, 7, { int: true });
    oneOf(q.experience, `${p}.questionnaire.experience`, ['principiante', 'intermedio', 'avanzado']);
    oneOf(q.goal, `${p}.questionnaire.goal`, ['fuerza', 'hipertrofia', 'general']);
    oneOf(q.equipment, `${p}.questionnaire.equipment`, ['gimnasio', 'mancuernas', 'corporal']);
  }
  return o as unknown as Settings;
}

function uniqueIds(items: { id: string }[], path: string) {
  const seen = new Set<string>();
  items.forEach((it, i) => {
    if (seen.has(it.id)) fail(`${path}[${i}].id`, `id repetido (${it.id})`);
    seen.add(it.id);
  });
}

export interface ValidBackup {
  format: 'serie-backup';
  version: number;
  exportedAt: string;
  exercises: Exercise[];
  programs: Program[];
  sessions: Session[];
  settings?: Settings;
}

/** Valida un respaldo ya parseado. Lanza BackupError con la ruta del primer problema. */
export function validateBackup(data: unknown, supportedVersion: number): ValidBackup {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new BackupError('El archivo no parece un respaldo de SERIE.');
  if ((data as Obj).format !== 'serie-backup') throw new BackupError('El archivo no parece un respaldo de SERIE (falta la marca de formato).');
  const o = obj(data, 'respaldo', ['format', 'version', 'exportedAt', 'exercises', 'programs', 'sessions', 'settings'], ['format', 'version', 'exportedAt', 'exercises', 'programs', 'sessions']);
  num(o.version, 'respaldo.version', 1, 1000, { int: true });
  if ((o.version as number) > supportedVersion) {
    throw new BackupError(`El respaldo es de una versión más nueva de la app (formato ${o.version}); actualiza la app antes de importarlo.`);
  }
  str(o.exportedAt, 'respaldo.exportedAt', 40);
  const exercises = arr(o.exercises, 'exercises').map((e, i) => validateExercise(e, `exercises[${i}]`));
  const programs = arr(o.programs, 'programs', 500).map((e, i) => validateProgram(e, `programs[${i}]`));
  const sessions = arr(o.sessions, 'sessions').map((e, i) => validateSession(e, `sessions[${i}]`));
  const settings = o.settings === undefined ? undefined : validateSettings(o.settings, 'settings');
  uniqueIds(exercises, 'exercises');
  uniqueIds(programs, 'programs');
  uniqueIds(sessions, 'sessions');
  if (sessions.filter((s) => s.status === 'activa').length > 1) fail('sessions', 'hay más de una sesión activa');
  return { format: 'serie-backup', version: o.version as number, exportedAt: o.exportedAt as string, exercises, programs, sessions, settings };
}
