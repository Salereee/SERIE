import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeed } from '../../db/db';
import type { Program, Session } from '../../db/schema';
import { accordionState } from './accordion';
import { completeSet, startSession, updateSet } from './actions';

const program: Program = {
  id: 'p',
  name: 'Test',
  createdAt: 0,
  updatedAt: 0,
  days: [
    {
      id: 'd',
      name: 'Día',
      items: [
        { id: 'a', exerciseId: 'sentadilla', targetSets: 2, repMin: 5, repMax: 8, restSec: 120 },
        { id: 'b', exerciseId: 'prensa', targetSets: 2, repMin: 8, repMax: 12, restSec: 90 },
        { id: 'c', exerciseId: 'curl-femoral-acostado', targetSets: 1, repMin: 10, repMax: 15, restSec: 60 },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeed();
});

describe('acordeón de la sesión', () => {
  it('al empezar: el primer ejercicio abierto y los demás cerrados con su objetivo', async () => {
    const s = await startSession({ program, dayId: 'd' });
    const rows = accordionState(s, 'kg');
    expect(rows.map((r) => r.open)).toEqual([true, false, false]);
    expect(rows.map((r) => r.status)).toEqual(['actual', 'pendiente', 'pendiente']);
    expect(rows[1].summary).toBe('2 × 8–12 · 1:30');
    expect(rows[0]).toMatchObject({ done: 0, total: 2 });
  });

  it('al completar la última serie se cierra ese ejercicio (con su resumen) y se abre el siguiente', async () => {
    let s: Session = await startSession({ program, dayId: 'd' });
    await updateSet(s.id, 0, 0, { weightKg: 100, reps: 6 });
    s = (await completeSet(s.id, 0, 0, 90))!;
    expect(accordionState(s, 'kg').map((r) => r.open)).toEqual([true, false, false]); // aún falta una serie

    s = (await completeSet(s.id, 0, 1, 90))!;
    const rows = accordionState(s, 'kg');
    expect(rows.map((r) => r.open)).toEqual([false, true, false]);
    expect(rows[0].status).toBe('hecho');
    expect(rows[0].summary).toBe('100×6 · 100×6');
    expect(rows[0]).toMatchObject({ done: 2, total: 2 });
    // El timer sigue corriendo: el cambio de ejercicio no lo toca.
    expect(s.restTimer?.totalSec).toBe(120);
  });

  it('el usuario puede plegar el ejercicio actual sin perder el foco', async () => {
    const s = await startSession({ program, dayId: 'd' });
    const rows = accordionState(s, 'kg', true);
    expect(rows.every((r) => !r.open)).toBe(true);
    expect(rows[0].status).toBe('actual');
  });

  it('el resumen respeta la unidad elegida', async () => {
    let s: Session = await startSession({ program, dayId: 'd' });
    await updateSet(s.id, 1, 0, { weightKg: 100, reps: 10 });
    s = (await completeSet(s.id, 1, 0, 90))!;
    expect(accordionState(s, 'lb')[1].summary).toBe('220.46×10');
  });
});
