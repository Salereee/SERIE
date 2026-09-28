import type { Settings, Unit } from '../db/schema';
import { fromDisplay, toDisplay } from './units';

/** Incrementos redondos que ofrece la app en cada unidad. */
export const INCREMENT_OPTIONS: Record<Unit, number[]> = { kg: [0.5, 1, 1.25, 2, 2.5, 5, 10], lb: [1, 2.5, 5, 10, 20] };

function nearestOption(kg: number, unit: Unit): number {
  const shown = toDisplay(kg, unit);
  const opts = INCREMENT_OPTIONS[unit];
  const best = opts.reduce((a, b) => (Math.abs(b - shown) < Math.abs(a - shown) ? b : a), opts[0]);
  return fromDisplay(best, unit);
}

/**
 * Cambiar de unidad NO toca ningún peso guardado (todo vive en kg).
 * Solo ajusta los incrementos a valores redondos de la nueva unidad (2.5 kg ↔ 5 lb).
 */
export function switchUnit(s: Pick<Settings, 'unit' | 'incrementUpperKg' | 'incrementLowerKg'>, unit: Unit): Partial<Settings> {
  if (unit === s.unit) return {};
  return { unit, incrementUpperKg: nearestOption(s.incrementUpperKg, unit), incrementLowerKg: nearestOption(s.incrementLowerKg, unit) };
}
