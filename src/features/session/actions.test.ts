import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeed } from '../../db/db';
import type { Program } from '../../db/schema';
import { completeSet, finishSession, startSession, updateSet } from './actions';

const program: Program = {
  id: 'p',
  name: 'Test',
  createdAt: 0,
  updatedAt: 0,
  days: [
    {
      id: 'd1',
      name: 'Día 1',
      items: [
        { id: 'i1', exerciseId: 'press-banca-barra', targetSets: 2, repMin: 8, repMax: 10, restSec: 120 },
        { id: 'i2', exerciseId: 'curl-barra', targetSets: 2, repMin: 10, repMax: 12, restSec: 60, supersetGroup: 'g' },
        { id: 'i3', exerciseId: 'press-frances', targetSets: 2, repMin: 10, repMax: 12, restSec: 60, supersetGroup: 'g' },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeed();
});

describe('sesión', () => {
  it('prellena con la última vez, arranca descanso y respeta supersets', async () => {
    let s = await startSession({ program, dayId: 'd1' });
    expect(s.exercises[0].sets[0].weightKg).toBeNull();

    await updateSet(s.id, 0, 0, { weightKg: 60, reps: 10 });
    s = (await completeSet(s.id, 0, 0, 90))!;
    // La serie vacía siguiente hereda los valores.
    expect(s.exercises[0].sets[1].weightKg).toBe(60);
    expect(s.restTimer?.totalSec).toBe(120);

    s = (await completeSet(s.id, 0, 1, 90))!;
    expect(s.focusIndex).toBe(1); // pasa al siguiente ejercicio

    await updateSet(s.id, 1, 0, { weightKg: 30, reps: 12 });
    s = (await completeSet(s.id, 1, 0, 90))!;
    expect(s.focusIndex).toBe(2); // superset: sin descanso, al compañero
    expect(s.restTimer).toBeNull();

    await updateSet(s.id, 2, 0, { weightKg: 25, reps: 12 });
    s = (await completeSet(s.id, 2, 0, 90))!;
    expect(s.restTimer?.totalSec).toBe(60); // cierra la ronda: descanso
    expect(s.focusIndex).toBe(1); // vuelve al primero del grupo

    const done = (await finishSession(s.id))!;
    expect(done.status).toBe('terminada');
    expect(done.exercises.map((e) => e.sets.length)).toEqual([2, 1, 1]);
    expect(done.summary?.volumeKg).toBe(60 * 10 * 2 + 30 * 12 + 25 * 12);

    // La siguiente sesión se prellena con lo de hoy.
    const next = await startSession({ program, dayId: 'd1' });
    expect(next.exercises[0].sets.map((x) => [x.weightKg, x.reps])).toEqual([
      [60, 10],
      [60, 10],
    ]);
  });

  it('solo permite una sesión activa', async () => {
    const a = await startSession();
    const b = await startSession({ program, dayId: 'd1' });
    expect(b.id).toBe(a.id);
  });
});
