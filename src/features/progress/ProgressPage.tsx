import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { useExerciseMap, useSettings } from '../../db/hooks';
import { MUSCLE_LABEL, type ExerciseLog, type Muscle, type Session } from '../../db/schema';
import { fmtDateShort, fmtRelativeDay, startOfWeek } from '../../domain/format';
import { fmtVolume, fmtWeight } from '../../domain/units';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Icon } from '../../ui/Icon';
import { BarList, Spark, WeekHeatmap } from './charts';
import './progress.css';

const WEEK = 7 * 86400000;

export function ProgressPage() {
  const { unit } = useSettings();
  const ex = useExerciseMap();
  const desktop = useMediaQuery('(min-width: 900px)');
  const sessions = useLiveQuery(() => db.sessions.where('status').equals('terminada').toArray(), [], undefined as Session[] | undefined);
  const logs = useLiveQuery(() => db.logs.toArray(), [], [] as ExerciseLog[]);
  const [weekOffset, setWeekOffset] = useState(0);

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
    const vol7 = ss.filter((s) => s.startedAt >= now - 7 * 86400000).reduce((a, s) => a + (s.summary?.volumeKg ?? 0), 0);
    return { last30, perWeek: last8w / 8, streak, vol7 };
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
      m.set(l.exerciseId, { n: c.n + 1, best: Math.max(c.best, l.best1RM), last: Math.max(c.last, l.date) });
    }
    return [...m.entries()].sort((a, b) => b[1].last - a[1].last);
  }, [logs]);

  if (!sessions) return null;

  if (sessions.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="title-lg">Progreso</h1>
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

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{sessions.length} sesiones registradas</span>
        <h1 className="title-lg">Progreso</h1>
      </header>

      <div className="stat-row prog__stats" style={{ '--cols': 4 } as React.CSSProperties}>
        <div className="stat">
          <span className="eyebrow">Últimos 30 días</span>
          <span className="num-lg">{stats.last30}</span>
          <span className="small muted">sesiones</span>
        </div>
        <div className="stat">
          <span className="eyebrow">Por semana</span>
          <span className="num-lg">{stats.perWeek.toLocaleString('es-MX', { maximumFractionDigits: 1 })}</span>
          <span className="small muted">promedio 8 semanas</span>
        </div>
        <div className="stat">
          <span className="eyebrow">Racha</span>
          <span className="num-lg">{stats.streak}</span>
          <span className="small muted">semanas seguidas</span>
        </div>
        <div className="stat">
          <span className="eyebrow">Volumen 7 días</span>
          <span className="num-lg">
            {fmtVolume(stats.vol7, unit)}
            <span className="unit">{unit}</span>
          </span>
        </div>
      </div>

      <div className="grid12 prog__grid">
        <section className="span-6" aria-labelledby="freq">
          <div className="section-head">
            <h2 id="freq" className="eyebrow eyebrow--ink">
              Frecuencia
            </h2>
            <span className="eyebrow">{desktop ? '26' : '16'} semanas</span>
          </div>
          <WeekHeatmap sessions={sessions} weeks={desktop ? 26 : 16} />
        </section>

        <section className="span-6" aria-labelledby="vol">
          <div className="section-head">
            <h2 id="vol" className="eyebrow eyebrow--ink">
              Volumen por grupo muscular
            </h2>
            <div className="weeknav">
              <button className="btn btn--ghost btn--icon" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Semana anterior">
                <Icon name="left" size={18} />
              </button>
              <span className="mono small" aria-live="polite">
                {weekOffset === 0 ? 'Esta semana' : `Sem. ${fmtDateShort(selWeek)}`}
              </span>
              <button className="btn btn--ghost btn--icon" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0} aria-label="Semana siguiente">
                <Icon name="right" size={18} />
              </button>
            </div>
          </div>
          {weekBars.length ? (
            <BarList bars={weekBars} format={(v) => `${fmtVolume(v, unit)} ${unit}`} />
          ) : (
            <p className="muted" style={{ padding: '12px 0' }}>
              Sin series esa semana.
            </p>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            Volumen = peso × reps de series efectivas, asignado al músculo principal. «s» = series.
          </p>
        </section>

        <section className="span-6" aria-labelledby="ejs">
          <div className="section-head">
            <h2 id="ejs" className="eyebrow eyebrow--ink">
              Por ejercicio
            </h2>
            <span className="eyebrow mono">{byExercise.length}</span>
          </div>
          <ul className="list">
            {byExercise.map(([id, v]) => (
              <li key={id}>
                <Link className="row-link" to={`/progreso/${id}`}>
                  <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                    <span className="row-link__title title-sm" style={{ fontSize: 16 }}>
                      {ex.get(id)?.name ?? id}
                    </span>
                    <span className="small muted">
                      {v.n} sesiones · {fmtRelativeDay(v.last)}
                    </span>
                  </span>
                  <span className="mono" title="1RM estimado">
                    {v.best > 0 ? `${fmtWeight(v.best, unit)} ${unit}` : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="span-6" aria-labelledby="tend">
          <div className="section-head">
            <h2 id="tend" className="eyebrow eyebrow--ink">
              Series por semana · 8 semanas
            </h2>
          </div>
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
              {muscleWeeks.map(([muscle, v]) => (
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
        </section>
      </div>
    </div>
  );
}
