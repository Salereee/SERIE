import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { SerieDB, ensureSeed } from './db';
import { SEED_EXERCISES } from './seed/exercises';

describe('migraciones', () => {
  it('v1 → v2 conserva datos y genera logs de sesiones terminadas', async () => {
    const name = 'mig-' + Math.random();
    const v1 = new Dexie(name);
    v1.version(1).stores({
      exercises: 'id, name, primaryMuscle, equipment',
      programs: 'id, updatedAt',
      sessions: 'id, status, startedAt',
      settings: 'id',
    });
    await v1.table('exercises').put({ id: 'custom-1', name: 'Mi ejercicio', isCustom: true, primaryMuscle: 'pecho', equipment: 'barra' });
    await v1.table('sessions').put({
      id: 's1', status: 'terminada', startedAt: 1000, endedAt: 2000, dayName: 'A',
      exercises: [{ id: 'e1', exerciseId: 'custom-1', restSec: 90, sets: [
        { id: 'a', weightKg: 100, reps: 5, isWarmup: false, done: true },
        { id: 'b', weightKg: 40, reps: 10, isWarmup: true, done: true },
      ] }],
    });
    v1.close();

    const v2 = new SerieDB(name);
    await v2.open();
    const ex = await v2.exercises.get('custom-1');
    expect(ex?.name).toBe('Mi ejercicio');
    expect(ex?.custom).toBe(1);
    const logs = await v2.logs.where('exerciseId').equals('custom-1').toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].volumeKg).toBe(500);
    expect(logs[0].workSets).toEqual([{ w: 100, r: 5 }]);
    v2.close();
  });

  it('el seed no toca ejercicios personalizados y es idempotente', async () => {
    const d = new SerieDB('seed-' + Math.random());
    await d.exercises.put({ id: 'custom-x', name: 'X', primaryMuscle: 'pecho', secondaryMuscles: [], equipment: 'barra', kind: 'compuesto', region: 'superior', isCustom: true, custom: 1 });
    await ensureSeed(d);
    await ensureSeed(d);
    expect(await d.exercises.count()).toBe(SEED_EXERCISES.length + 1);
    expect((await d.exercises.get('custom-x'))?.name).toBe('X');
    d.close();
  });

  it('ids de la biblioteca son únicos y hay ~80+', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(SEED_EXERCISES.length);
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(80);
  });
});
