import { Link, useLocation } from 'react-router-dom';

/** Control segmentado que navega entre pantallas hermanas (Programas | Ejercicios, Resumen | Historial). */
export function SegNav({ items, label }: { items: { to: string; label: string }[]; label: string }) {
  const { pathname } = useLocation();
  return (
    <nav className="seg segnav" aria-label={label}>
      {items.map((it) => (
        <Link key={it.to} to={it.to} replace aria-current={pathname === it.to || pathname.startsWith(it.to + '/') ? 'page' : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export const RUTINAS_NAV = [
  { to: '/programas', label: 'Programas' },
  { to: '/biblioteca', label: 'Ejercicios' },
];
export const PROGRESO_NAV = [
  { to: '/progreso', label: 'Resumen' },
  { to: '/historial', label: 'Historial' },
];
