import { Link } from 'react-router-dom';
import type { Session } from '../../db/schema';
import { fmtClock } from '../../domain/format';
import { useNow } from '../../hooks/useNow';

/** Recordatorio de sesión en curso cuando navegas a otra pantalla. Incluye el descanso restante. */
export function LiveBar({ session }: { session: Session }) {
  const now = useNow(500);
  const t = session.restTimer;
  const rem = t ? Math.ceil((t.endsAt - now) / 1000) : null;
  return (
    <Link to="/sesion" className="live-bar" aria-label={`Volver a la sesión ${session.dayName}`}>
      <span className="cluster" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
        <span className="live-bar__dot" aria-hidden="true" />
        <span className="title-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.dayName}
        </span>
      </span>
      <span className="mono" style={{ whiteSpace: 'nowrap' }}>
        {rem != null ? (rem > 0 ? `Descanso ${fmtClock(rem)}` : 'Descanso listo') : fmtClock((now - session.startedAt) / 1000)}
        {'  →'}
      </span>
    </Link>
  );
}
