import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { useActiveProgram, useActiveSession, useExerciseMap, useSettings } from '../../db/hooks';
import type { PRHit, Session } from '../../db/schema';
import { fmtClock, fmtDateShort, fmtDuration, fmtRelativeDay, startOfDay, startOfWeek } from '../../domain/format';
import { nextDayIndex } from '../../domain/nextDay';
import { PR_LABEL } from '../../domain/records';
import { fmtVolume, fmtWeight } from '../../domain/units';
import { Icon } from '../../ui/Icon';
import { Meta } from '../../ui/Meta';
import { BackupReminder } from '../settings/BackupReminder';
import { Sheet } from '../../ui/Sheet';
import { useStartSession } from '../session/useStartSession';
import { WeekHeatmap } from '../progress/charts';
import './today.css';

export function TodayPage() {
  const settings = useSettings();
  const program = useActiveProgram();
  const active = useActiveSession();
  const ex = useExerciseMap();
  const start = useStartSession();
  const [pickDay, setPickDay] = useState(false);
  const recent = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'terminada').limit(40).toArray(), [], [] as Session[]);

  const nextIdx = program ? nextDayIndex(program, recent) : -1;
  const day = program && nextIdx >= 0 ? program.days[nextIdx] : undefined;
  const last = recent[0];
  const weekStart = startOfWeek(Date.now());
  const thisWeek = recent.filter((s) => s.startedAt >= weekStart);
  const prs = recent
    .flatMap((s) => (s.summary?.prs ?? []).filter((p) => p.kind !== 'volumen').map((p) => ({ ...p, date: s.startedAt })))
    .slice(0, 6);

  return (
    <div className="page today">
      {active && (
        <Link to="/sesion" className="today__live">
          <span className="live-bar__dot" aria-hidden="true" />
          <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
            <span className="eyebrow" style={{ color: 'inherit', opacity: 0.8 }}>
              Sesión en curso · desde {fmtClock((Date.now() - active.startedAt) / 1000)}
            </span>
            <span className="title-sm">{active.dayName}</span>
          </span>
          <span className="btn btn--accent btn--sm">Continuar</span>
        </Link>
      )}

      <BackupReminder />

      <div className="grid12">
        <section className="span-7 today__next" aria-labelledby="toca-hoy">
          {program && day ? (
            <>
              <Meta parts={['Toca hoy', `día ${nextIdx + 1} de ${program.days.length}`, program.name]} />
              <div className="today__mast">
                <h1 id="toca-hoy" className="title-xl today__day">
                  {day.name}
                </h1>
                <span className="outline-num" aria-hidden="true">
                  {String(nextIdx + 1).padStart(2, '0')}
                </span>
              </div>
              <ol className="today__items">
                {day.items.map((it, i) => (
                  <li key={it.id}>
                    <span className="mono small muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="today__ex">{ex.get(it.exerciseId)?.name ?? it.exerciseId}</span>
                    <span className="mono small">
                      {it.targetSets}×{it.repMin}–{it.repMax}
                    </span>
                  </li>
                ))}
                {day.items.length === 0 && (
                  <li className="muted">Este día no tiene ejercicios. Agrégalos en Programas o empieza y añádelos sobre la marcha.</li>
                )}
              </ol>
              <div className="today__actions">
                <button className="btn btn--primary btn--lg today__start" onClick={() => start({ program, dayId: day.id })} disabled={!!active}>
                  Empezar {day.name} <Icon name="arrow" />
                </button>
                <div className="cluster">
                  {program.days.length > 1 && (
                    <button className="btn btn--sm" onClick={() => setPickDay(true)} disabled={!!active}>
                      Otro día
                    </button>
                  )}
                  <button className="btn btn--sm" onClick={() => start()} disabled={!!active}>
                    Sesión libre
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">Hoy</span>
              <h1 id="toca-hoy" className="title-xl today__day">
                Sin programa activo
              </h1>
              <p className="lead">Elige un programa para que te diga qué día toca, o registra una sesión libre agregando ejercicios sobre la marcha.</p>
              <div className="cluster">
                <Link className="btn btn--primary" to="/programas">
                  Elegir programa
                </Link>
                <button className="btn" onClick={() => start()} disabled={!!active}>
                  Sesión libre
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="span-5 stack today__side" style={{ '--gap': '28px' } as React.CSSProperties}>
          <section aria-labelledby="semana">
            <div className="section-head">
              <h2 id="semana" className="eyebrow eyebrow--ink">
                Esta semana
              </h2>
              <span className="eyebrow mono">
                {thisWeek.length}
                {settings.questionnaire ? ` / ${settings.questionnaire.daysPerWeek}` : ''} sesiones
              </span>
            </div>
            <WeekStrip sessions={thisWeek} />
            <div style={{ marginTop: 16 }}>
              <WeekHeatmap sessions={recent} weeks={12} />
            </div>
          </section>

          <section aria-labelledby="ultima">
            <div className="section-head">
              <h2 id="ultima" className="eyebrow eyebrow--ink">
                Última sesión
              </h2>
              {last && (
                <Link to={`/historial/${last.id}`} className="link-btn small">
                  Ver
                </Link>
              )}
            </div>
            {last ? (
              <div className="stat-row" style={{ '--cols': 3 } as React.CSSProperties}>
                <div className="stat">
                  <span className="eyebrow">{fmtRelativeDay(last.startedAt)}</span>
                  <span className="title-sm">{last.dayName}</span>
                </div>
                <div className="stat">
                  <span className="eyebrow">Volumen</span>
                  <span className="num-md">
                    {fmtVolume(last.summary?.volumeKg ?? 0, settings.unit)}
                    <span className="unit">{settings.unit}</span>
                  </span>
                </div>
                <div className="stat">
                  <span className="eyebrow">Duración</span>
                  <span className="num-md">{fmtDuration(last.durationSec ?? 0)}</span>
                </div>
              </div>
            ) : (
              <p className="muted">Aún no terminas ninguna sesión. Al hacerlo verás aquí su resumen.</p>
            )}
          </section>

          <section aria-labelledby="prs">
            <div className="section-head">
              <h2 id="prs" className="eyebrow eyebrow--ink">
                Récords recientes
              </h2>
              <Link to="/progreso" className="link-btn small">
                Progreso
              </Link>
            </div>
            {prs.length ? (
              <ul className="list">
                {prs.map((p, i) => (
                  <PRRow key={i} pr={p} date={p.date} name={ex.get(p.exerciseId)?.name ?? ''} />
                ))}
              </ul>
            ) : (
              <p className="muted">Los récords aparecen cuando superas una marca anterior en un ejercicio.</p>
            )}
          </section>
        </aside>
      </div>

      {pickDay && program && (
        <Sheet title="¿Qué día quieres entrenar?" eyebrow={program.name} onClose={() => setPickDay(false)}>
          <div className="menu">
            {program.days.map((d, i) => (
              <button
                key={d.id}
                onClick={() => {
                  setPickDay(false);
                  start({ program, dayId: d.id });
                }}
              >
                <span className="mono small">{String(i + 1).padStart(2, '0')}</span>
                <span style={{ flex: 1 }}>{d.name}</span>
                {i === nextIdx && <span className="tag">Toca</span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function WeekStrip({ sessions }: { sessions: Session[] }) {
  const monday = startOfWeek(Date.now());
  const today = startOfDay(Date.now());
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return (
    <ol className="weekstrip" aria-label="Días entrenados esta semana">
      {labels.map((l, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const t = d.getTime();
        const done = sessions.some((s) => startOfDay(s.startedAt) === t);
        return (
          <li key={i} data-done={done || undefined} data-today={t === today || undefined} aria-label={`${fmtDateShort(t)}: ${done ? 'entrenaste' : 'sin sesión'}`}>
            <span>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PRRow({ pr, name, date }: { pr: PRHit; name: string; date?: number }) {
  const { unit } = useSettings();
  const value =
    pr.kind === 'reps'
      ? `${pr.value} reps × ${fmtWeight(pr.atWeightKg ?? 0, unit)} ${unit}`
      : pr.kind === 'volumen'
        ? `${fmtVolume(pr.value, unit)} ${unit}`
        : `${fmtWeight(pr.value, unit)} ${unit}`;
  return (
    <li className="pr-row">
      <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
        <span className="title-sm" style={{ fontSize: 15 }}>
          {name}
        </span>
        <span className="eyebrow">
          {PR_LABEL[pr.kind]}
          {date ? ` · ${fmtDateShort(date)}` : ''}
        </span>
      </span>
      <span className="mono pr-row__val">{value}</span>
    </li>
  );
}
