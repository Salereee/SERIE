import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, ensureSeed } from '../db/db';
import type { Exercise, Program } from '../db/schema';
import { buildProgram } from '../db/seed/programs';
import { decodeProgram, encodeProgram, MAX_SHARE_CHARS, ShareError } from './shareProgram';

let local: Map<string, Exercise>;
const mine: Exercise = { id: 'custom-abc', name: 'Remo en máquina X', primaryMuscle: 'espalda', secondaryMuscles: ['biceps'], equipment: 'maquina', kind: 'compuesto', region: 'superior', isCustom: true, custom: 1, note: 'nota privada' };

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeed();
  local = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
});

const withCustom = (): Program => {
  const p = buildProgram('upper-lower', { equipment: 'gimnasio', goal: 'hipertrofia', experience: 'intermedio' });
  p.days[0].items.push({ id: 'x1', exerciseId: mine.id, targetSets: 3, repMin: 8, repMax: 12, restSec: 90 });
  p.days[0].items[0].supersetGroup = 'grupo-largo';
  p.days[0].items[1].supersetGroup = 'grupo-largo';
  return p;
};

describe('compartir rutina por enlace', () => {
  it('ida y vuelta: mismos días, ejercicios, series, reps, descansos y supersets, con ids nuevos', async () => {
    const p = withCustom();
    const code = await encodeProgram(p, new Map([...local, [mine.id, mine]]));
    expect(code.length).toBeLessThan(3000);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);

    const r = await decodeProgram(code, local);
    expect(r.program.name).toBe(p.name);
    expect(r.program.id).not.toBe(p.id);
    expect(r.program.days.map((d) => d.name)).toEqual(p.days.map((d) => d.name));
    const strip = (prog: Program) => prog.days.map((d) => d.items.map((i) => [i.exerciseId, i.targetSets, i.repMin, i.repMax, i.restSec, !!i.supersetGroup]));
    expect(strip(r.program)).toEqual(strip(p));
    expect(r.program.days[0].items[0].supersetGroup).toBe(r.program.days[0].items[1].supersetGroup);
  });

  it('incluye los ejercicios propios, sin su nota privada', async () => {
    const code = await encodeProgram(withCustom(), new Map([...local, [mine.id, mine]]));
    const r = await decodeProgram(code, local);
    expect(r.newExercises).toHaveLength(1);
    expect(r.newExercises[0]).toMatchObject({ id: mine.id, name: mine.name, isCustom: true, custom: 1 });
    expect(r.newExercises[0].note).toBeUndefined();
  });

  it('reutiliza un ejercicio propio igual y renombra el id si choca con otro distinto', async () => {
    const code = await encodeProgram(withCustom(), new Map([...local, [mine.id, mine]]));
    const same = await decodeProgram(code, new Map([...local, [mine.id, mine]]));
    expect(same.newExercises).toHaveLength(0);

    const clash = await decodeProgram(code, new Map([...local, [mine.id, { ...mine, name: 'Otro ejercicio' }]]));
    expect(clash.newExercises[0].id).not.toBe(mine.id);
    expect(clash.program.days[0].items.at(-1)!.exerciseId).toBe(clash.newExercises[0].id);
  });

  it('rechaza enlaces dañados, ajenos o enormes con un mensaje claro', async () => {
    const code = await encodeProgram(withCustom(), new Map([...local, [mine.id, mine]]));
    await expect(decodeProgram(code.slice(0, code.length / 2), local)).rejects.toBeInstanceOf(ShareError);
    await expect(decodeProgram('hola mundo', local)).rejects.toBeInstanceOf(ShareError);
    await expect(decodeProgram('', local)).rejects.toBeInstanceOf(ShareError);
    await expect(decodeProgram('A'.repeat(MAX_SHARE_CHARS + 1), local)).rejects.toThrow(/demasiado largo/);
  });

  it('rechaza un ejercicio predefinido que este dispositivo no conoce', async () => {
    const p = buildProgram('upper-lower', { equipment: 'gimnasio', goal: 'hipertrofia', experience: 'intermedio' });
    p.days[0].items[0].exerciseId = 'ejercicio-del-futuro';
    const code = await encodeProgram(p, local);
    await expect(decodeProgram(code, local)).rejects.toThrow(/no conoce/);
  });
});
