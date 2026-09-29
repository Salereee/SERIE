import { db, ensureSeed } from './db';
import type { Exercise, Program, Session, Settings } from './schema';
import { BackupError, MAX_BACKUP_BYTES, validateBackup, type ValidBackup } from './validate';
import { buildLogs } from '../domain/logs';

const FORMAT = 'serie-backup';
export const BACKUP_FORMAT_VERSION = 1;

interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  exercises: Exercise[];
  programs: Program[];
  sessions: Session[];
  settings: Settings | undefined;
}

export async function exportBackup(): Promise<Blob> {
  const settings = await db.settings.get('app');
  const data: Backup = {
    format: FORMAT,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    // Solo se exportan los ejercicios propios y los predefinidos archivados; el resto viene con la app.
    exercises: await db.exercises.filter((e) => e.isCustom || !!e.archived || !!e.note).toArray(),
    programs: await db.programs.toArray(),
    sessions: await db.sessions.toArray(),
    settings,
  };
  return new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
}

export function backupFilename(prefix = 'serie-respaldo') {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Exporta, descarga y anota la fecha del respaldo (para el recordatorio). */
export async function exportAndDownload() {
  downloadBlob(await exportBackup(), backupFilename());
  await db.settings.update('app', { lastExportAt: Date.now(), exportReminderSnoozedUntil: undefined });
}

/**
 * Para pasar los datos a otro dispositivo: abre el menú de compartir del sistema con el archivo
 * (WhatsApp, correo, AirDrop, Drive…). Si el navegador no puede compartir archivos, lo descarga.
 */
export async function exportAndShare(): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const blob = await exportBackup();
  const file = new File([blob], backupFilename(), { type: 'application/json' });
  let result: 'compartido' | 'descargado' | 'cancelado' = 'descargado';
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Respaldo de SERIE' });
      result = 'compartido';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelado';
      downloadBlob(blob, file.name);
    }
  } else downloadBlob(blob, file.name);
  await db.settings.update('app', { lastExportAt: Date.now(), exportReminderSnoozedUntil: undefined });
  return result;
}

/** Lee y valida el archivo sin tocar la base. Lanza BackupError con un mensaje en español. */
export async function readBackupFile(file: File): Promise<ValidBackup> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new BackupError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${MAX_BACKUP_BYTES / 1024 / 1024} MB.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new BackupError('El archivo no es un JSON válido.');
  }
  return validateBackup(parsed, BACKUP_FORMAT_VERSION);
}

export type ImportMode = 'reemplazar' | 'fusionar';

export interface ImportResult {
  sessions: number;
  programs: number;
  exercises: number;
  /** Sesiones que no se importaron (p. ej. una sesión activa cuando ya hay otra). */
  skipped: number;
}

/**
 * Escribe un respaldo YA VALIDADO en una sola transacción: si algo falla, no queda nada a medias.
 * - reemplazar: borra sesiones, programas y ejercicios propios actuales y carga los del archivo.
 * - fusionar: agrega lo que no existe (por id) y no toca nada de lo que ya tienes.
 */
export async function importBackup(b: ValidBackup, mode: ImportMode): Promise<ImportResult> {
  const result: ImportResult = { sessions: 0, programs: 0, exercises: 0, skipped: 0 };
  await db.transaction('rw', [db.exercises, db.programs, db.sessions, db.logs, db.settings], async () => {
    const exercises = b.exercises.map((e) => ({ ...e, custom: e.isCustom ? (1 as const) : (0 as const) }));
    if (mode === 'reemplazar') {
      await db.programs.clear();
      await db.sessions.clear();
      await db.logs.clear();
      await db.exercises.where('custom').equals(1).delete();
      await db.exercises.bulkPut(exercises);
      await db.programs.bulkPut(b.programs);
      await db.sessions.bulkPut(b.sessions);
      await db.logs.bulkPut(b.sessions.filter((s) => s.status === 'terminada').flatMap(buildLogs));
      if (b.settings) await db.settings.put({ ...b.settings, id: 'app', seedVersion: 0 });
      Object.assign(result, { sessions: b.sessions.length, programs: b.programs.length, exercises: exercises.length });
      return;
    }

    const has = async (table: typeof db.sessions | typeof db.programs | typeof db.exercises, ids: string[]) =>
      new Set((await table.bulkGet(ids)).filter(Boolean).map((x) => (x as { id: string }).id));

    const exIds = await has(db.exercises, exercises.map((e) => e.id));
    const newEx = exercises.filter((e) => e.isCustom && !exIds.has(e.id));
    await db.exercises.bulkAdd(newEx);
    // Notas de ejercicios que ya existen: solo se agregan donde no tienes una.
    for (const e of exercises) {
      if (!e.note || !exIds.has(e.id)) continue;
      const local = await db.exercises.get(e.id);
      if (local && !local.note) await db.exercises.update(e.id, { note: e.note });
    }

    const progIds = await has(db.programs, b.programs.map((p) => p.id));
    const newProgs = b.programs.filter((p) => !progIds.has(p.id));
    await db.programs.bulkAdd(newProgs);

    const sessIds = await has(db.sessions, b.sessions.map((s) => s.id));
    const localActive = await db.sessions.where('status').equals('activa').count();
    const newSess = b.sessions.filter((s) => !sessIds.has(s.id) && !(s.status === 'activa' && localActive > 0));
    result.skipped = b.sessions.filter((s) => !sessIds.has(s.id)).length - newSess.length;
    await db.sessions.bulkAdd(newSess);
    await db.logs.bulkPut(newSess.filter((s) => s.status === 'terminada').flatMap(buildLogs));
    Object.assign(result, { sessions: newSess.length, programs: newProgs.length, exercises: newEx.length });
  });
  await ensureSeed();
  return result;
}

export async function wipeAll() {
  await db.transaction('rw', [db.exercises, db.programs, db.sessions, db.logs, db.settings], async () => {
    await Promise.all([db.exercises.clear(), db.programs.clear(), db.sessions.clear(), db.logs.clear(), db.settings.clear()]);
  });
  await ensureSeed();
}

export { BackupError };
