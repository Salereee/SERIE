import { useMemo } from 'react';
import { useExerciseMap } from '../../db/hooks';
import type { Exercise, ProgramDay, Questionnaire } from '../../db/schema';
import { TEMPLATE_BY_KEY, buildDays, type TemplateKey } from '../../db/seed/programs';
import { fmtClock } from '../../domain/format';
import { ShowMore } from '../../ui/ShowMore';
import './programs.css';

/** Vista previa de un programa (plantilla o días ya construidos). */
export function TemplatePreview({ templateKey, q, compact }: { templateKey: TemplateKey; q: Questionnaire; compact?: boolean }) {
  const days = useMemo(
    () => buildDays(TEMPLATE_BY_KEY[templateKey], { equipment: q.equipment, goal: q.goal, experience: q.experience }),
    [templateKey, q],
  );
  // En la recomendación basta ver el primer día; el resto queda a un toque.
  if (compact) return <DaysTable days={days} compact />;
  return (
    <ShowMore items={days} limit={1} noun="días">
      {(visible) => <DaysTable days={visible} />}
    </ShowMore>
  );
}

export function DaysTable({ days, compact, wide, extra }: { days: ProgramDay[]; compact?: boolean; wide?: boolean; extra?: Exercise[] }) {
  const local = useExerciseMap();
  // `extra`: ejercicios que aún no existen aquí (p. ej. los propios de una rutina compartida).
  const ex = extra?.length ? new Map([...local, ...extra.map((e) => [e.id, e] as const)]) : local;
  return (
    <div className={`days-table${compact ? ' days-table--compact' : ''}${wide ? ' days-table--wide' : ''}`}>
      {days.map((d, i) => (
        <section key={d.id} className="days-table__day" aria-label={d.name}>
          <header className="days-table__head">
            <span className="title-sm">{d.name}</span>
            <span className="eyebrow tnum">Día {i + 1}</span>
          </header>
          <ol>
            {d.items.map((it) => (
              <li key={it.id} className="days-table__item">
                <span>{ex.get(it.exerciseId)?.name ?? it.exerciseId}</span>
                <span className="tnum muted days-table__rx">
                  {it.targetSets} × {it.repMin}–{it.repMax}
                  {!compact && <> · {fmtClock(it.restSec)}</>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
