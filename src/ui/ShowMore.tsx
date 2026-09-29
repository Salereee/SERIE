import { useId, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../hooks/audio';
import { Icon } from './Icon';

interface Props<T> {
  items: T[];
  /** Cuántos se ven antes de "Ver todos". */
  limit?: number;
  /** Arma la lista con los elementos visibles (se respeta el marcado de cada pantalla: ul, ol, tbody…). */
  children: (visible: T[]) => ReactNode;
  /** Sustantivo para el botón: "Ver los 21 ejercicios". */
  noun?: string;
  className?: string;
}

/**
 * Lista larga recortada: los primeros elementos, el borde inferior desvanecido (mask, sin colores:
 * funciona en ambos temas) y un botón para ver todo. Si solo sobrarían 1 o 2, se muestra completa:
 * esconder tan poco estorba más de lo que ayuda.
 */
export function ShowMore<T>({ items, limit = 5, children, noun = 'elementos', className = '' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const cuts = items.length > limit + 2;
  const visible = cuts && !open ? items.slice(0, limit) : items;
  const hidden = items.length - limit;

  return (
    <div className={`showmore ${className}`} data-cut={(cuts && !open) || undefined}>
      <div className="showmore__list" id={id}>
        {children(visible)}
      </div>
      {cuts && (
        <button
          ref={btn}
          type="button"
          className="showmore__btn"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            if (!open) sfx('fold');
            setOpen(!open);
            // Al plegar, el botón vuelve a quedar a la vista en lugar de perderse abajo.
            if (open) requestAnimationFrame(() => btn.current?.scrollIntoView({ block: 'nearest' }));
          }}
        >
          <span>{open ? 'Ver menos' : `Ver ${noun === 'elementos' ? 'todos' : `los ${items.length} ${noun}`}`}</span>
          <span className="mono small muted">{open ? '' : `+${hidden}`}</span>
          <Icon name="down" size={16} className="showmore__chev" />
        </button>
      )}
    </div>
  );
}
