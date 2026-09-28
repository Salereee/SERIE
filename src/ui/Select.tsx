import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  /** Texto del botón (por defecto, la etiqueta de la opción elegida). */
  display?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Selector desplegable para elegir una opción entre varias.
 * Celular: hoja inferior con opciones grandes. Escritorio: lista anclada al botón que se abre
 * hacia arriba si no cabe abajo. Teclado: ↑↓, Inicio/Fin, Enter, Esc; el foco vuelve al botón.
 */
export function Select<T extends string>({ label, value, options, onChange, display, className = '', size = 'sm' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery('(min-width: 900px)');
  const btn = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);

  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`selectbtn selectbtn--${size} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? 'sin elegir'}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="selectbtn__text">{display ?? current?.label ?? 'Elegir'}</span>
        <Icon name="down" size={16} className="selectbtn__chev" />
      </button>
      {open &&
        (desktop ? (
          <Popover anchor={btn} label={label} value={value} options={options} onChoose={choose} onClose={() => setOpen(false)} />
        ) : (
          <Sheet title={label} onClose={() => setOpen(false)}>
            <div className="menu" role="listbox" aria-label={label}>
              {options.map((o) => (
                <button key={o.value} role="option" aria-selected={o.value === value} className="opt" onClick={() => choose(o.value)}>
                  <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                    <span>{o.label}</span>
                    {o.hint && <span className="small muted opt__hint">{o.hint}</span>}
                  </span>
                  {o.value === value && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </Sheet>
        ))}
    </>
  );
}

function Popover<T extends string>({
  anchor,
  label,
  value,
  options,
  onChoose,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChoose: (v: T) => void;
  onClose: () => void;
}) {
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);

  // Posición: debajo del botón; si no cabe, arriba. Nunca fuera de la pantalla.
  useLayoutEffect(() => {
    const r = anchor.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const width = Math.max(r.width, 220);
    const left = Math.min(r.left, window.innerWidth - width - 12);
    if (below >= 240 || below >= above) setPos({ left, top: r.bottom + 4, width, maxHeight: below });
    else setPos({ left, bottom: window.innerHeight - r.top + 4, width, maxHeight: above });
  }, [anchor]);

  useEffect(() => {
    ref.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScroll);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={ref}
      className="popover"
      role="listbox"
      aria-label={label}
      tabIndex={-1}
      aria-activedescendant={`${listId}-${active}`}
      style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: Math.min(pos.maxHeight, 360) }}
      data-up={pos.bottom != null || undefined}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1));
        else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
        else if (e.key === 'Home') setActive(0);
        else if (e.key === 'End') setActive(options.length - 1);
        else if (e.key === 'Enter' || e.key === ' ') onChoose(options[active].value);
        else if (e.key === 'Escape' || e.key === 'Tab') {
          onClose();
          anchor.current?.focus();
        } else return;
        e.preventDefault();
      }}
    >
      {options.map((o, i) => (
        <div
          key={o.value}
          id={`${listId}-${i}`}
          role="option"
          aria-selected={o.value === value}
          className="opt"
          data-active={i === active || undefined}
          onMouseEnter={() => setActive(i)}
          onClick={() => onChoose(o.value)}
        >
          <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
            <span>{o.label}</span>
            {o.hint && <span className="small muted opt__hint">{o.hint}</span>}
          </span>
          {o.value === value && <Icon name="check" size={16} />}
        </div>
      ))}
    </div>,
    document.body,
  );
}
