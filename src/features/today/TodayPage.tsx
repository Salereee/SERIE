import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { useActiveProgram, useActiveSession, useExerciseMap, useSettings } from '../../db/hooks';
import type { Session } from '../../db/schema';
import { fmtClock, fmtDateShort, startOfDay, startOfWeek } from '../../domain/format';
import { nextDayIndex } from '../../domain/nextDay';
import { Icon } from '../../ui/Icon';
import { BackupReminder } from '../settings/BackupReminder';
import { Sheet } from '../../ui/Sheet';
import { useStartSession } from '../session/useStartSession';
import './today.css';

/** Ejercicios visibles antes de "+ N ejercicios más". */
const PREVIEW = 3;

/** Hoy responde una sola pregunta: ¿qué entreno? */
export function TodayPage() {
  const settings = useSettings();
  const program = useActiveProgram();
  const active = useActiveSession();
  const ex = useExerciseMap();
  const start = useStartSession();
  const [pickDay, setPickDay] = useState(false);
  const [allItems, setAllItems] = useState(false);
  const recent = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'terminada').limit(40).toArray(), [], [] as Session[]);

  const nextIdx = program ? nextDayIndex(program, recent) : -1;
  const day = program && nextIdx >= 0 ? program.days[nextIdx] : undefined;
  const weekStart = startOfWeek(Date.now());
  const thisWeek = recent.filter((s) => s.startedAt >= weekStart);
  const target = settings.questionnaire?.daysPerWeek;
  const totalSets = day?.items.reduce((n, it) => n + (it.targetSets ?? 0), 0) ?? 0;
  const items = day ? (allItems ? day.items : day.items.slice(0, PREVIEW)) : [];
  const hidden = day ? day.items.length - PREVIEW : 0;

  return (
    <div className={`page today${day && !active ? ' today--cta' : ''}`}>
      {active && (
        <Link to="/sesion" className="today__live">
          <span className="today__livedot" aria-hidden="true" />
          <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
            <span className="eyebrow">Sesión en curso · {fmtClock((Date.now() - active.startedAt) / 1000)}</span>
            <span className="title-sm">{active.dayName}</span>
          </span>
          <span className="btn btn--sm btn--primary">Continuar</span>
        </Link>
      )}

      <BackupReminder />

      {program && day ? (
        <>
          <header className="today__head">
            <span className="eyebrow">Hoy toca</span>
            <h1 className="title-xl today__day">{day.name}</h1>
            <span className="eyebrow">
              {day.items.length} {day.items.length === 1 ? 'ejercicio' : 'ejercicios'} · {totalSets} series
            </span>
          </header>

          <WeekDots sessions={thisWeek} target={target} />

          <section className="card today__card" aria-label={`Ejercicios de ${day.name}`}>
            {day.items.length ? (
              <ul className="today__items">
                {items.map((it) => (
                  <li key={it.id}>
                    <span className="today__ex">{ex.get(it.exerciseId)?.name ?? it.exerciseId}</span>
                    <span className="today__rx tnum">
                      {it.targetSets} × {it.repMin}–{it.repMax}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Este día no tiene ejercicios. Agrégalos en Rutinas o empieza y añádelos sobre la marcha.</p>
            )}
            {hidden > 0 && (
              <button className="btn btn--text today__more" aria-expanded={allItems} onClick={() => setAllItems(!allItems)}>
                {allItems ? 'Ver menos' : `+ ${hidden} ${hidden === 1 ? 'ejercicio más' : 'ejercicios más'}`}
              </button>
            )}
          </section>

          {!active && (
            <div className="today__cta">
              <button className="btn btn--primary btn--block" onClick={() => start({ program, dayId: day.id })}>
                Empezar {day.name}
              </button>
              <button className="btn btn--text btn--block" onClick={() => setPickDay(true)}>
                Cambiar de día
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <header className="today__head">
            <span className="eyebrow">Hoy</span>
            <h1 className="title-xl today__day">Sin programa activo</h1>
          </header>
          <p className="lead">Elige un programa para que te diga qué día toca, o registra una sesión libre agregando ejercicios sobre la marcha.</p>
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            <Link className="btn btn--primary btn--block" to="/programas">
              Elegir programa
            </Link>
            <button className="btn btn--block" onClick={() => start()} disabled={!!active}>
              Sesión libre
            </button>
          </div>
        </>
      )}

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
                <span style={{ flex: 1 }}>{d.name}</span>
                {i === nextIdx && <span className="tag">Toca hoy</span>}
              </button>
            ))}
            <button
              onClick={() => {
                setPickDay(false);
                start();
              }}
            >
              <Icon name="plus" />
              <span style={{ flex: 1 }}>Sesión libre</span>
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** La semana en siete puntos: hecho = tinta, hoy = anillo de acento, sin entrenar = relleno. */
function WeekDots({ sessions, target }: { sessions: Session[]; target?: number }) {
  const monday = startOfWeek(Date.now());
  const today = startOfDay(Date.now());
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const n = sessions.length;
  return (
    <section className="week" aria-label="Esta semana">
      <ol className="week__dots">
        {labels.map((l, i) => {
          const d = new Date(monday);
          d.setDate(d.getDate() + i);
          const t = d.getTime();
          const done = sessions.some((s) => startOfDay(s.startedAt) === t);
          return (
            <li key={i} data-done={done || undefined} data-today={t === today || undefined} aria-label={`${fmtDateShort(t)}: ${done ? 'entrenaste' : 'sin sesión'}`}>
              <span aria-hidden="true">{l}</span>
              <i aria-hidden="true" />
            </li>
          );
        })}
      </ol>
      <span className="week__count tnum">
        {target ? `${n} de ${target}` : n} {(target ?? n) === 1 ? 'sesión' : 'sesiones'}
      </span>
    </section>
  );
}
