import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db, ensureSeed } from '../db/db';
import { DEFAULT_SETTINGS } from '../db/schema';
import { switchUnit } from './unitSwitch';
import { fromDisplay, toDisplay } from './units';

describe('cambiar de unidad', () => {
  it('varios cambios kg↔lb no alteran ningún peso guardado', async () => {
    await ensureSeed();
    const weights = [60, 62.5, 100, 22.5, 0.5, fromDisplay(135, 'lb')];
    await db.sessions.put({
      id: 's', dayName: 'A', startedAt: Date.now(), status: 'terminada',
      exercises: [{ id: 'e', exerciseId: 'sentadilla', restSec: 90, sets: weights.map((w, i) => ({ id: String(i), weightKg: w, reps: 5, isWarmup: false, done: true })) }],
    });
    let s = { ...DEFAULT_SETTINGS };
    for (const u of ['lb', 'kg', 'lb', 'lb', 'kg', 'lb', 'kg'] as const) {
      s = { ...s, ...switchUnit(s, u) };
      await db.settings.update('app', switchUnit((await db.settings.get('app'))!, u));
    }
    const stored = (await db.sessions.get('s'))!.exercises[0].sets.map((x) => x.weightKg);
    expect(stored).toEqual(weights);
    // Lo mostrado en lb vuelve al mismo número tras ir y venir.
    expect(toDisplay(fromDisplay(135, 'lb'), 'lb')).toBeCloseTo(135, 10);
  });

  it('los incrementos quedan en valores redondos y vuelven a los originales', () => {
    let s = { ...DEFAULT_SETTINGS };
    s = { ...s, ...switchUnit(s, 'lb') };
    expect(toDisplay(s.incrementUpperKg, 'lb')).toBeCloseTo(5);
    expect(toDisplay(s.incrementLowerKg, 'lb')).toBeCloseTo(10);
    s = { ...s, ...switchUnit(s, 'kg') };
    expect(s.incrementUpperKg).toBe(2.5);
    expect(s.incrementLowerKg).toBe(5);
    expect(switchUnit(s, 'kg')).toEqual({});
  });
});
