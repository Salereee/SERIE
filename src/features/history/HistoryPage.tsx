import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import type { Session } from '../../db/schema';
import { fmtDuration, fmtMonthYear } from '../../domain/format';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { ShowMore } from '../../ui/ShowMore';
import { deleteFinishedSession } from '../session/actions';
import { SessionReport } from '../session/SummaryPage';
import '../session/summary.css';
import { PROGRESO_NAV, SegNav } from '../../ui/SegNav';
import '../progress/progress.css';
import './history.css';

export function HistoryPage() {
  const { id } = useParams();
  const desktop = useMediaQuery('(min-width: 900px)');
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().filter((s) => s.status === 'terminada').toArray(), [], undefined);
  const selected = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id]);

  if (!sessions) return null;

  // En celular, el detalle ocupa la pantalla completa.
  if (!desktop && id) {
    return (
      <div className="page">
        <Link to="/historial" className="btn btn--text back-link">
          <Icon name="left" size={18} /> Historial
        </Link>
        {selected ? <Detail session={selected} /> : <p className="muted">Sesión no encontrada.</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title-xl">Progreso</h1>
        <SegNav items={PROGRESO_NAV} label="Progreso" />
      </header>
      {sessions.length === 0 ? (
        <div className="empty">
          <span className="empty__title">Sin sesiones todavía</span>
          <p>Cuando termines tu primera sesión aparecerá aquí con su volumen, duración y récords.</p>
          <Link className="btn btn--primary" to="/">
            Ir a Hoy
          </Link>
        </div>
      ) : (
        <div className="grid12">
          <div className="span-5">
            <SessionList sessions={sessions} selectedId={desktop ? id : undefined} />
          </div>
          <div className="span-7 desktop-only">
            {selected ? (
              <Detail session={selected} />
            ) : (
              <div className="empty">
                <span className="empty__title">Elige una sesión</span>
                <p>Verás cada ejercicio con sus series, el volumen y los récords conseguidos.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function monthLabel(t: number) {
  const now = new Date();
  const d = new Date(t);
  const m = d.toLocaleDateString('es-MX', { month: 'long' });
  const label = d.getFullYear() === now.getFullYear() ? m : fmtMonthYear(t);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function SessionList({ sessions, selectedId }: { sessions: Session[]; selectedId?: string }) {
  const groups: { key: string; label: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const key = fmtMonthYear(s.startedAt);
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.items.push(s);
    else groups.push({ key, label: monthLabel(s.startedAt), items: [s] });
  }

  return (
    <div className="stack" style={{ '--gap': 'var(--block-gap)' } as React.CSSProperties}>
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <div className="section-head">
            <h2 className="eyebrow eyebrow--ink">
              {g.label} <span className="muted tnum">· {g.items.length} {g.items.length === 1 ? 'sesión' : 'sesiones'}</span>
            </h2>
          </div>
          <ShowMore items={g.items} limit={6} noun="sesiones">
            {(visible) => (
              <ul className="hcards">
                {visible.map((s) => {
                  const d = new Date(s.startedAt);
                  const prs = s.summary?.prs.length ?? 0;
                  return (
                    <li key={s.id}>
                      <Link to={`/historial/${s.id}`} className="hrow" aria-current={s.id === selectedId || undefined}>
                        <span className="hrow__date">
                          <span className="mono">{d.getDate()}</span>
                          <span>{d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}</span>
                        </span>
                        <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                          <span className="hrow__title">{s.dayName}</span>
                          <span className="eyebrow">
                            {fmtDuration(s.durationSec ?? 0)} · {s.summary?.setsDone ?? 0} series
                          </span>
                        </span>
                        {prs > 0 && <span className="hrow__pr tnum">{prs} PR</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </ShowMore>
        </section>
      ))}
    </div>
  );
}

function Detail({ session }: { session: Session }) {
  const { confirm, toast } = useFeedback();
  const navigate = useNavigate();
  const remove = async () => {
    const ok = await confirm({
      title: '¿Borrar esta sesión?',
      body: 'Se quitará del historial, de las gráficas y de los récords.',
      confirmLabel: 'Borrar sesión',
      danger: true,
    });
    if (!ok) return;
    const undo = await deleteFinishedSession(session.id);
    navigate('/historial');
    toast({ message: 'Sesión borrada', onAction: undo });
  };
  return (
    <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
      <SessionReport session={session} />
      <div>
        <button className="btn btn--sm btn--danger" onClick={remove}>
          <Icon name="trash" size={16} /> Borrar sesión
        </button>
      </div>
    </div>
  );
}
