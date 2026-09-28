import { describe, expect, it } from 'vitest';
import type { ExerciseLog, Session } from '../db/schema';
import { SEED_EXERCISES } from '../db/seed/exercises';
import { TEMPLATES, allTemplateExerciseIds, buildProgram } from '../db/seed/programs';
import { buildLogs } from './logs';
import { nextDayIndex } from './nextDay';
import { epley } from './oneRm';
import { suggest } from './progression';
import { recommend } from './recommend';
import { computeRecords, sessionPRs, setPRs } from './records';
import { KG_PER_LB, fromDisplay, parseDecimal, parseIntStrict, roundTo, toDisplay } from './units';

const log = (date: number, sets: [number, number][], extra: Partial<ExerciseLog> = {}): ExerciseLog => {
  const ws = sets.map(([w, r]) => ({ w, r }));
  return {
    id: String(date),
    exerciseId: 'x',
    sessionId: String(date),
    date,
    topWeightKg: Math.max(...ws.map((s) => s.w)),
    best1RM: Math.max(...ws.map((s) => epley(s.w, s.r))),
    volumeKg: ws.reduce((a, s) => a + s.w * s.r, 0),
    totalReps: ws.reduce((a, s) => a + s.r, 0),
    workSets: ws,
    ...extra,
  };
};

const base = { region: 'superior' as const, incrementUpperKg: 2.5, incrementLowerKg: 5, unit: 'kg' as const };

describe('Epley', () => {
  it('calcula 1RM', () => {
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley(0, 10)).toBe(0);
  });
});

describe('unidades', () => {
  it('kg ↔ lb sin pérdida', () => {
    expect(fromDisplay(100, 'lb')).toBeCloseTo(100 * KG_PER_LB);
    expect(toDisplay(fromDisplay(135, 'lb'), 'lb')).toBeCloseTo(135);
    expect(roundTo(82.4, 2.5)).toBe(82.5);
  });
  it('valida entradas', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseIntStrict('8')).toBe(8);
    expect(parseIntStrict('8.5')).toBeNull();
  });
});

describe('doble progresión', () => {
  it('sube peso si todas las series llegaron al tope', () => {
    const s = suggest({ ...base, repMin: 8, repMax: 12, targetSets: 3, logs: [log(3, [[60, 12], [60, 12], [60, 12]])] });
    expect(s?.kind).toBe('subir');
    expect(s?.weightKg).toBe(62.5);
    expect(s?.reps).toBe(8);
  });
  it('usa el incremento de tren inferior', () => {
    const s = suggest({ ...base, region: 'inferior', repMin: 5, repMax: 8, logs: [log(3, [[100, 8], [100, 8]])] });
    expect(s?.weightKg).toBe(105);
  });
  it('pide más reps si no llegó al tope', () => {
    const s = suggest({ ...base, repMin: 8, repMax: 12, targetSets: 3, logs: [log(3, [[60, 12], [60, 10], [60, 9]])] });
    expect(s?.kind).toBe('reps');
    expect(s?.weightKg).toBe(60);
    expect(s?.reps).toBe(10);
  });
  it('no sube si faltaron series', () => {
    const s = suggest({ ...base, repMin: 8, repMax: 12, targetSets: 3, logs: [log(3, [[60, 12], [60, 12]])] });
    expect(s?.kind).toBe('reps');
  });
  it('sugiere deload tras 3 caídas', () => {
    const s = suggest({
      ...base,
      repMin: 8,
      repMax: 12,
      logs: [log(3, [[80, 6]]), log(2, [[80, 8]]), log(1, [[80, 10]])],
    });
    expect(s?.kind).toBe('deload');
    expect(s?.weightKg).toBe(72.5);
  });
  it('sugiere mantener tras 2 sesiones bajas', () => {
    const s = suggest({ ...base, repMin: 8, repMax: 12, logs: [log(3, [[80, 8]]), log(2, [[80, 7]]), log(1, [[80, 10]])] });
    expect(s?.kind).toBe('mantener');
  });
  it('sin historial no sugiere', () => {
    expect(suggest({ ...base, logs: [] })).toBeNull();
  });
});

describe('récords', () => {
  const h = computeRecords([log(1, [[100, 5], [90, 8]])]);
  it('detecta PR de peso, 1RM y reps', () => {
    expect(setPRs(h, [], { w: 102.5, r: 3 })).toEqual(['peso']);
    expect(setPRs(h, [], { w: 102.5, r: 6 })).toEqual(['peso', '1rm']);
    expect(setPRs(h, [], { w: 90, r: 9 })).toEqual(['1rm', 'reps']);
    expect(setPRs(h, [], { w: 50, r: 9 })).toEqual([]);
    expect(setPRs(h, [], { w: 80, r: 5 })).toEqual([]);
  });
  it('no repite PR ya superado en la misma sesión', () => {
    expect(setPRs(h, [{ w: 105, r: 3 }], { w: 102.5, r: 3 })).toEqual([]);
  });
  it('sin historial no hay PR', () => {
    expect(setPRs(computeRecords([]), [], { w: 200, r: 1 })).toEqual([]);
  });
  it('PRs de sesión incluyen volumen', () => {
    const session: Session = {
      id: 's', dayName: 'A', startedAt: 0, status: 'terminada',
      exercises: [{ id: 'e', exerciseId: 'x', restSec: 90, sets: [
        { id: '1', weightKg: 100, reps: 6, isWarmup: false, done: true },
        { id: '2', weightKg: 100, reps: 6, isWarmup: false, done: true },
        { id: '3', weightKg: 100, reps: 6, isWarmup: false, done: true },
      ] }],
    };
    const kinds = sessionPRs(session, new Map([['x', h]])).map((p) => p.kind).sort();
    expect(kinds).toEqual(['1rm', 'reps', 'volumen']);
  });
});

describe('logs', () => {
  it('ignora calentamiento y series sin completar', () => {
    const logs = buildLogs({
      id: 's', dayName: 'A', startedAt: 5, status: 'terminada',
      exercises: [{ id: 'e', exerciseId: 'x', restSec: 90, sets: [
        { id: '1', weightKg: 40, reps: 10, isWarmup: true, done: true },
        { id: '2', weightKg: 100, reps: 5, isWarmup: false, done: true },
        { id: '3', weightKg: 100, reps: 5, isWarmup: false, done: false },
      ] }],
    });
    expect(logs[0].workSets).toEqual([{ w: 100, r: 5 }]);
  });
});

describe('recomendación de split', () => {
  it('3 días principiante → Full Body', () => {
    expect(recommend({ daysPerWeek: 3, experience: 'principiante', goal: 'general', equipment: 'gimnasio' }).best.key).toBe('fullbody');
  });
  it('4 días → Upper/Lower', () => {
    expect(recommend({ daysPerWeek: 4, experience: 'intermedio', goal: 'hipertrofia', equipment: 'gimnasio' }).best.key).toBe('upper-lower');
  });
  it('6 días → PPL con alternativas', () => {
    const r = recommend({ daysPerWeek: 6, experience: 'avanzado', goal: 'hipertrofia', equipment: 'gimnasio' });
    expect(r.best.key).toBe('ppl');
    expect(r.alternatives.map((a) => a.key)).toContain('arnold');
  });
});

describe('plantillas', () => {
  it('todos los ejercicios existen en la biblioteca', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    for (const id of allTemplateExerciseIds()) expect(ids.has(id), id).toBe(true);
  });
  it('se generan para cada equipo sin días vacíos ni duplicados', () => {
    for (const t of TEMPLATES) {
      for (const equipment of ['gimnasio', 'mancuernas', 'corporal'] as const) {
        const p = buildProgram(t.key, { equipment, goal: 'hipertrofia', experience: 'intermedio' });
        for (const d of p.days) {
          expect(d.items.length).toBeGreaterThanOrEqual(3);
          expect(new Set(d.items.map((i) => i.exerciseId)).size).toBe(d.items.length);
        }
      }
    }
  });
  it('siguiente día rota', () => {
    const p = buildProgram('upper-lower', { equipment: 'gimnasio', goal: 'general', experience: 'principiante' });
    expect(nextDayIndex(p, [])).toBe(0);
    expect(nextDayIndex(p, [{ status: 'terminada', programId: p.id, dayId: p.days[3].id }])).toBe(0);
    expect(nextDayIndex(p, [{ status: 'terminada', programId: p.id, dayId: p.days[1].id }])).toBe(2);
  });
});

describe('sesión que cruza la medianoche', () => {
  it('el log usa la fecha de inicio', () => {
    const start = new Date(2026, 8, 20, 23, 30).getTime();
    const end = new Date(2026, 8, 21, 0, 40).getTime();
    const [l] = buildLogs({
      id: 'n', dayName: 'A', startedAt: start, endedAt: end, status: 'terminada',
      exercises: [{ id: 'e', exerciseId: 'x', restSec: 90, sets: [{ id: '1', weightKg: 50, reps: 5, isWarmup: false, done: true }] }],
    });
    expect(l.date).toBe(start);
    expect(new Date(l.date).getDate()).toBe(20);
  });
});

describe('entrada decimal', () => {
  it('coma y punto valen lo mismo', () => {
    expect(parseDecimal('22,5')).toBe(22.5);
    expect(parseDecimal('22.5')).toBe(22.5);
    expect(parseDecimal(' 22,50 ')).toBe(22.5);
    expect(parseDecimal('22,5,1')).toBeNull();
    expect(parseDecimal('1.2.3')).toBeNull();
  });
});
