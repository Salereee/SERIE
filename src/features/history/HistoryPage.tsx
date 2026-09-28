import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { useSettings } from '../../db/hooks';
import type { Session } from '../../db/schema';
import { fmtDuration, fmtMonthYear } from '../../domain/format';
import { fmtVolume } from '../../domain/units';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { deleteFinishedSession } from '../session/actions';
import { SessionReport } from '../session/SummaryPage';
import '../session/summary.css';
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
        <Link to="/historial" className="link-btn small" style={{ width: 'fit-content' }}>
          <Icon name="left" size={16} /> Historial
        </Link>
        {selected ? <Detail session={selected} /> : <p className="muted">Sesión no encontrada.</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{sessions.length} sesiones terminadas</span>
        <h1 className="title-lg">Historial</h1>
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

function SessionList({ sessions, selectedId }: { sessions: Session[]; selectedId?: string }) {
  const { unit } = useSettings();
  const groups: { label: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const label = fmtMonthYear(s.startedAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(s);
    else groups.push({ label, items: [s] });
  }
  return (
    <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <div className="section-head">
            <h2 className="eyebrow eyebrow--ink">{g.label}</h2>
            <span className="eyebrow mono">{g.items.length}</span>
          </div>
          <ul className="list">
            {g.items.map((s) => {
              const d = new Date(s.startedAt);
              return (
                <li key={s.id}>
                  <Link to={`/historial/${s.id}`} className="hrow" aria-current={s.id === selectedId || undefined}>
                    <span className="hrow__date">
                      <span className="num-md">{String(d.getDate()).padStart(2, '0')}</span>
                      <span className="eyebrow">{d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')}</span>
                    </span>
                    <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                      <span className="hrow__title">{s.dayName}</span>
                      <span className="small muted mono">
                        {fmtDuration(s.durationSec ?? 0)} · {fmtVolume(s.summary?.volumeKg ?? 0, unit)} {unit} · {s.summary?.setsDone ?? 0} series
                      </span>
                    </span>
                    {(s.summary?.prs.length ?? 0) > 0 && <span className="tag tag--accent">{s.summary!.prs.length} PR</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
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
        <button className="btn btn--danger btn--sm" onClick={remove}>
          <Icon name="trash" size={16} /> Borrar sesión
        </button>
      </div>
    </div>
  );
}
