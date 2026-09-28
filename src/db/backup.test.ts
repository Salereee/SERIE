import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, exportBackup, importBackup, readBackupFile } from './backup';
import { db, ensureSeed } from './db';
import { loadDemoData } from './demo';
import { validateBackup } from './validate';

const file = (content: string) => new File([content], 'r.json', { type: 'application/json' });

async function validBackupObject() {
  return JSON.parse(await (await exportBackup()).text());
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeed();
  await loadDemoData(4);
  await db.exercises.put({ id: 'custom-a', name: 'Mío', primaryMuscle: 'pecho', secondaryMuscles: [], equipment: 'barra', kind: 'compuesto', region: 'superior', isCustom: true, custom: 1 });
});

describe('respaldo: ida y vuelta', () => {
  it('reemplazar restaura sesiones, logs y ejercicios propios', async () => {
    const before = { s: await db.sessions.count(), l: await db.logs.count() };
    const f = file(await (await exportBackup()).text());
    await db.sessions.clear();
    await db.logs.clear();
    await db.exercises.delete('custom-a');

    const r = await importBackup(await readBackupFile(f), 'reemplazar');
    expect(r.sessions).toBe(before.s);
    expect(await db.logs.count()).toBe(before.l);
    expect((await db.exercises.get('custom-a'))?.name).toBe('Mío');
  });

  it('fusionar agrega solo lo que falta y no toca lo existente', async () => {
    const backup = await validBackupObject();
    const total = await db.sessions.count();
    const [first] = await db.sessions.toArray();
    await db.sessions.delete(first.id);
    await db.sessions.update((await db.sessions.toArray())[0].id, { notes: 'mía' });

    const r = await importBackup(validateBackup(backup, 1), 'fusionar');
    expect(r.sessions).toBe(1);
    expect(await db.sessions.count()).toBe(total);
    expect((await db.sessions.filter((s) => s.notes === 'mía').count())).toBe(1);
  });
});

describe('respaldo: rechazos (sin escribir nada)', () => {
  const rejects = async (content: string, pattern: RegExp) => {
    const before = await db.sessions.count();
    await expect(readBackupFile(file(content))).rejects.toThrow(pattern);
    expect(await db.sessions.count()).toBe(before);
  };

  it('JSON malformado', () => rejects('{ "format": "serie-backup", ', /JSON/));
  it('no es un respaldo', () => rejects('{"a":1}', /respaldo de SERIE/));
  it('un arreglo en lugar de objeto', () => rejects('[1,2,3]', /respaldo de SERIE/));

  it('campo de más en la raíz', async () => {
    const b = await validBackupObject();
    b.malicioso = '<script>';
    await rejects(JSON.stringify(b), /respaldo\.malicioso: campo no reconocido/);
  });

  it('campo de más dentro de una serie', async () => {
    const b = await validBackupObject();
    b.sessions[0].exercises[0].sets[0].extra = 1;
    await rejects(JSON.stringify(b), /sessions\[0\]\.exercises\[0\]\.sets\[0\]\.extra: campo no reconocido/);
  });

  it('tipo incorrecto: peso como texto', async () => {
    const b = await validBackupObject();
    b.sessions[1].exercises[0].sets[0].weightKg = '100';
    await rejects(JSON.stringify(b), /sessions\[1\]\.exercises\[0\]\.sets\[0\]\.weightKg: debe ser un número/);
  });

  it('peso negativo o absurdo', async () => {
    const b = await validBackupObject();
    b.sessions[0].exercises[0].sets[0].weightKg = -5;
    await rejects(JSON.stringify(b), /weightKg: debe estar entre 0 y 2000/);
  });

  it('reps decimales', async () => {
    const b = await validBackupObject();
    b.sessions[0].exercises[0].sets[0].reps = 8.5;
    await rejects(JSON.stringify(b), /reps: debe ser un número entero/);
  });

  it('valor fuera de catálogo', async () => {
    const b = await validBackupObject();
    b.exercises[0].primaryMuscle = 'orejas';
    await rejects(JSON.stringify(b), /exercises\[0\]\.primaryMuscle: valor no válido/);
  });

  it('rango de reps invertido en un programa', async () => {
    const b = await validBackupObject();
    b.programs[0].days[0].items[0].repMin = 12;
    b.programs[0].days[0].items[0].repMax = 8;
    await rejects(JSON.stringify(b), /repMax: debe ser mayor o igual que repMin/);
  });

  it('ids repetidos', async () => {
    const b = await validBackupObject();
    b.sessions[1].id = b.sessions[0].id;
    await rejects(JSON.stringify(b), /id repetido/);
  });

  it('versión más nueva que la app', async () => {
    const b = await validBackupObject();
    b.version = 99;
    await rejects(JSON.stringify(b), /versión más nueva/);
  });

  it('archivo demasiado grande', async () => {
    const big = new File([new Uint8Array(21 * 1024 * 1024)], 'grande.json');
    await expect(readBackupFile(big)).rejects.toBeInstanceOf(BackupError);
  });
});
