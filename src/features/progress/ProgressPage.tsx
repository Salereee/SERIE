import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { useExerciseMap, useSettings } from '../../db/hooks';
import { MUSCLE_LABEL, showsAdvancedMetrics, type ExerciseLog, type Muscle, type Session } from '../../db/schema';
import { fmtDateShort, fmtRelativeDay, startOfWeek } from '../../domain/format';
import { fmtVolume, fmtWeight } from '../../domain/units';
import { Icon } from '../../ui/Icon';
import { ShowMore } from '../../ui/ShowMore';
import { ExercisePicker } from '../library/ExercisePicker';
import { BarList, Spark, WeekBars } from './charts';
import './progress.css';
import { PROGRESO_NAV, SegNav } from '../../ui/SegNav';
import { Help } from '../../ui/Help';
import { Disclosure, useOpenSections } from '../../ui/Disclosure';
import { PRRow } from '../../ui/PRRow';

const WEEK = 7 * 86400000;
const closedByDefault = () => false;

export function ProgressPage() {
  const settings = useSettings();
  const { unit } = settings;
  const advanced = showsAdvancedMetrics(settings);
  const ex = useExerciseMap();
  const folds = useOpenSections('progreso', closedByDefault);
  const sessions = useLiveQuery(() => db.sessions.where('status').equals('terminada').toArray(), [], undefined as Session[] | undefined);
  const logs = useLiveQuery(() => db.logs.toArray(), [], [] as ExerciseLog[]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [picking, setPicking] = useState(false);
  const navigate = useNavigate();

  const now = Date.now();
  const thisWeek = startOfWeek(now);
  const selWeek = thisWeek - weekOffset * WEEK;

  const stats = useMemo(() => {
    const ss = sessions ?? [];
    const last30 = ss.filter((s) => s.startedAt >= now - 30 * 86400000).length;
    const last8w = ss.filter((s) => s.startedAt >= thisWeek - 7 * WEEK).length;
    let streak = 0;
    for (let w = thisWeek; ; w -= WEEK) {
      const has = ss.some((s) => s.startedAt >= w && s.startedAt < w + WEEK);
      if (has) streak++;
      else if (w !== thisWeek) break; // la semana en curso aún puede llenarse
      if (streak > 520) break;
    }
    return { last30, perWeek: last8w / 8, streak };
  }, [sessions, now, thisWeek]);

  // Volumen y series por grupo muscular (músculo principal), últimas 8 semanas.
  const muscleWeeks = useMemo(() => {
    const m = new Map<Muscle, { vol: number[]; sets: number[] }>();
    for (const l of logs) {
      const e = ex.get(l.exerciseId);
      if (!e) continue;
      const w = Math.floor((thisWeek - startOfWeek(l.date)) / WEEK);
      if (w < 0 || w > 7 + weekOffset) continue;
      const idx = w - weekOffset;
      if (idx < 0 || idx > 7) continue;
      const cur = m.get(e.primaryMuscle) ?? { vol: Array(8).fill(0), sets: Array(8).fill(0) };
      cur.vol[7 - idx] += l.volumeKg;
      cur.sets[7 - idx] += l.workSets.length;
      m.set(e.primaryMuscle, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].sets[7] - a[1].sets[7] || b[1].vol[7] - a[1].vol[7]);
  }, [logs, ex, thisWeek, weekOffset]);

  const byExercise = useMemo(() => {
    const m = new Map<string, { n: number; best: number; last: number }>();
    for (const l of logs) {
      const c = m.get(l.exerciseId) ?? { n: 0, best: 0, last: 0 };
      m.set(l.exerciseId, { n: c.n + 1, best: Math.max(c.best, advanced ? l.best1RM : l.topWeightKg), last: Math.max(c.last, l.date) });
    }
    return [...m.entries()].sort((a, b) => b[1].last - a[1].last);
  }, [logs, advanced]);

  if (!sessions) return null;

  if (sessions.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="title-xl">Progreso</h1>
          <SegNav items={PROGRESO_NAV} label="Progreso" />
        </header>
        <div className="empty">
          <span className="empty__title">Sin datos para graficar</span>
          <p>
            Termina tu primera sesión y aquí verás tu frecuencia semanal, el volumen por grupo muscular y la evolución de cada
            ejercicio. Para probar la app sin entrenar semanas, carga el historial de ejemplo en Ajustes.
          </p>
          <div className="cluster">
            <Link className="btn btn--primary" to="/">
              Ir a Hoy
            </Link>
            <Link className="btn" to="/ajustes#datos">
              Cargar datos de ejemplo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const weekBars = muscleWeeks
    .filter(([, v]) => v.sets[7] > 0)
    .map(([muscle, v]) => ({ key: muscle, label: MUSCLE_LABEL[muscle], value: v.vol[7], sub: `${v.sets[7]} s` }));
  const maxSpark = Math.max(1, ...muscleWeeks.flatMap(([, v]) => v.sets));

  const prs = [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .flatMap((x) => (x.summary?.prs ?? []).filter((p) => p.kind !== 'volumen').map((p) => ({ ...p, date: x.startedAt })))
    .slice(0, 3);

  return (
    <div className="page prog">
      <header className="page-head">
        <h1 className="title-xl">Progreso</h1>
        <SegNav items={PROGRESO_NAV} label="Progreso" />
      </header>

      <div className="grid12 prog__grid">
        <div className="span-6 stack prog__col" style={{ '--gap': '8px' } as React.CSSProperties}>
          <section className="card prog__hero" aria-label="Sesiones en los últimos 30 días">
            <span className="prog__heronum mono">{stats.last30}</span>
            <span className="prog__herolabel">{stats.last30 === 1 ? 'sesión' : 'sesiones'} en los últimos 30 días</span>
          </section>
          <div className="stat-row" style={{ '--cols': 2 } as React.CSSProperties}>
            <div className="stat">
              <span className="num-lg">{stats.perWeek.toLocaleString('es-MX', { maximumFractionDigits: 1 })}</span>
              <span className="eyebrow">por semana</span>
            </div>
            <div className="stat">
              <span className="num-lg">{stats.streak}</span>
              <span className="eyebrow">{stats.streak === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
            </div>
          </div>
          <section className="card prog__weeks" aria-labelledby="freq">
            <div className="section-head">
              <h2 id="freq" className="eyebrow eyebrow--ink">
                Sesiones por semana
              </h2>
              <span>12 semanas</span>
            </div>
            <WeekBars sessions={sessions} weeks={12} />
          </section>
        </div>

        <div className="span-6 stack prog__col" style={{ '--gap': 'var(--block-gap)' } as React.CSSProperties}>
          <section aria-labelledby="prs">
            <div className="section-head">
              <h2 id="prs" className="eyebrow eyebrow--ink">
                Récords recientes <Help term="records" />
              </h2>
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

          <section aria-labelledby="ejs">
            <div className="section-head">
              <h2 id="ejs" className="eyebrow eyebrow--ink">
                Por ejercicio
              </h2>
              <button className="link-btn" onClick={() => setPicking(true)}>
                Buscar
              </button>
            </div>
            <ShowMore items={byExercise} limit={5} noun="ejercicios">
              {(visible) => (
                <ul className="list">
                  {visible.map(([id, v]) => (
                    <li key={id}>
                      <Link className="row-link" to={`/progreso/${id}`}>
                        <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                          <span className="row-link__title">{ex.get(id)?.name ?? id}</span>
                          <span className="eyebrow">
                            {v.n} sesiones · {fmtRelativeDay(v.last)}
                          </span>
                        </span>
                        <span className="mono" title={advanced ? '1RM estimado' : 'Peso máximo'}>
                          {v.best > 0 ? `${fmtWeight(v.best, unit)} ${unit}` : '—'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ShowMore>
          </section>

          <div>
            <Disclosure
              title="Volumen por grupo muscular"
              summary={weekOffset === 0 ? 'Esta semana' : `Sem. ${fmtDateShort(selWeek)}`}
              open={folds.isOpen('volumen')}
              onToggle={(o) => folds.setOpen('volumen', o)}
              lazy
            >
              <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
                <div className="weeknav">
                  <button className="btn btn--ghost btn--icon" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Semana anterior">
                    <Icon name="left" size={18} />
                  </button>
                  <span className="tnum" aria-live="polite">
                    {weekOffset === 0 ? 'Esta semana' : `Semana del ${fmtDateShort(selWeek)}`}
                  </span>
                  <button className="btn btn--ghost btn--icon" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0} aria-label="Semana siguiente">
                    <Icon name="right" size={18} />
                  </button>
                </div>
                {weekBars.length ? <BarList bars={weekBars} format={(v) => `${fmtVolume(v, unit)} ${unit}`} /> : <p className="muted">Sin series esa semana.</p>}
                <p className="small muted">
                  Volumen = peso × reps de series efectivas, asignado al músculo principal. «s» = series. <Help term="volumen" />
                </p>
              </div>
            </Disclosure>
            <Disclosure title="Series por grupo · 8 semanas" open={folds.isOpen('series')} onToggle={(o) => folds.setOpen('series', o)} lazy>
              <ShowMore items={muscleWeeks} limit={6} noun="grupos">
                {(visible) => (
                  <table className="trend">
                    <thead>
                      <tr>
                        <th scope="col">Grupo</th>
                        <th scope="col">Tendencia</th>
                        <th scope="col" className="num">
                          Sem.
                        </th>
                        <th scope="col" className="num">
                          Prom.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(([muscle, v]) => (
                        <tr key={muscle}>
                          <th scope="row">{MUSCLE_LABEL[muscle]}</th>
                          <td>
                            <Spark values={v.sets} max={maxSpark} />
                          </td>
                          <td className="mono num">{v.sets[7]}</td>
                          <td className="mono num muted">{(v.sets.reduce((a, b) => a + b, 0) / 8).toLocaleString('es-MX', { maximumFractionDigits: 1 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ShowMore>
            </Disclosure>
          </div>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          title="Ver progreso de…"
          onlyIds={byExercise.map(([id]) => id)}
          onClose={() => setPicking(false)}
          onPick={(e) => navigate(`/progreso/${e.id}`)}
        />
      )}
    </div>
  );
}
