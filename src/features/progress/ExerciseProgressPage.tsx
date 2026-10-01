import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { useExerciseLogs, useSettings } from '../../db/hooks';
import { EQUIPMENT_LABEL, MUSCLE_LABEL, showsAdvancedMetrics } from '../../db/schema';
import { fmtDateFull, fmtDateShort } from '../../domain/format';
import { suggest } from '../../domain/progression';
import { computeRecords } from '../../domain/records';
import { fmtVolume, fmtWeight, toDisplay } from '../../domain/units';
import { Icon } from '../../ui/Icon';
import { Help } from '../../ui/Help';
import { ShowMore } from '../../ui/ShowMore';
import { LineChart, type Point } from './charts';
import './progress.css';

type Metric = '1rm' | 'peso';

export function ExerciseProgressPage() {
  const { exerciseId } = useParams();
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId!), [exerciseId], null);
  const logsDesc = useExerciseLogs(exerciseId);
  const settings = useSettings();
  const unit = settings.unit;
  const advanced = showsAdvancedMetrics(settings);
  const [chosen, setMetric] = useState<Metric>('1rm');
  // El 1RM estimado es una métrica técnica: el modo básico grafica el peso máximo.
  const metric: Metric = advanced ? chosen : 'peso';

  const logs = useMemo(() => [...(logsDesc ?? [])].reverse(), [logsDesc]);
  const rec = useMemo(() => computeRecords(logs), [logs]);

  const points: Point[] = useMemo(() => {
    let best = 0;
    return logs.map((l) => {
      const v = metric === '1rm' ? l.best1RM : l.topWeightKg;
      const highlight = v > best && best > 0;
      best = Math.max(best, v);
      return { t: l.date, v: toDisplay(v, unit), highlight, label: l.workSets.map((s) => `${fmtWeight(s.w, unit)}×${s.r}`).join(' · ') };
    });
  }, [logs, metric, unit]);

  const repRecords = useMemo(
    () => [...rec.repsByWeight.entries()].sort((a, b) => b[0] - a[0]).slice(0, 8),
    [rec],
  );

  const sug = useMemo(
    () =>
      exercise && logsDesc?.length
        ? suggest({
            logs: logsDesc,
            region: exercise.region,
            incrementUpperKg: settings.incrementUpperKg,
            incrementLowerKg: settings.incrementLowerKg,
            unit,
          })
        : null,
    [exercise, logsDesc, settings.incrementUpperKg, settings.incrementLowerKg, unit],
  );

  if (exercise === null || logsDesc === undefined) return null;
  if (!exercise) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty__title">Ejercicio no encontrado</span>
          <Link to="/progreso" className="btn">
            Volver a Progreso
          </Link>
        </div>
      </div>
    );
  }

  const nf = (v: number) => `${v.toLocaleString('es-MX', { maximumFractionDigits: 1 })}`;

  const hero = advanced
    ? { label: '1RM estimado', value: rec.best1RM, date: rec.best1RMDate }
    : { label: 'Peso máximo', value: rec.bestWeight, date: rec.bestWeightDate };

  return (
    <div className="page">
      <header className="page-head">
        <Link to="/progreso" className="btn btn--text back-link">
          <Icon name="left" size={18} /> Progreso
        </Link>
        <h1 className="title-xl">{exercise.name}</h1>
        <span className="eyebrow">
          {MUSCLE_LABEL[exercise.primaryMuscle]} · {EQUIPMENT_LABEL[exercise.equipment]}
        </span>
      </header>

      {logs.length === 0 ? (
        <div className="empty">
          <span className="empty__title">Aún no hay registros de este ejercicio</span>
          <p>Agrégalo a una sesión; después de la primera verás su peso máximo, récords y evolución.</p>
        </div>
      ) : (
        <>
          <div className="grid12" style={{ rowGap: 'var(--block-gap)' }}>
            <section className="span-8 stack" style={{ '--gap': '8px' } as React.CSSProperties} aria-label="Resumen y gráfica">
              <div className="card prog__hero">
                <span className="prog__heronum mono">
                  {fmtWeight(hero.value, unit)}
                  <span className="unit">{unit}</span>
                </span>
                <span className="prog__herolabel">
                  {hero.label}
                  {hero.date ? ` · ${fmtDateShort(hero.date)}` : ''} {advanced && <Help term="epley" always />}
                </span>
              </div>
              <div className="stat-row" style={{ '--cols': 2 } as React.CSSProperties}>
                {advanced ? (
                  <div className="stat">
                    <span className="num-lg">
                      {fmtWeight(rec.bestWeight, unit)}
                      <span className="unit">{unit}</span>
                    </span>
                    <span className="eyebrow">peso máximo</span>
                  </div>
                ) : (
                  <div className="stat">
                    <span className="num-lg">
                      {fmtVolume(rec.bestVolume, unit)}
                      <span className="unit">{unit}</span>
                    </span>
                    <span className="eyebrow">mejor volumen</span>
                  </div>
                )}
                <div className="stat">
                  <span className="num-lg">{rec.sessions}</span>
                  <span className="eyebrow">{rec.sessions === 1 ? 'sesión' : 'sesiones'}</span>
                </div>
              </div>
              <div className="card stack xp__chart" style={{ '--gap': '12px' } as React.CSSProperties}>
                {advanced ? (
                  <div className="seg" role="tablist" aria-label="Métrica">
                    <button role="tab" aria-selected={metric === '1rm'} onClick={() => setMetric('1rm')}>
                      1RM estimado
                    </button>
                    <button role="tab" aria-selected={metric === 'peso'} onClick={() => setMetric('peso')}>
                      Peso máximo
                    </button>
                  </div>
                ) : (
                  <h2 className="eyebrow eyebrow--ink">Peso máximo por sesión</h2>
                )}
                {points.length > 1 ? (
                  <LineChart points={points} format={(v) => `${nf(v)}`} title={`${metric === '1rm' ? '1RM estimado' : 'Peso máximo'} de ${exercise.name} en ${unit}`} />
                ) : (
                  <p className="muted">Con una sola sesión todavía no hay línea; vuelve después de la siguiente.</p>
                )}
                <p className="small muted">Valores en {unit}. Los puntos de color marcan récords.</p>
              </div>
            </section>

            <aside className="span-4 stack" style={{ '--gap': '24px' } as React.CSSProperties}>
              {sug && (
                <section className="note" aria-label="Sugerencia para la próxima sesión">
                  <span className="eyebrow">Próxima sesión</span>
                  <span className="num-md">
                    {fmtWeight(sug.weightKg, unit)} {unit} × {sug.reps}
                  </span>
                  <span className="small">{sug.reason}</span>
                </section>
              )}
              <section>
                <div className="section-head">
                  <h2 className="eyebrow eyebrow--ink">Más reps por peso</h2>
                </div>
                <ShowMore items={repRecords} limit={5} noun="pesos">
                  {(visible) => (
                <table className="reps-table">
                  <thead>
                    <tr>
                      <th scope="col">Peso</th>
                      <th scope="col" className="num">
                        Reps máx.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(([w, r]) => (
                      <tr key={w}>
                        <td className="mono">
                          {fmtWeight(w, unit)} {unit}
                        </td>
                        <td className="mono num">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  )}
                </ShowMore>
              </section>
            </aside>

            <section className="span-12" aria-labelledby="hist-ex">
              <div className="section-head">
                <h2 id="hist-ex" className="eyebrow eyebrow--ink">
                  Historial de sesiones
                </h2>
                <span>{logs.length}</span>
              </div>
              <ShowMore items={logsDesc} limit={5} noun="sesiones">
                {(visible) => (
              <ol>
                {visible.map((l) => (
                  <li key={l.id} className="xh">
                    <Link to={`/historial/${l.sessionId}`} className="xh__date tnum" title={fmtDateFull(l.date)}>
                      {fmtDateShort(l.date)}
                    </Link>
                    <span className="xh__sets mono">
                      {l.workSets.map((s, i) => (
                        <span key={i}>
                          {fmtWeight(s.w, unit)}×{s.r}
                        </span>
                      ))}
                    </span>
                    {advanced && <span className="mono small muted">{fmtWeight(l.best1RM, unit)}</span>}
                  </li>
                ))}
              </ol>
                )}
              </ShowMore>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
