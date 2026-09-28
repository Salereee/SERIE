import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../../db/db';
import { useRecentExerciseIds } from '../../db/hooks';
import { EQUIPMENT, EQUIPMENT_LABEL, MUSCLES, MUSCLE_LABEL, type Equipment, type Exercise, type Muscle } from '../../db/schema';
import { normalize } from '../../domain/text';
import type { SelectOption } from '../../ui/Select';
import type { ComboGroup } from './ExerciseCombobox';

export const EQUIPMENT_OPTIONS: SelectOption<Equipment | 'todos'>[] = [
  { value: 'todos', label: 'Cualquier equipo' },
  ...EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABEL[e] })),
];

export interface FilterState {
  q: string;
  equipment: Equipment | 'todos';
  muscle: Muscle | null;
  excludeIds?: string[];
}

/** Agrupa la biblioteca por grupo muscular (orden anatómico fijo), con "Recientes" primero si no hay búsqueda. */
export function useExerciseGroups({ q, equipment, muscle, excludeIds }: FilterState) {
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], undefined as Exercise[] | undefined);
  const recentIds = useRecentExerciseIds(6);

  return useMemo(() => {
    const list = all ?? [];
    const nq = normalize(q);
    const ex = new Set(excludeIds);
    const matches = (e: Exercise) =>
      !e.archived &&
      !ex.has(e.id) &&
      (!muscle || e.primaryMuscle === muscle) &&
      (equipment === 'todos' || e.equipment === equipment) &&
      (!nq || normalize(e.name).includes(nq) || normalize(MUSCLE_LABEL[e.primaryMuscle]).includes(nq));
    const visible = list.filter(matches);
    const totals = new Map<Muscle, number>();
    for (const e of list) if (!e.archived) totals.set(e.primaryMuscle, (totals.get(e.primaryMuscle) ?? 0) + 1);

    const groups: (ComboGroup & { total: number })[] = MUSCLES.map((m) => ({
      key: m,
      label: MUSCLE_LABEL[m],
      items: visible.filter((e) => e.primaryMuscle === m),
      total: totals.get(m) ?? 0,
    })).filter((g) => g.total > 0);

    const byId = new Map(list.map((e) => [e.id, e]));
    const recents = nq ? [] : recentIds.map((id) => byId.get(id)).filter((e): e is Exercise => !!e && matches(e));
    return { loaded: !!all, groups, recents, count: visible.length, total: list.filter((e) => !e.archived).length };
  }, [all, q, equipment, muscle, excludeIds, recentIds]);
}
