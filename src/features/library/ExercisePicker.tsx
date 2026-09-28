import { useState } from 'react';
import type { Equipment, Exercise, Muscle } from '../../db/schema';
import { MUSCLE_LABEL } from '../../db/schema';
import { Icon } from '../../ui/Icon';
import { Select } from '../../ui/Select';
import { Sheet } from '../../ui/Sheet';
import { ExerciseCombobox } from './ExerciseCombobox';
import { EQUIPMENT_OPTIONS, useExerciseGroups } from './useExerciseFilter';
import './library.css';

interface Props {
  title?: string;
  onClose: () => void;
  onPick: (e: Exercise) => void;
  initialMuscle?: Muscle;
  excludeIds?: string[];
  /** Limitar a estos ids (p. ej. ejercicios con historial en Progreso). */
  onlyIds?: string[];
}

/** Selector de ejercicios: lista con búsqueda, agrupada, "Recientes" primero. */
export function ExercisePicker({ title = 'Agregar ejercicio', onClose, onPick, initialMuscle, excludeIds, onlyIds }: Props) {
  const [q, setQ] = useState('');
  const [equipment, setEquipment] = useState<Equipment | 'todos'>('todos');
  const [muscle, setMuscle] = useState<Muscle | null>(initialMuscle ?? null);
  const { groups, recents } = useExerciseGroups({ q, equipment, muscle, excludeIds });
  const only = onlyIds ? new Set(onlyIds) : null;
  const keep = (list: Exercise[]) => (only ? list.filter((e) => only.has(e.id)) : list);

  const comboGroups = [
    ...(recents.length ? [{ key: 'recientes', label: 'Recientes', items: keep(recents) }] : []),
    ...groups.map((g) => ({ ...g, items: keep(g.items) })),
  ];

  return (
    <Sheet title={title} eyebrow={muscle ? `Mismo grupo · ${MUSCLE_LABEL[muscle]}` : 'Biblioteca'} onClose={onClose} full wide>
      <ExerciseCombobox
        groups={comboGroups}
        query={q}
        onQuery={setQ}
        autoFocus
        onPick={(e) => {
          onPick(e);
          onClose();
        }}
        tools={
          <div className="cluster">
            <Select label="Equipo" value={equipment} options={EQUIPMENT_OPTIONS} onChange={setEquipment} />
            {muscle && (
              <button className="chip" aria-pressed="true" onClick={() => setMuscle(null)} aria-label={`Quitar filtro: solo ${MUSCLE_LABEL[muscle]}`}>
                Solo {MUSCLE_LABEL[muscle]} <Icon name="x" size={12} />
              </button>
            )}
          </div>
        }
      />
    </Sheet>
  );
}
