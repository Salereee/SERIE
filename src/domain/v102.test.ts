import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup, readBackupFile } from '../db/backup';
import { db, ensureSeed } from '../db/db';
import type { Program } from '../db/schema';
import { completeSet, snapshotBeforeComplete, startSession, undoComplete, updateSet } from '../features/session/actions';
import { barKgFor, platesPerSide } from './plates';
import { fromDisplay } from './units';

describe('discos por lado', () => {
  it('kg: 100 kg con barra de 20 = 25 + 15 por lado', () => {
    expect(platesPerSide(100, 20, 'kg')).toEqual({ perSide: [25, 15], remainder: 0, belowBar: false });
  });
  it('kg: pesos con fracción usan los discos chicos', () => {
    expect(platesPerSide(62.5, 20, 'kg').perSide).toEqual([20, 1.25]);
  });
  it('lb: 225 lb con barra de 45 = dos de 45 por lado', () => {
    expect(platesPerSide(fromDisplay(225, 'lb'), barKgFor(undefined, 'lb'), 'lb').perSide).toEqual([45, 45]);
  });
  it('avisa lo que no se puede armar y cuando el peso es menor que la barra', () => {
    expect(platesPerSide(21, 20, 'kg')).toMatchObject({ perSide: [], remainder: 0.5 });
    expect(platesPerSide(15, 20, 'kg').belowBar).toBe(true);
    expect(platesPerSide(20, 20, 'kg')).toEqual({ perSide: [], remainder: 0, belowBar: false });
  });
});

const program: Program = {
  id: 'p', name: 'T', createdAt: 0, updatedAt: 0,
  days: [{ id: 'd', name: 'Día', items: [
    { id: 'a', exerciseId: 'sentadilla', targetSets: 2, repMin: 5, repMax: 8, restSec: 120 },
    { id: 'b', exerciseId: 'prensa', targetSets: 1, repMin: 8, repMax: 12, restSec: 90 },
  ] }],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeed();
});

describe('deshacer una serie', () => {
  it('regresa la serie, lo heredado, el foco y el descanso', async () => {
    let s = await startSession({ program, dayId: 'd' });
    await updateSet(s.id, 0, 0, { weightKg: 100, reps: 5 });
    await updateSet(s.id, 0, 1, { weightKg: null, reps: null });
    s = (await db.sessions.get(s.id))!;
    // Completar la segunda después de la primera cambia de ejercicio y arranca el descanso.
    s = (await completeSet(s.id, 0, 0, 90))!;
    const snap = snapshotBeforeComplete(s, 0);
    s = (await completeSet(s.id, 0, 1, 90))!;
    expect(s.focusIndex).toBe(1);
    const timerBefore = snap.restTimer;

    s = (await undoComplete(s.id, snap))!;
    expect(s.exercises[0].sets[1].done).toBe(false);
    expect(s.exercises[0].sets[0].done).toBe(true);
    expect(s.focusIndex).toBe(snap.focusIndex);
    expect(s.restTimer).toEqual(timerBefore);
  });

  it('también deshace lo que la primera serie heredó a las siguientes', async () => {
    let s = await startSession({ program, dayId: 'd' });
    await updateSet(s.id, 0, 0, { weightKg: 80, reps: 6 });
    await updateSet(s.id, 0, 1, { weightKg: null, reps: null });
    s = (await db.sessions.get(s.id))!;
    const snap = snapshotBeforeComplete(s, 0);
    s = (await completeSet(s.id, 0, 0, 90))!;
    expect(s.exercises[0].sets[1].weightKg).toBe(80);
    s = (await undoComplete(s.id, snap))!;
    expect(s.exercises[0].sets[1].weightKg).toBeNull();
    expect(s.restTimer ?? null).toBeNull();
  });
});

describe('nota por ejercicio', () => {
  it('sobrevive a una actualización del catálogo de ejercicios', async () => {
    await db.exercises.update('sentadilla', { note: 'Barra baja' });
    await db.settings.update('app', { seedVersion: 0 });
    await ensureSeed();
    expect((await db.exercises.get('sentadilla'))?.note).toBe('Barra baja');
  });

  it('viaja en el respaldo aunque el ejercicio sea predefinido', async () => {
    await db.exercises.update('prensa', { note: 'Asiento en 4' });
    const f = new File([await (await exportBackup()).text()], 'r.json');
    await db.exercises.update('prensa', { note: undefined });
    await importBackup(await readBackupFile(f), 'fusionar');
    expect((await db.exercises.get('prensa'))?.note).toBe('Asiento en 4');
  });
});
