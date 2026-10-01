import { useSettings } from '../db/hooks';
import type { PRHit } from '../db/schema';
import { showsAdvancedMetrics } from '../db/schema';
import { fmtDateShort } from '../domain/format';
import { prLabel } from '../domain/records';
import { fmtVolume, fmtWeight } from '../domain/units';

/** Fila de récord: ejercicio, tipo y fecha a la izquierda; la marca a la derecha. */
export function PRRow({ pr, name, date }: { pr: PRHit; name: string; date?: number }) {
  const settings = useSettings();
  const { unit } = settings;
  const value =
    pr.kind === 'reps'
      ? `${pr.value} reps × ${fmtWeight(pr.atWeightKg ?? 0, unit)} ${unit}`
      : pr.kind === 'volumen'
        ? `${fmtVolume(pr.value, unit)} ${unit}`
        : `${fmtWeight(pr.value, unit)} ${unit}`;
  return (
    <li className="pr-row">
      <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
        <span className="pr-row__name">{name}</span>
        <span className="eyebrow">
          {prLabel(pr.kind, showsAdvancedMetrics(settings))}
          {date ? ` · ${fmtDateShort(date)}` : ''}
        </span>
      </span>
      <span className="mono pr-row__val">{value}</span>
    </li>
  );
}
