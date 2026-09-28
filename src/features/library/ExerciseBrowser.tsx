import { useCallback, useState } from 'react';
import type { Equipment, Exercise } from '../../db/schema';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/schema';
import { Disclosure, ToggleAll, useOpenSections } from '../../ui/Disclosure';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';
import { EQUIPMENT_OPTIONS, useExerciseGroups } from './useExerciseFilter';
import './library.css';

interface Props {
  onPick: (e: Exercise) => void;
  selectedId?: string;
}

/**
 * Biblioteca por grupo muscular: "Recientes" abierto y el resto cerrado con su conteo.
 * Al buscar, se abren solos los grupos con resultados (sin tocar la preferencia guardada).
 */
export function ExerciseBrowser({ onPick, selectedId }: Props) {
  const [q, setQ] = useState('');
  const [equipment, setEquipment] = useState<Equipment | 'todos'>('todos');
  const { groups, recents, count, total, loaded } = useExerciseGroups({ q, equipment, muscle: null });
  const defaults = useCallback((id: string) => id === 'recientes', []);
  const { isOpen, setOpen, setAll } = useOpenSections('biblioteca', defaults);
  const filtering = q.trim() !== '' || equipment !== 'todos';
  const ids = groups.map((g) => g.key);
  const allOpen = ids.every(isOpen);

  return (
    <div className="browser">
      <div className="browser__filters">
        <label className="search">
          <span className="sr-only">Buscar ejercicio</span>
          <Icon name="search" className="search__icon" />
          <input
            className="input"
            type="search"
            placeholder="Buscar ejercicio o grupo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
          />
        </label>
        <div className="section-tools">
          <Select label="Equipo" value={equipment} options={EQUIPMENT_OPTIONS} onChange={setEquipment} />
          <span className="cluster">
            <span className="eyebrow mono" aria-live="polite">
              {filtering ? `${count} de ${total}` : `${total} ejercicios`}
            </span>
            {!filtering && <ToggleAll allOpen={allOpen} onChange={(o) => setAll(ids, o)} />}
          </span>
        </div>
      </div>

      {loaded && filtering && count === 0 && (
        <p className="muted" style={{ padding: '8px 0' }}>
          Nada coincide. Prueba otra palabra o quita el filtro de equipo; si no existe, créalo con “Crear ejercicio”.
        </p>
      )}

      <div className="browser__groups">
        {recents.length > 0 && !filtering && (
          <Disclosure
            sticky
            title="Recientes"
            summary={`${recents.length}`}
            open={isOpen('recientes')}
            onToggle={(o) => setOpen('recientes', o)}
          >
            <ExerciseList items={recents} onPick={onPick} selectedId={selectedId} />
          </Disclosure>
        )}
        {groups
          .filter((g) => !filtering || g.items.length > 0)
          .map((g) => (
            <Disclosure
              key={g.key}
              sticky
              lazy
              title={g.label}
              summary={filtering ? `${g.items.length} de ${g.total}` : `${g.total}`}
              open={filtering || isOpen(g.key)}
              onToggle={(o) => !filtering && setOpen(g.key, o)}
            >
              <ExerciseList items={g.items} onPick={onPick} selectedId={selectedId} />
            </Disclosure>
          ))}
      </div>
    </div>
  );
}

function ExerciseList({ items, onPick, selectedId }: { items: Exercise[]; onPick: (e: Exercise) => void; selectedId?: string }) {
  return (
    <ul className="list">
      {items.map((e) => (
        <li key={e.id}>
          <button className={`ex-row${e.id === selectedId ? ' ex-row--selected' : ''}`} onClick={() => onPick(e)} aria-current={e.id === selectedId || undefined}>
            <span className="ex-row__name">
              {e.name}
              {e.isCustom && <span className="tag tag--muted">Propio</span>}
            </span>
            <span className="ex-row__meta">
              {MUSCLE_LABEL[e.primaryMuscle]} · {EQUIPMENT_LABEL[e.equipment]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
