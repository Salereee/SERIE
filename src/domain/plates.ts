import type { Unit } from '../db/schema';
import { KG_PER_LB, toDisplay } from './units';

/** Discos comunes por unidad, de mayor a menor. */
export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/** Barras que se ofrecen en Ajustes, en la unidad elegida. */
export const BAR_OPTIONS: Record<Unit, number[]> = {
  kg: [20, 15, 10, 0],
  lb: [45, 35, 25, 0],
};

/** Peso de barra en kg según el ajuste; sin ajuste, la olímpica de la unidad (20 kg o 45 lb). */
export const barKgFor = (barKg: number | undefined, unit: Unit) => barKg ?? (unit === 'lb' ? 45 * KG_PER_LB : 20);

export interface PlateResult {
  /** Discos por lado, en la unidad mostrada. */
  perSide: number[];
  /** Lo que falta por lado para llegar exacto (0 si se puede armar). */
  remainder: number;
  /** El peso es menor que la barra. */
  belowBar: boolean;
}

/**
 * Discos por lado para llegar a `totalKg` con una barra de `barKg`, usando los discos de la unidad mostrada.
 * Todo se calcula en la unidad mostrada y con centésimas para evitar errores de coma flotante.
 */
export function platesPerSide(totalKg: number, barKg: number, unit: Unit): PlateResult {
  const total = toDisplay(totalKg, unit);
  const bar = Math.round(toDisplay(barKg, unit) * 100) / 100;
  if (total + 0.001 < bar) return { perSide: [], remainder: 0, belowBar: true };
  let side = Math.round(((total - bar) / 2) * 100);
  const perSide: number[] = [];
  for (const p of PLATES[unit]) {
    const c = Math.round(p * 100);
    while (side >= c) {
      perSide.push(p);
      side -= c;
    }
  }
  return { perSide, remainder: side / 100, belowBar: false };
}
