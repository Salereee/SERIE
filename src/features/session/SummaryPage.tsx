import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { useExerciseMap, useSettings } from '../../db/hooks';
import { showsEffort, type Session } from '../../db/schema';
import { fmtDateLong, fmtDuration, fmtTime } from '../../domain/format';
import { setsVolume, workSets } from '../../domain/logs';
import { fmtVolume, fmtWeight } from '../../domain/units';
import { CountUp } from '../../ui/CountUp';
import { Meta } from '../../ui/Meta';
import { Icon } from '../../ui/Icon';
import { PRRow } from '../today/TodayPage';
import '../today/today.css';
import './summary.css';
import { Help } from '../../ui/Help';

export function SummaryPage() {
  const { id } = useParams();
  const session = useLiveQuery(() => db.sessions.get(id!), [id], null);
  if (session === null) return null;
  if (!session || session.status !== 'terminada') {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty__title">Sesión no encontrada</span>
          <Link to="/" className="btn">
            Ir a Hoy
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <SessionReport session={session} headline />
      <div className="cluster">
        <Link to="/" className="btn btn--primary btn--lg">
          Listo <Icon name="arrow" />
        </Link>
        <Link to={`/historial/${session.id}`} className="btn btn--lg">
          Ver en historial
        </Link>
      </div>
    </div>
  );
}

/** Resumen reutilizable (pantalla final e historial). */
export function SessionReport({ session, headline }: { session: Session; headline?: boolean }) {
  const settings = useSettings();
  const { unit } = settings;
  const effort = showsEffort(settings);
  const ex = useExerciseMap();
  const prs = session.summary?.prs ?? [];
  const prIds = new Set(prs.map((p) => p.exerciseId));

  return (
    <div className="report">
      <header className="page-head">
        <Meta parts={[headline && 'Sesión terminada', fmtDateLong(session.startedAt), fmtTime(session.startedAt)]} />
        <h1 className={headline ? 'title-xl' : 'title-lg'}>{session.dayName}</h1>
      </header>

      <div className="stat-row report__stats" style={{ '--cols': 4 } as React.CSSProperties}>
        <div className="stat">
          <span className="eyebrow">Duración</span>
          <span className="num-lg">{fmtDuration(session.durationSec ?? 0)}</span>
        </div>
        <div className="stat">
          <span className="eyebrow">Volumen <Help term="volumen" /></span>
          <span className="num-lg">
            {headline ? <CountUp value={session.summary?.volumeKg ?? 0} format={(n) => fmtVolume(n, unit)} delay={120} /> : fmtVolume(session.summary?.volumeKg ?? 0, unit)}
            <span className="unit">{unit}</span>
          </span>
        </div>
        <div className="stat">
          <span className="eyebrow">Series</span>
          <span className="num-lg">{headline ? <CountUp value={session.summary?.setsDone ?? 0} delay={160} /> : session.summary?.setsDone ?? 0}</span>
        </div>
        <div className="stat" data-accent={prs.length > 0 || undefined}>
          <span className="eyebrow">Récords</span>
          <span className="num-lg">{headline ? <CountUp value={prs.length} delay={200} /> : prs.length}</span>
        </div>
      </div>

      <div className="grid12">
        <section className={prs.length ? 'span-5' : 'span-12'} aria-labelledby="prs-title" hidden={!prs.length}>
          <div className="section-head report__prhead">
            <h2 id="prs-title" className="eyebrow eyebrow--ink">
              Récords conseguidos
            </h2>
          </div>
          <ul className="list report__prs">
            {prs.map((p, i) => (
              <PRRow key={i} pr={p} name={ex.get(p.exerciseId)?.name ?? ''} />
            ))}
          </ul>
        </section>
        <section className={prs.length ? 'span-7' : 'span-12'} aria-labelledby="ej-title">
          <div className="section-head">
            <h2 id="ej-title" className="eyebrow eyebrow--ink">
              Ejercicios
            </h2>
            <span className="eyebrow mono">{session.exercises.length}</span>
          </div>
          <table className="report__table">
            <thead>
              <tr>
                <th scope="col">Ejercicio</th>
                <th scope="col">Series ({unit} × reps)</th>
                <th scope="col" className="num">
                  Volumen
                </th>
              </tr>
            </thead>
            <tbody>
              {session.exercises.map((e) => (
                <tr key={e.id}>
                  <th scope="row">
                    <Link to={`/progreso/${e.exerciseId}`}>{ex.get(e.exerciseId)?.name ?? e.exerciseId}</Link>
                    {prIds.has(e.exerciseId) && <span className="tag tag--accent" style={{ marginLeft: 8 }}>PR</span>}
                  </th>
                  <td className="mono">
                    {e.sets.map((s) => (
                      <span key={s.id} className={s.isWarmup ? 'report__warm' : undefined} title={s.isWarmup ? 'Calentamiento' : undefined}>
                        {fmtWeight(s.weightKg, unit)}×{s.reps}
                        {effort && s.rir != null ? ` @${s.rir}` : ''}
                      </span>
                    ))}
                  </td>
                  <td className="mono num">{fmtVolume(setsVolume(workSets(e.sets)), unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 8 }}>
            Calentamientos en gris; no cuentan para volumen ni récords.{effort && session.exercises.some((e) => e.sets.some((s) => s.rir != null)) && ' @n = RIR.'}
          </p>
        </section>
      </div>

      {session.notes && (
        <section>
          <div className="section-head">
            <span className="eyebrow eyebrow--ink">Notas</span>
          </div>
          <p className="lead" style={{ whiteSpace: 'pre-wrap' }}>
            {session.notes}
          </p>
        </section>
      )}
    </div>
  );
}
