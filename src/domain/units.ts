import type { Unit } from '../db/schema';

export const KG_PER_LB = 0.45359237;

export function toDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** Redondea al múltiplo de `step` más cercano, evitando basura de coma flotante. */
export function roundTo(value: number, step: number): number {
  if (!(step > 0)) return value;
  return Math.round(Math.round(value / step) * step * 1000) / 1000;
}

const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/** Peso formateado en la unidad del usuario, sin sufijo. */
export function fmtWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return '—';
  return nf.format(Math.round(toDisplay(kg, unit) * 100) / 100);
}

export function fmtNumber(n: number, decimals = 0): string {
  return (decimals === 0 ? nf0 : decimals === 1 ? nf1 : nf).format(n);
}

/** Volumen grande: 12 450 → "12 450". */
export function fmtVolume(kg: number, unit: Unit): string {
  return nf0.format(Math.round(toDisplay(kg, unit)));
}

/** Valor que se muestra dentro de un input (usa punto decimal para que inputmode=decimal lo edite bien). */
export function weightInputValue(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return '';
  const v = Math.round(toDisplay(kg, unit) * 100) / 100;
  return String(v);
}

/** Interpreta texto del usuario ("82,5" o "82.5"). Devuelve null si no es un número válido ≥ 0. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^\d*\.?\d*$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseIntStrict(text: string): number | null {
  const t = text.trim();
  if (t === '' || !/^\d+$/.test(t)) return null;
  return Number(t);
}
