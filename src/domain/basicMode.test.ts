import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, showsAdvancedMetrics, showsEffort } from '../db/schema';
import { prLabel } from './records';

describe('modo básico y registro de esfuerzo', () => {
  it('el modo básico nunca pide RIR/RPE ni muestra 1RM', () => {
    const s = { ...DEFAULT_SETTINGS, mode: 'basico' as const };
    expect(showsEffort(s)).toBe(false);
    expect(showsEffort({ ...s, effortTracking: true })).toBe(false);
    expect(showsAdvancedMetrics(s)).toBe(false);
  });

  it('en avanzado el RIR está activo salvo que el usuario lo apague', () => {
    const s = { ...DEFAULT_SETTINGS, mode: 'avanzado' as const };
    expect(showsEffort(s)).toBe(true); // ajustes previos sin el campo
    expect(showsEffort({ ...s, effortTracking: false })).toBe(false);
    expect(showsAdvancedMetrics(s)).toBe(true);
  });

  it('el récord de 1RM se nombra "Mejor serie" en básico', () => {
    expect(prLabel('1rm', false)).toBe('Mejor serie');
    expect(prLabel('1rm', true)).toBe('1RM estimado');
    expect(prLabel('peso', false)).toBe('Peso máximo');
  });
});
