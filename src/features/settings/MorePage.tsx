import { Link } from 'react-router-dom';
import { Icon } from '../../ui/Icon';
import './settings.css';

const ITEMS = [
  { to: '/historial', label: 'Historial', hint: 'Sesiones terminadas' },
  { to: '/biblioteca', label: 'Biblioteca', hint: 'Ejercicios y propios' },
  { to: '/ajustes', label: 'Ajustes', hint: 'Modo, unidad, respaldo' },
];

export function MorePage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title-lg">Más</h1>
      </header>
      <nav className="more-list list--top" style={{ borderTop: 'var(--b2)' }} aria-label="Más secciones">
        {ITEMS.map((it, i) => (
          <Link key={it.to} to={it.to}>
            <span className="mono small muted">{String(i + 1).padStart(2, '0')}</span>
            <span className="stack" style={{ '--gap': '0' } as React.CSSProperties}>
              {it.label}
              <span className="small muted" style={{ fontWeight: 400, letterSpacing: 0 }}>
                {it.hint}
              </span>
            </span>
            <Icon name="right" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
