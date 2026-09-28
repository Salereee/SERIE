import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../../db/schema';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/schema';
import { Icon } from '../../ui/Icon';

export interface ComboGroup {
  key: string;
  label: string;
  items: Exercise[];
}

interface Props {
  groups: ComboGroup[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (e: Exercise) => void;
  /** Controles extra junto a la búsqueda (filtro de equipo, etc.). */
  tools?: React.ReactNode;
  autoFocus?: boolean;
  label?: string;
}

/**
 * Lista con búsqueda (patrón ARIA combobox + listbox).
 * El foco se queda en el campo: ↑↓ mueven la opción activa, Inicio/Fin saltan, Enter elige.
 * Esc lo maneja la hoja que lo contiene (cierra y devuelve el foco al control que la abrió).
 */
export function ExerciseCombobox({ groups, query, onQuery, onPick, tools, autoFocus, label = 'Buscar ejercicio' }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const flat = useMemo(() => groups.flatMap((g) => g.items.map((e) => ({ e, group: g.key }))), [groups]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Al cambiar los resultados, la primera opción queda activa.
  useEffect(() => setActive(0), [query, groups]);

  useEffect(() => {
    listRef.current?.querySelector(`#${CSS.escape(`${id}-o${active}`)}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id]);

  const onKey = (e: React.KeyboardEvent) => {
    if (flat.length === 0) return;
    if (e.key === 'ArrowDown') setActive((a) => Math.min(flat.length - 1, a + 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
    else if (e.key === 'Home' && e.ctrlKey) setActive(0);
    else if (e.key === 'End' && e.ctrlKey) setActive(flat.length - 1);
    else if (e.key === 'PageDown') setActive((a) => Math.min(flat.length - 1, a + 8));
    else if (e.key === 'PageUp') setActive((a) => Math.max(0, a - 8));
    else if (e.key === 'Enter') onPick(flat[active].e);
    else return;
    e.preventDefault();
  };

  let i = -1;
  return (
    <div className="combo">
      <div className="browser__filters">
        <div className="search">
          <Icon name="search" className="search__icon" />
          <input
            className="input"
            type="search"
            role="combobox"
            aria-label={label}
            aria-expanded={true}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? `${id}-o${active}` : undefined}
            placeholder="Buscar ejercicio"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onKey}
            autoFocus={autoFocus}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {tools}
      </div>
      <div ref={listRef} id={listId} role="listbox" aria-label="Ejercicios" className="combo__list">
        {flat.length === 0 && (
          <p className="muted" style={{ padding: '16px 0' }} role="presentation">
            Nada coincide. Prueba otra palabra o quita el filtro de equipo.
          </p>
        )}
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <div key={g.key} role="group" aria-labelledby={`${id}-g-${g.key}`} className="combo__group">
              <div id={`${id}-g-${g.key}`} className="combo__label" role="presentation">
                <span>{g.label}</span>
                <span className="mono">{g.items.length}</span>
              </div>
              {g.items.map((e) => {
                i++;
                const idx = i;
                return (
                  <div
                    key={g.key + e.id}
                    id={`${id}-o${idx}`}
                    role="option"
                    aria-selected={idx === active}
                    data-active={idx === active || undefined}
                    className="ex-row"
                    onMouseMove={() => idx !== active && setActive(idx)}
                    onClick={() => onPick(e)}
                  >
                    <span className="ex-row__name">
                      {e.name}
                      {e.isCustom && <span className="tag tag--muted">Propio</span>}
                    </span>
                    <span className="ex-row__meta">
                      {MUSCLE_LABEL[e.primaryMuscle]} · {EQUIPMENT_LABEL[e.equipment]}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}
