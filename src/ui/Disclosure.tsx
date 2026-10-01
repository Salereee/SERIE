import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../hooks/audio';
import { Icon } from './Icon';

/* ——— Memoria de secciones abiertas por pantalla (preferencia de este visor) ——— */

const PREFIX = 'serie:abiertos:';

function readMap(screen: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + screen) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeMap(screen: string, map: Record<string, boolean>) {
  try {
    localStorage.setItem(PREFIX + screen, JSON.stringify(map));
  } catch {
    /* modo privado o almacenamiento lleno: la preferencia simplemente no se recuerda */
  }
}

/**
 * Estado abierto/cerrado de varias secciones de una pantalla, recordado en localStorage.
 * `defaults` decide el estado inicial de las que el usuario nunca tocó.
 */
export function useOpenSections(screen: string, defaults: (id: string) => boolean) {
  const [map, setMap] = useState<Record<string, boolean>>(() => readMap(screen));
  const isOpen = useCallback((id: string) => map[id] ?? defaults(id), [map, defaults]);
  const setOpen = useCallback(
    (id: string, open: boolean) =>
      setMap((m) => {
        const next = { ...m, [id]: open };
        writeMap(screen, next);
        return next;
      }),
    [screen],
  );
  const setAll = useCallback(
    (ids: string[], open: boolean) =>
      setMap((m) => {
        const next = { ...m };
        for (const id of ids) next[id] = open;
        writeMap(screen, next);
        return next;
      }),
    [screen],
  );
  return { isOpen, setOpen, setAll };
}

/* ——— Sección desplegable ——— */

interface DisclosureProps {
  title: ReactNode;
  /** Resumen visible con la sección cerrada (conteos, progreso, última vez…). */
  summary?: ReactNode;
  /** Contenido a la derecha del encabezado, fuera del botón (p. ej. un menú). */
  aside?: ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
  /** Encabezado fijo al hacer scroll dentro de listas largas. */
  sticky?: boolean;
  /** Estilo del encabezado: sección (regla gruesa, etiqueta) o fila (lista de elementos). */
  variant?: 'section' | 'row';
  /** Montar el contenido solo después de abrir por primera vez (listas pesadas). */
  lazy?: boolean;
  className?: string;
  headerRef?: React.Ref<HTMLButtonElement>;
  id?: string;
}

/**
 * Acordeón accesible: <button aria-expanded aria-controls>, Enter/Espacio nativos,
 * altura animada con los tokens de movimiento (instantáneo con reducir movimiento).
 * El contenido cerrado queda `inert`: fuera del orden de tabulación y del lector de pantalla.
 */
export function Disclosure({ title, summary, aside, open, onToggle, children, sticky, variant = 'section', lazy, className = '', headerRef, id }: DisclosureProps) {
  const uid = useId();
  const panelId = `${uid}-panel`;
  const everOpened = useRef(open);
  if (open) everOpened.current = true;

  return (
    <section className={`disc disc--${variant}${sticky ? ' disc--sticky' : ''} ${className}`} data-open={open || undefined} id={id}>
      <div className="disc__head">
        <button
          ref={headerRef}
          type="button"
          className="disc__btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (!open) sfx('fold');
            onToggle(!open);
          }}
        >
          <span className="disc__title">{title}</span>
          {summary != null && <span className="disc__summary">{summary}</span>}
          <Icon name="down" size={18} className="disc__chev" />
        </button>
        {aside && <div className="disc__aside">{aside}</div>}
      </div>
      <div className="disc__panel" id={panelId} {...(open ? {} : { inert: '' })}>
        <div className="disc__inner">{!lazy || everOpened.current ? children : null}</div>
      </div>
    </section>
  );
}
