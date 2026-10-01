import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { db } from '../../db/db';
import { useExerciseMap, useSettings } from '../../db/hooks';
import type { Program, ProgramDay, ProgramItem } from '../../db/schema';
import { MUSCLE_LABEL } from '../../db/schema';
import { fmtClock } from '../../domain/format';
import { uid } from '../../domain/ids';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { ExercisePicker } from '../library/ExercisePicker';

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];

type Mutator = (p: Program) => void;

export function Builder({ program }: { program: Program }) {
  const desktop = useMediaQuery('(min-width: 900px)');
  const [dayIdx, setDayIdx] = useState(0);
  const [picker, setPicker] = useState<{ dayId: string; replaceItemId?: string } | null>(null);
  const [menu, setMenu] = useState<{ dayId: string; itemId: string } | null>(null);
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  // Filas compactas: solo un ejercicio abierto a la vez para editar series, reps y descanso.
  const [openItem, setOpenItem] = useState<string | null>(null);
  const ex = useExerciseMap();
  const settings = useSettings();
  const { toast, confirm } = useFeedback();

  const save = async (fn: Mutator) => {
    const next = structuredClone(program);
    fn(next);
    next.updatedAt = Date.now();
    await db.programs.put(next);
  };

  const snapshotUndo = (message: string) => {
    const snapshot = structuredClone(program);
    return () => toast({ message, onAction: () => db.programs.put(snapshot) });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findItem = (id: string) => {
    for (const d of program.days) {
      const i = d.items.findIndex((it) => it.id === id);
      if (i !== -1) return { day: d, index: i };
    }
    return null;
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = findItem(String(active.id));
    if (!from) return;
    const overId = String(over.id);
    const toDayId = overId.startsWith('day:') ? overId.slice(4) : findItem(overId)?.day.id;
    if (!toDayId) return;
    save((p) => {
      const src = p.days.find((d) => d.id === from.day.id)!;
      const dst = p.days.find((d) => d.id === toDayId)!;
      if (src === dst) {
        const to = dst.items.findIndex((it) => it.id === overId);
        src.items = arrayMove(src.items, from.index, to);
      } else {
        const [moved] = src.items.splice(from.index, 1);
        delete moved.supersetGroup;
        const to = overId.startsWith('day:') ? dst.items.length : dst.items.findIndex((it) => it.id === overId);
        dst.items.splice(to, 0, moved);
      }
      cleanSupersets(src);
      cleanSupersets(dst);
    });
  };

  const addDay = () =>
    save((p) => {
      p.days.push({ id: uid(), name: `Día ${p.days.length + 1}`, items: [] });
    }).then(() => setDayIdx(program.days.length));

  const days = desktop ? program.days : program.days.slice(dayIdx, dayIdx + 1);
  const menuItem = menu ? findItem(menu.itemId) : null;
  const dayForMenu = dayMenu ? program.days.findIndex((d) => d.id === dayMenu) : -1;

  return (
    <div className="builder">
      {!desktop && (
        <div className="chips" role="tablist" aria-label="Días del programa">
          {program.days.map((d, i) => (
            <button key={d.id} role="tab" className="chip" aria-selected={i === dayIdx} aria-pressed={i === dayIdx} onClick={() => setDayIdx(i)}>
              {d.name}
            </button>
          ))}
          <button className="chip" onClick={addDay}>
            + Día
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="builder__days">
          {days.map((d) => {
            const idx = program.days.indexOf(d);
            return (
              <DayColumn
                key={d.id}
                day={d}
                index={idx}
                desktop={desktop}
                exName={(id) => ex.get(id)?.name ?? id}
                onRename={(name) => save((p) => void (p.days[idx].name = name))}
                onAdd={() => setPicker({ dayId: d.id })}
                onMenu={() => setDayMenu(d.id)}
                onItem={(itemId, patch) =>
                  save((p) => {
                    const it = p.days[idx].items.find((i) => i.id === itemId)!;
                    Object.assign(it, patch);
                  })
                }
                onMove={(from, to) => save((p) => void ((p.days[idx].items = arrayMove(p.days[idx].items, from, to)), cleanSupersets(p.days[idx])))}
                onItemMenu={(itemId) => setMenu({ dayId: d.id, itemId })}
                openItem={openItem}
                onOpenItem={(itemId, o) => setOpenItem(o ? itemId : null)}
                onToggleSuperset={(i) =>
                  save((p) => {
                    const items = p.days[idx].items;
                    const a = items[i];
                    const b = items[i + 1];
                    if (!b) return;
                    if (a.supersetGroup && a.supersetGroup === b.supersetGroup) {
                      // Separa: todo lo que sigue a `a` en el grupo pasa a un grupo nuevo.
                      const g = uid();
                      for (let j = i + 1; j < items.length && items[j].supersetGroup === a.supersetGroup; j++) items[j].supersetGroup = g;
                    } else {
                      const g = a.supersetGroup ?? b.supersetGroup ?? uid();
                      const old = b.supersetGroup;
                      a.supersetGroup = g;
                      for (let j = i + 1; j < items.length && (j === i + 1 || (old && items[j].supersetGroup === old)); j++) items[j].supersetGroup = g;
                    }
                    cleanSupersets(p.days[idx]);
                  })
                }
              />
            );
          })}
        </div>
      </DndContext>
      {desktop && (
        <div>
          <button className="btn btn--sm" onClick={addDay}>
            <Icon name="plus" /> Agregar día
          </button>
        </div>
      )}

      <p className="small muted">
        {desktop
          ? 'Arrastra ejercicios desde el asa (también entre días). Con teclado: enfoca el asa, Espacio para tomar, flechas para mover y Espacio para soltar.'
          : 'Usa ↑ ↓ para reordenar. Los cambios se guardan solos.'}{' '}
        Descanso por defecto al agregar: {fmtClock(settings.defaultRestSec)}.
      </p>

      {picker && (
        <ExercisePicker
          title={picker.replaceItemId ? 'Reemplazar ejercicio' : 'Agregar ejercicio'}
          initialMuscle={picker.replaceItemId ? ex.get(findItem(picker.replaceItemId)!.day.items[findItem(picker.replaceItemId)!.index].exerciseId)?.primaryMuscle : undefined}
          onClose={() => setPicker(null)}
          onPick={(e) =>
            save((p) => {
              const day = p.days.find((d) => d.id === picker.dayId)!;
              if (picker.replaceItemId) {
                const it = day.items.find((i) => i.id === picker.replaceItemId)!;
                it.exerciseId = e.id;
              } else {
                const iso = e.kind === 'aislamiento';
                const id = uid();
                setOpenItem(id);
                day.items.push({ id, exerciseId: e.id, targetSets: 3, repMin: iso ? 10 : 8, repMax: iso ? 15 : 12, restSec: settings.defaultRestSec });
              }
            })
          }
        />
      )}

      {menu && menuItem && (
        <Sheet title={ex.get(menuItem.day.items[menuItem.index].exerciseId)?.name ?? 'Ejercicio'} eyebrow={`${menuItem.day.name} · ejercicio ${menuItem.index + 1}`} onClose={() => setMenu(null)}>
          <div className="menu">
            <button
              onClick={() => {
                setPicker({ dayId: menu.dayId, replaceItemId: menu.itemId });
                setMenu(null);
              }}
            >
              <Icon name="swap" /> Reemplazar por otro de {MUSCLE_LABEL[ex.get(menuItem.day.items[menuItem.index].exerciseId)?.primaryMuscle ?? 'pecho']}
            </button>
            <button
              onClick={() => {
                save((p) => {
                  const d = p.days.find((x) => x.id === menu.dayId)!;
                  const it = d.items[menuItem.index];
                  d.items.splice(menuItem.index + 1, 0, { ...it, id: uid(), supersetGroup: undefined });
                });
                setMenu(null);
              }}
            >
              <Icon name="plus" /> Duplicar
            </button>
            {program.days
              .filter((d) => d.id !== menu.dayId)
              .map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    save((p) => {
                      const src = p.days.find((x) => x.id === menu.dayId)!;
                      const dst = p.days.find((x) => x.id === d.id)!;
                      const [moved] = src.items.splice(menuItem.index, 1);
                      delete moved.supersetGroup;
                      dst.items.push(moved);
                      cleanSupersets(src);
                    });
                    setMenu(null);
                  }}
                >
                  <Icon name="arrow" /> Mover a {d.name}
                </button>
              ))}
            <button
              className="menu__danger"
              onClick={async () => {
                const name = ex.get(menuItem.day.items[menuItem.index].exerciseId)?.name;
                setMenu(null);
                const ok = await confirm({ title: `¿Quitar ${name}?`, body: `Se quitará de ${menuItem.day.name}. El historial no se toca.`, confirmLabel: 'Quitar', danger: true });
                if (!ok) return;
                const undo = snapshotUndo('Ejercicio quitado');
                await save((p) => {
                  const d = p.days.find((x) => x.id === menu.dayId)!;
                  d.items.splice(menuItem.index, 1);
                  cleanSupersets(d);
                });
                undo();
              }}
            >
              <Icon name="trash" /> Quitar del día
            </button>
          </div>
        </Sheet>
      )}

      {dayMenu && dayForMenu !== -1 && (
        <Sheet title={program.days[dayForMenu].name} eyebrow={`Día ${dayForMenu + 1} de ${program.days.length}`} onClose={() => setDayMenu(null)}>
          <div className="menu">
            <button
              disabled={dayForMenu === 0}
              onClick={() => {
                save((p) => void (p.days = arrayMove(p.days, dayForMenu, dayForMenu - 1)));
                setDayIdx(Math.max(0, dayForMenu - 1));
                setDayMenu(null);
              }}
            >
              <Icon name="left" /> Mover antes
            </button>
            <button
              disabled={dayForMenu === program.days.length - 1}
              onClick={() => {
                save((p) => void (p.days = arrayMove(p.days, dayForMenu, dayForMenu + 1)));
                setDayIdx(dayForMenu + 1);
                setDayMenu(null);
              }}
            >
              <Icon name="right" /> Mover después
            </button>
            <button
              onClick={() => {
                save((p) => {
                  const d = p.days[dayForMenu];
                  p.days.splice(dayForMenu + 1, 0, { id: uid(), name: `${d.name} (copia)`, items: d.items.map((i) => ({ ...i, id: uid() })) });
                });
                setDayMenu(null);
              }}
            >
              <Icon name="plus" /> Duplicar día
            </button>
            <button
              className="menu__danger"
              disabled={program.days.length <= 1}
              onClick={async () => {
                const d = program.days[dayForMenu];
                setDayMenu(null);
                const ok = await confirm({ title: `¿Borrar ${d.name}?`, body: `Tiene ${d.items.length} ejercicios. El historial de sesiones se conserva.`, confirmLabel: 'Borrar día', danger: true });
                if (!ok) return;
                const undo = snapshotUndo('Día borrado');
                await save((p) => void p.days.splice(dayForMenu, 1));
                setDayIdx(Math.max(0, dayForMenu - 1));
                undo();
              }}
            >
              <Icon name="trash" /> Borrar día
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Quita grupos de superset que quedaron con un solo ejercicio o no consecutivos. */
function cleanSupersets(day: ProgramDay) {
  const items = day.items;
  for (let i = 0; i < items.length; i++) {
    const g = items[i].supersetGroup;
    if (!g) continue;
    const prev = items[i - 1]?.supersetGroup === g;
    const next = items[i + 1]?.supersetGroup === g;
    if (!prev && !next) delete items[i].supersetGroup;
  }
}

function supersetPos(items: ProgramItem[], i: number): 'start' | 'mid' | 'end' | undefined {
  const g = items[i].supersetGroup;
  if (!g) return undefined;
  const prev = items[i - 1]?.supersetGroup === g;
  const next = items[i + 1]?.supersetGroup === g;
  if (prev && next) return 'mid';
  if (next) return 'start';
  if (prev) return 'end';
  return undefined;
}

interface DayColumnProps {
  day: ProgramDay;
  index: number;
  desktop: boolean;
  exName: (id: string) => string;
  onRename: (name: string) => void;
  onAdd: () => void;
  onMenu: () => void;
  onItem: (itemId: string, patch: Partial<ProgramItem>) => void;
  onMove: (from: number, to: number) => void;
  onItemMenu: (itemId: string) => void;
  onToggleSuperset: (index: number) => void;
  openItem: string | null;
  onOpenItem: (itemId: string, open: boolean) => void;
}

function DayColumn({ day, index, desktop, exName, onRename, onAdd, onMenu, onItem, onMove, onItemMenu, onToggleSuperset, openItem, onOpenItem }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` });
  return (
    <section className="bday" aria-label={day.name}>
      <div className="bday__head">
        <span className="tnum small muted">{index + 1}</span>
        <input
          key={day.name}
          className="bday__name"
          defaultValue={day.name}
          aria-label={`Nombre del día ${index + 1}`}
          maxLength={40}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== day.name) onRename(v);
            else e.target.value = day.name;
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button className="btn btn--ghost btn--icon" onClick={onMenu} aria-label={`Opciones de ${day.name}`}>
          <Icon name="more" />
        </button>
      </div>
      <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="bday__list" data-over={isOver && day.items.length === 0}>
          {day.items.length === 0 && <li className="small muted" style={{ padding: '12px 0' }}>Sin ejercicios. Agrega el primero.</li>}
          {day.items.map((it, i) => (
            <BuilderItem
              key={it.id}
              item={it}
              index={i}
              count={day.items.length}
              name={exName(it.exerciseId)}
              desktop={desktop}
              superset={supersetPos(day.items, i)}
              linkedToNext={!!it.supersetGroup && day.items[i + 1]?.supersetGroup === it.supersetGroup}
              onChange={(patch) => onItem(it.id, patch)}
              onUp={() => onMove(i, i - 1)}
              onDown={() => onMove(i, i + 1)}
              onMenu={() => onItemMenu(it.id)}
              onToggleSuperset={() => onToggleSuperset(i)}
              open={openItem === it.id}
              onOpen={(o) => onOpenItem(it.id, o)}
            />
          ))}
        </ol>
      </SortableContext>
      <button className="btn btn--sm" onClick={onAdd}>
        <Icon name="plus" /> Agregar ejercicio
      </button>
    </section>
  );
}

interface ItemProps {
  item: ProgramItem;
  index: number;
  count: number;
  name: string;
  desktop: boolean;
  superset?: 'start' | 'mid' | 'end';
  linkedToNext: boolean;
  onChange: (patch: Partial<ProgramItem>) => void;
  onUp: () => void;
  onDown: () => void;
  onMenu: () => void;
  onToggleSuperset: () => void;
  open: boolean;
  onOpen: (open: boolean) => void;
}

function BuilderItem({ item, index, count, name, desktop, superset, linkedToNext, onChange, onUp, onDown, onMenu, onToggleSuperset, open, onOpen }: ItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [min, setMin] = useState(String(item.repMin));
  const [max, setMax] = useState(String(item.repMax));
  const minN = Number(min);
  const maxN = Number(max);
  const valid = /^\d+$/.test(min) && /^\d+$/.test(max) && minN >= 1 && maxN >= minN && maxN <= 100;
  const commit = () => {
    if (valid) {
      if (minN !== item.repMin || maxN !== item.repMax) onChange({ repMin: minN, repMax: maxN });
    }
  };
  const id = item.id.slice(0, 8);
  // Con reps inválidas la fila no se cierra: el error queda a la vista.
  const expanded = open || !valid;
  const summary = `${item.targetSets} × ${item.repMin}–${item.repMax} · ${fmtClock(item.restSec)}`;

  return (
    <li
      ref={setNodeRef}
      className="bitem"
      data-dragging={isDragging || undefined}
      data-superset={superset}
      data-open={expanded || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="bitem__top">
        {desktop ? (
          <button ref={setActivatorNodeRef} className="bitem__grip" aria-label={`Mover ${name}`} {...attributes} {...listeners}>
            <Icon name="grip" />
          </button>
        ) : (
          <span className="mono small muted" style={{ width: 24 }}>
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
        <button className="bitem__toggle" aria-expanded={expanded} aria-controls={`b-${id}`} onClick={() => onOpen(!open)}>
          <span className="bitem__name">
            {superset && <span className="tag" style={{ marginRight: 6 }}>SS</span>}
            {name}
          </span>
          <span className="bitem__sum mono">{summary}</span>
          <Icon name="down" size={16} className="bitem__chev" />
        </button>
        <button className="btn btn--ghost btn--icon" onClick={onMenu} aria-label={`Opciones de ${name}`}>
          <Icon name="more" />
        </button>
      </div>
      {expanded && (
        <div className="bitem__body" id={`b-${id}`}>
          <div className="bitem__fields">
            <div className="field">
              <label className="field__label" htmlFor={`s-${id}`}>
                Series
              </label>
              <select id={`s-${id}`} className="select input--num" value={item.targetSets} onChange={(e) => onChange({ targetSets: Number(e.target.value) })}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="field__label" id={`r-${id}`}>
                Reps
              </span>
              <div className="bitem__range" role="group" aria-labelledby={`r-${id}`}>
                <input
                  className="input input--num"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Reps mínimas"
                  value={min}
                  onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
                  onBlur={commit}
                  aria-invalid={!valid}
                />
                <span aria-hidden="true">–</span>
                <input
                  className="input input--num"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Reps máximas"
                  value={max}
                  onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
                  onBlur={commit}
                  aria-invalid={!valid}
                />
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`d-${id}`}>
                Descanso
              </label>
              <select id={`d-${id}`} className="select input--num" value={item.restSec} onChange={(e) => onChange({ restSec: Number(e.target.value) })}>
                {[...new Set([...REST_OPTIONS, item.restSec])].sort((a, b) => a - b).map((s) => (
                  <option key={s} value={s}>
                    {fmtClock(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!valid && <span className="field__error">Reps: enteros, mínimo ≥ 1 y máximo ≥ mínimo.</span>}
          <div className="bitem__actions">
            {!desktop && (
              <>
                <button className="btn btn--sm" onClick={onUp} disabled={index === 0} aria-label={`Subir ${name}`}>
                  <Icon name="up" />
                </button>
                <button className="btn btn--sm" onClick={onDown} disabled={index === count - 1} aria-label={`Bajar ${name}`}>
                  <Icon name="down" />
                </button>
              </>
            )}
            {index < count - 1 && (
              <button className="btn btn--sm btn--ghost" onClick={onToggleSuperset} aria-pressed={linkedToNext}>
                <Icon name="link" size={16} /> {linkedToNext ? 'Separar superset' : 'Superset con siguiente'}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
