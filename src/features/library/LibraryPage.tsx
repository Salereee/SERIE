import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { useExerciseLogs, useSettings } from '../../db/hooks';
import { EQUIPMENT_LABEL, MUSCLE_LABEL, showsAdvancedMetrics, type Exercise } from '../../db/schema';
import { fmtRelativeDay } from '../../domain/format';
import { computeRecords } from '../../domain/records';
import { fmtWeight } from '../../domain/units';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ExerciseBrowser } from './ExerciseBrowser';
import { RUTINAS_NAV, SegNav } from '../../ui/SegNav';
import { ExerciseForm } from './ExerciseForm';

export function LibraryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const desktop = useMediaQuery('(min-width: 900px)');
  const count = useLiveQuery(() => db.exercises.filter((e) => !e.archived).count(), [], 0);
  const customCount = useLiveQuery(() => db.exercises.where('custom').equals(1).filter((e) => !e.archived).count(), [], 0);

  const selected = useLiveQuery(() => (selectedId ? db.exercises.get(selectedId) : undefined), [selectedId]);

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title-xl">Rutinas</h1>
        <SegNav items={RUTINAS_NAV} label="Rutinas" />
      </header>
      <div className="section-tools">
        <span className="eyebrow">
          {count} ejercicios · {customCount} propios
        </span>
        <button className="btn btn--sm" onClick={() => setEditing('new')}>
          <Icon name="plus" size={18} /> Crear ejercicio
        </button>
      </div>

      <div className="grid12">
        <div className="span-7">
          <ExerciseBrowser onPick={(e) => setSelectedId(e.id)} selectedId={desktop ? selectedId ?? undefined : undefined} />
        </div>
        <div className="span-5 desktop-only">
          <div className="lib-sticky">
            {selected ? (
              <ExerciseDetail exercise={selected} onEdit={() => setEditing(selected)} onDeleted={() => setSelectedId(null)} />
            ) : (
              <div className="empty">
                <span className="empty__title">Elige un ejercicio</span>
                <p>Verás sus músculos, equipo, tus récords y el acceso a su progreso. Los ejercicios propios se pueden editar o borrar.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!desktop && selected && (
        <Sheet title={selected.name} eyebrow="Ejercicio" onClose={() => setSelectedId(null)}>
          <ExerciseDetail exercise={selected} onEdit={() => setEditing(selected)} onDeleted={() => setSelectedId(null)} hideTitle />
        </Sheet>
      )}

      {editing && (
        <ExerciseForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(e) => setSelectedId(e.id)}
        />
      )}
    </div>
  );
}

function ExerciseDetail({ exercise: e, onEdit, onDeleted, hideTitle }: { exercise: Exercise; onEdit: () => void; onDeleted: () => void; hideTitle?: boolean }) {
  const logs = useExerciseLogs(e.id) ?? [];
  const settings = useSettings();
  const { unit } = settings;
  const advanced = showsAdvancedMetrics(settings);
  const { confirm, toast } = useFeedback();
  const rec = computeRecords(logs);

  const remove = async () => {
    const inPrograms = (await db.programs.toArray()).some((p) => p.days.some((d) => d.items.some((i) => i.exerciseId === e.id)));
    const hasHistory = logs.length > 0;
    const keep = hasHistory || inPrograms;
    const ok = await confirm({
      title: `¿Borrar “${e.name}”?`,
      body: keep
        ? `Tiene ${hasHistory ? 'historial' : ''}${hasHistory && inPrograms ? ' y ' : ''}${inPrograms ? 'uso en programas' : ''}. Se archivará: desaparece del selector pero tus gráficas y registros se conservan.`
        : 'Se eliminará de tu biblioteca.',
      confirmLabel: keep ? 'Archivar' : 'Borrar',
      danger: true,
    });
    if (!ok) return;
    const snapshot = { ...e };
    if (keep) await db.exercises.update(e.id, { archived: true });
    else await db.exercises.delete(e.id);
    onDeleted();
    toast({
      message: keep ? 'Ejercicio archivado' : 'Ejercicio borrado',
      onAction: () => db.exercises.put({ ...snapshot, archived: false }),
    });
  };

  return (
    <div className="lib-detail">
      {!hideTitle && (
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <span className="eyebrow">{e.isCustom ? 'Ejercicio propio' : 'Predefinido'}</span>
          <h2 className="title-md">{e.name}</h2>
        </div>
      )}
      <dl>
        <dt className="eyebrow">Principal</dt>
        <dd>{MUSCLE_LABEL[e.primaryMuscle]}</dd>
        <dt className="eyebrow">Secundarios</dt>
        <dd>{e.secondaryMuscles.length ? e.secondaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ') : '—'}</dd>
        <dt className="eyebrow">Equipo</dt>
        <dd>{EQUIPMENT_LABEL[e.equipment]}</dd>
        <dt className="eyebrow">Tipo</dt>
        <dd>{e.kind === 'compuesto' ? 'Compuesto' : 'Aislamiento'}</dd>
      </dl>
      {e.note && (
        <p className="exnote">
          <Icon name="edit" size={16} />
          <span>{e.note}</span>
        </p>
      )}
      {logs.length > 0 ? (
        <div className="stat-row" style={{ '--cols': 2 } as React.CSSProperties}>
          <div className="stat">
            <span className="eyebrow">{advanced ? '1RM estimado' : 'Peso máximo'}</span>
            <span className="num-md">
              {fmtWeight(advanced ? rec.best1RM : rec.bestWeight, unit)}
              <span className="unit">{unit}</span>
            </span>
          </div>
          <div className="stat">
            <span className="eyebrow">Última vez</span>
            <span className="num-md">{fmtRelativeDay(logs[0].date)}</span>
          </div>
        </div>
      ) : (
        <p className="muted small">Aún no lo has registrado en ninguna sesión.</p>
      )}
      <div className="cluster">
        {logs.length > 0 && (
          <Link className="btn btn--primary" to={`/progreso/${e.id}`}>
            Ver progreso <Icon name="arrow" />
          </Link>
        )}
        {e.isCustom && (
          <>
            <button className="btn" onClick={onEdit}>
              Editar
            </button>
            <button className="btn btn--danger" onClick={remove}>
              Borrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
