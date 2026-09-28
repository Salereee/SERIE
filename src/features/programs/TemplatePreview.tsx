import { useMemo } from 'react';
import { useExerciseMap } from '../../db/hooks';
import type { ProgramDay, Questionnaire } from '../../db/schema';
import { TEMPLATE_BY_KEY, buildDays, type TemplateKey } from '../../db/seed/programs';
import { fmtClock } from '../../domain/format';
import './programs.css';

/** Vista previa de un programa (plantilla o días ya construidos). */
export function TemplatePreview({ templateKey, q, compact }: { templateKey: TemplateKey; q: Questionnaire; compact?: boolean }) {
  const days = useMemo(
    () => buildDays(TEMPLATE_BY_KEY[templateKey], { equipment: q.equipment, goal: q.goal, experience: q.experience }),
    [templateKey, q],
  );
  return <DaysTable days={days} compact={compact} />;
}

export function DaysTable({ days, compact, wide }: { days: ProgramDay[]; compact?: boolean; wide?: boolean }) {
  const ex = useExerciseMap();
  return (
    <div className={`days-table${compact ? ' days-table--compact' : ''}${wide ? ' days-table--wide' : ''}`}>
      {days.map((d, i) => (
        <section key={d.id} className="days-table__day" aria-label={d.name}>
          <header className="days-table__head">
            <span className="mono small">{String(i + 1).padStart(2, '0')}</span>
            <span className="title-sm">{d.name}</span>
          </header>
          <ol>
            {d.items.map((it) => (
              <li key={it.id} className="days-table__item">
                <span>{ex.get(it.exerciseId)?.name ?? it.exerciseId}</span>
                <span className="mono small muted">
                  {it.targetSets}×{it.repMin}–{it.repMax}
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
