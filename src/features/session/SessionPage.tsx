import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { useActiveSession, useExerciseMap, useSettings } from '../../db/hooks';
import type { Exercise, ExerciseLog, PRKind, Session, SessionExercise, SetEntry, Settings } from '../../db/schema';
import { showsAdvancedMetrics, showsEffort } from '../../db/schema';
import { MUSCLE_LABEL } from '../../db/schema';
import { fmtClock, fmtDateShort } from '../../domain/format';
import { suggest, type Suggestion } from '../../domain/progression';
import { computeRecords, prLabel, setPRs, type Records } from '../../domain/records';
import { fmtWeight } from '../../domain/units';
import { haptic, sfx, unlockAudio } from '../../hooks/audio';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useFeedback } from '../../ui/feedback';
import { Disclosure } from '../../ui/Disclosure';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { ExercisePicker } from '../library/ExercisePicker';
import {
  addExercise,
  addSet,
  applyToPending,
  completeSet,
  discardSession,
  finishSession,
  moveExercise,
  mutate,
  removeExercise,
  removeSet,
  replaceExercise,
  setFocus,
  snapshotBeforeComplete,
  supersetMembers,
  uncompleteSet,
  undoComplete,
  updateSet,
} from './actions';
import { barKgFor, platesPerSide } from '../../domain/plates';
import { toDisplay } from '../../domain/units';
import { MAX_NOTE } from '../../db/validate';
import { RestTimer } from './RestTimer';
import { SetRow } from './SetRow';
import { accordionState } from './accordion';
import { useSessionLock } from './useSessionLock';
import './session.css';
import { Help } from '../../ui/Help';

export function SessionPage() {
  const session = useActiveSession();
  useWakeLock(!!session);

  if (session === null) return null;
  if (!session) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty__title">No hay una sesión en curso</span>
          <p>Empieza el día que toca desde Hoy, o una sesión libre para agregar ejercicios sobre la marcha.</p>
          <Link className="btn btn--primary" to="/">
            Ir a Hoy
          </Link>
        </div>
      </div>
    );
  }
  return <ActiveSession session={session} />;
}

/** Historial por ejercicio de la sesión, más reciente primero. */
function useHistory(exerciseIds: string[]) {
  const key = [...new Set(exerciseIds)].sort().join('|');
  const logs = useLiveQuery(() => (key ? db.logs.where('exerciseId').anyOf(key.split('|')).toArray() : []), [key], [] as ExerciseLog[]);
  return useMemo(() => {
    const by = new Map<string, ExerciseLog[]>();
    for (const l of logs) by.set(l.exerciseId, [...(by.get(l.exerciseId) ?? []), l]);
    for (const [k, v] of by) by.set(k, v.sort((a, b) => b.date - a.date));
    const recs = new Map<string, Records>();
    for (const [k, v] of by) recs.set(k, computeRecords(v));
    return { by, recs };
  }, [logs]);
}

/** Series completadas (efectivas) de un ejercicio en esta sesión, en orden, hasta un punto. */
function doneWorkSetsBefore(s: Session, exerciseId: string, stopAt?: { ex: number; set: number }) {
  const out: { w: number; r: number }[] = [];
  for (let i = 0; i < s.exercises.length; i++) {
    const e = s.exercises[i];
    if (e.exerciseId !== exerciseId) continue;
    for (let j = 0; j < e.sets.length; j++) {
      if (stopAt && i === stopAt.ex && j === stopAt.set) return out;
      const x = e.sets[j];
      if (x.done && !x.isWarmup && x.weightKg != null && x.reps) out.push({ w: x.weightKg, r: x.reps });
    }
  }
  return out;
}

function ActiveSession({ session }: { session: Session }) {
  const settings = useSettings();
  const exMap = useExerciseMap();
  const desktop = useMediaQuery('(min-width: 900px)');
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();
  const history = useHistory(session.exercises.map((e) => e.exerciseId));
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [setMenu, setSetMenu] = useState<{ ex: number; set: number } | null>(null);
  const [exMenu, setExMenu] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const lock = useSessionLock(session.id);

  const focus = Math.min(session.focusIndex ?? 0, Math.max(0, session.exercises.length - 1));
  // El usuario puede plegar el ejercicio actual; se despliega de nuevo al cambiar de ejercicio.
  const [collapsed, setCollapsed] = useState(false);
  const rows = accordionState(session, settings.unit, collapsed);
  const headers = useRef(new Map<number, HTMLButtonElement>());
  const prevFocus = useRef(focus);
  useEffect(() => {
    if (focus === prevFocus.current) return;
    prevFocus.current = focus;
    setCollapsed(false);
    // Tras cerrar el anterior y abrir el siguiente, lleva su encabezado a la vista solo si quedó fuera
    // (block: 'nearest' evita saltos cuando ya se ve).
    const t = setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      headers.current.get(focus)?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }, 260);
    return () => clearTimeout(t);
  }, [focus]);
  const current = session.exercises[focus];
  const effort = showsEffort(settings);

  const totals = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const e of session.exercises) {
      for (const s of e.sets) {
        if (s.isWarmup) continue;
        total++;
        if (s.done) done++;
      }
    }
    return { done, total };
  }, [session]);

  const onToggle = async (exIdx: number, setIdx: number) => {
    unlockAudio();
    const ex = session.exercises[exIdx];
    const set = ex.sets[setIdx];
    if (set.done) {
      sfx('unset');
      await uncompleteSet(session.id, exIdx, setIdx);
      return;
    }
    sfx('set');
    haptic(12);
    const snap = snapshotBeforeComplete(session, exIdx);
    const undo = () => {
      sfx('unset');
      void undoComplete(session.id, snap);
    };
    const name = exMap.get(ex.exerciseId)?.name ?? '';
    let pr = false;
    if (!set.isWarmup && set.weightKg != null && set.reps) {
      const rec = history.recs.get(ex.exerciseId);
      if (rec) {
        const kinds = setPRs(rec, doneWorkSetsBefore(session, ex.exerciseId), { w: set.weightKg, r: set.reps });
        if (kinds.length) {
          pr = true;
          setTimeout(() => {
            sfx('pr');
            haptic([30, 60, 30]);
          }, 140);
          toast({ tone: 'pr', message: `Récord · ${kinds.map((k) => prLabel(k, showsAdvancedMetrics(settings))).join(' + ')} · ${name}`, durationMs: 4500, onAction: undo });
        }
      }
    }
    await completeSet(session.id, exIdx, setIdx, settings.defaultRestSec);
    // Un toque en ✓ arranca el descanso y puede cambiar de ejercicio: se puede deshacer unos segundos.
    if (!pr) {
      const n = ex.sets.slice(0, setIdx + 1).filter((x) => x.isWarmup === set.isWarmup).length;
      toast({ message: set.isWarmup ? `Calentamiento ${n} registrado` : `Serie ${n} registrada · ${name}`, durationMs: 3500, onAction: undo });
    }
  };

  const onFinish = async (save: boolean) => {
    setFinishing(false);
    if (!save) {
      const ok = await confirm({
        title: '¿Descartar la sesión?',
        body: 'Se borrarán todas las series registradas en esta sesión. No se puede deshacer.',
        confirmLabel: 'Descartar',
        danger: true,
      });
      if (!ok) return;
      await discardSession(session.id);
      navigate('/');
      return;
    }
    const s = await finishSession(session.id);
    if (s) {
      sfx('finish');
      haptic([20, 40, 20, 40, 60]);
    }
    if (s) navigate(`/sesion/resumen/${s.id}`, { replace: true });
  };

  return (
    <div className="page sess">
      {lock.readOnly && (
        <div className="ro-banner" role="alert">
          <span>
            <strong>Solo lectura.</strong> Esta sesión está abierta en otra pestaña o ventana; editarla en dos lugares haría que se
            pisen los cambios.
          </span>
          <button className="btn btn--sm" onClick={lock.takeOver}>
            Editar aquí
          </button>
        </div>
      )}
      <fieldset className="ro-wrap" disabled={lock.readOnly}>
      <SessionHeader session={session} done={totals.done} total={totals.total} onFinish={() => setFinishing(true)} />

      {session.exercises.length === 0 ? (
        <div className="empty">
          <span className="empty__title">Sesión libre sin ejercicios</span>
          <p>Agrega el primero; cada ejercicio se prellena con lo que hiciste la última vez.</p>
          <button className="btn btn--primary" onClick={() => setPicker({})}>
            <Icon name="plus" /> Agregar ejercicio
          </button>
        </div>
      ) : (
        <div className="sess__grid">
          <div className="sess__main">
            {session.exercises.map((ex, i) => {
              const row = rows[i];
              const exercise = exMap.get(ex.exerciseId);
              const name = exercise?.name ?? ex.exerciseId;
              const ss = !!ex.supersetGroup && (session.exercises[i - 1]?.supersetGroup === ex.supersetGroup || session.exercises[i + 1]?.supersetGroup === ex.supersetGroup);
              const complete = row.total > 0 && row.done === row.total;
              return (
                <Disclosure
                  key={ex.id}
                  variant="row"
                  className="sessx"
                  id={`ejercicio-${i + 1}`}
                  headerRef={(el) => {
                    if (el) headers.current.set(i, el);
                    else headers.current.delete(i);
                  }}
                  open={row.open}
                  onToggle={(o) => {
                    if (i === focus) setCollapsed(!o);
                    else if (o) setFocus(session.id, i);
                  }}
                  title={
                    <span className="sessx__title" data-status={row.status}>
                      <span className="sessx__name">
                        {ss && <span className="tag">Superset</span>} {name}
                      </span>
                      {row.open && (
                        <span className="sessx__target tnum">
                          {ex.targetSets ? `${ex.targetSets} × ${ex.repMin}–${ex.repMax}` : 'Sin objetivo'} · descanso {fmtClock(ex.restSec)}
                        </span>
                      )}
                    </span>
                  }
                  summary={
                    row.open ? undefined : complete ? (
                      <span className="sessx__ok" aria-label={`Completo, ${row.done} de ${row.total}`}>
                        <Icon name="check" size={18} stroke={2.5} />
                      </span>
                    ) : (
                      <span className="sessx__prog" aria-label={`${row.done} de ${row.total} series`}>
                        {row.done}/{row.total}
                      </span>
                    )
                  }
                  aside={
                    row.open && (
                      <button className="btn btn--ghost btn--icon" onClick={() => setExMenu(i)} aria-label={`Más opciones de ${name}`}>
                        <Icon name="more" />
                      </button>
                    )
                  }
                >
                  {row.open && (
                    <ExercisePanel
                      session={session}
                      index={i}
                      ex={ex}
                      exercise={exercise}
                      logs={history.by.get(ex.exerciseId) ?? []}
                      records={history.recs.get(ex.exerciseId)}
                      settings={settings}
                      onToggle={(j) => onToggle(i, j)}
                      onPatch={(j, patch) => updateSet(session.id, i, j, patch)}
                      onSetMenu={(j) => setSetMenu({ ex: i, set: j })}
                      onAddSet={() => addSet(session.id, i, false)}
                    />
                  )}
                </Disclosure>
              );
            })}
            <div className="sess__add">
              <button className="btn btn--sm" onClick={() => setPicker({})}>
                <Icon name="plus" /> Agregar ejercicio
              </button>
            </div>
          </div>

          {desktop && (
            <aside className="sess__side" aria-label="Contexto del ejercicio">
              {current && (
                <>
                  <span className="title-sm">{exMap.get(current.exerciseId)?.name}</span>
                  <HistoryBlock logs={history.by.get(current.exerciseId) ?? []} records={history.recs.get(current.exerciseId)} unit={settings.unit} advanced={showsAdvancedMetrics(settings)} />
                </>
              )}
            </aside>
          )}
        </div>
      )}

      <RestTimer session={session} />
      </fieldset>

      {picker && (
        <ExercisePicker
          title={picker.replace != null ? 'Reemplazar ejercicio' : 'Agregar ejercicio'}
          initialMuscle={picker.replace != null ? exMap.get(session.exercises[picker.replace].exerciseId)?.primaryMuscle : undefined}
          excludeIds={picker.replace != null ? [session.exercises[picker.replace].exerciseId] : undefined}
          onClose={() => setPicker(null)}
          onPick={async (e) => {
            if (picker.replace != null) {
              await replaceExercise(session.id, picker.replace, e.id);
              toast({ message: `Reemplazado por ${e.name}` });
            } else {
              await addExercise(session.id, e.id, settings.defaultRestSec);
            }
          }}
        />
      )}

      {setMenu && session.exercises[setMenu.ex]?.sets[setMenu.set] && (
        <SetMenuSheet
          session={session}
          exIdx={setMenu.ex}
          setIdx={setMenu.set}
          advanced={effort}
          onClose={() => setSetMenu(null)}
          onRemove={async () => {
            const snapshot = structuredClone(session.exercises[setMenu.ex]);
            const set = snapshot.sets[setMenu.set];
            setSetMenu(null);
            if (set.done) {
              const ok = await confirm({ title: '¿Eliminar esta serie registrada?', confirmLabel: 'Eliminar', danger: true });
              if (!ok) return;
            }
            await removeSet(session.id, setMenu.ex, setMenu.set);
            toast({
              message: 'Serie eliminada',
              onAction: () =>
                mutate(session.id, (s) => {
                  const e = s.exercises.find((x) => x.id === snapshot.id);
                  if (e) e.sets = snapshot.sets;
                }),
            });
          }}
        />
      )}

      {exMenu != null && session.exercises[exMenu] && (
        <ExerciseMenuSheet
          session={session}
          index={exMenu}
          exercise={exMap.get(session.exercises[exMenu].exerciseId)}
          settings={settings}
          onClose={() => setExMenu(null)}
          onWarmup={() => {
            void addSet(session.id, exMenu, true);
            setExMenu(null);
          }}
          onNote={() => {
            setNoteFor(session.exercises[exMenu].exerciseId);
            setExMenu(null);
          }}
          onHistory={() => {
            setHistoryFor(exMenu);
            setExMenu(null);
          }}
          onReplace={() => {
            setPicker({ replace: exMenu });
            setExMenu(null);
          }}
          onMove={(to) => {
            void moveExercise(session.id, exMenu, to);
            setExMenu(null);
          }}
          onRemove={async () => {
            const i = exMenu;
            const snapshot = structuredClone(session.exercises[i]);
            const name = exMap.get(snapshot.exerciseId)?.name;
            setExMenu(null);
            const ok = await confirm({
              title: `¿Quitar ${name} de la sesión?`,
              body: snapshot.sets.some((x) => x.done) ? 'Tiene series registradas; se quitarán también.' : undefined,
              confirmLabel: 'Quitar',
              danger: true,
            });
            if (!ok) return;
            await removeExercise(session.id, i);
            toast({ message: 'Ejercicio quitado', onAction: () => mutate(session.id, (s) => void s.exercises.splice(i, 0, snapshot)) });
          }}
        />
      )}

      {noteFor && exMap.get(noteFor) && <ExerciseNoteSheet exercise={exMap.get(noteFor)!} onClose={() => setNoteFor(null)} />}

      {historyFor != null && session.exercises[historyFor] && (
        <Sheet title={exMap.get(session.exercises[historyFor].exerciseId)?.name ?? 'Ejercicio'} eyebrow="Historial y récords" onClose={() => setHistoryFor(null)}>
          <HistoryBlock
            logs={history.by.get(session.exercises[historyFor].exerciseId) ?? []}
            records={history.recs.get(session.exercises[historyFor].exerciseId)}
            unit={settings.unit}
            advanced={showsAdvancedMetrics(settings)}
          />
        </Sheet>
      )}

      {finishing && (
        <Sheet
          title="Terminar sesión"
          eyebrow={session.dayName}
          onClose={() => setFinishing(false)}
          footer={
            <>
              <button className="btn btn--danger" onClick={() => onFinish(false)}>
                Descartar
              </button>
              <button className="btn btn--primary" onClick={() => onFinish(true)} disabled={totals.done === 0 && !session.exercises.some((e) => e.sets.some((x) => x.done))}>
                Guardar y terminar
              </button>
            </>
          }
        >
          <div className="stack">
            <p className="lead">
              {totals.done} de {totals.total} series registradas.
              {totals.total - totals.done > 0 && ` Las ${totals.total - totals.done} sin marcar no se guardan.`}
            </p>
            {totals.done === 0 && <p className="field__error">No hay series registradas: solo puedes descartar la sesión.</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function SessionHeader({ session, done, total, onFinish }: { session: Session; done: number; total: number; onFinish: () => void }) {
  const now = useNow(1000);
  const pct = total ? (done / total) * 100 : 0;
  return (
    <header className="sess__head">
      <div className="sess__bar">
        <Link to="/" className="btn btn--ghost btn--icon" aria-label="Salir a Hoy (la sesión sigue abierta)">
          <Icon name="left" />
        </Link>
        <div className="sess__title">
          <span className="sess__day">{session.dayName}</span>
          <span className="mono sess__elapsed" aria-label={`Tiempo transcurrido ${fmtClock((now - session.startedAt) / 1000)}`}>
            {fmtClock((now - session.startedAt) / 1000)}
          </span>
        </div>
        <button className="btn btn--text sess__finish" onClick={onFinish}>
          Terminar
        </button>
      </div>
      <div className="sess__progress">
        <div className="sess__track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Series registradas">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="sess__count tnum">
          {done} de {total} series
        </span>
      </div>
    </header>
  );
}

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  subir: 'Sube peso',
  reps: 'Más reps',
  mantener: 'Mantén',
  deload: 'Descarga',
};

interface PanelProps {
  session: Session;
  index: number;
  ex: SessionExercise;
  exercise?: Exercise;
  logs: ExerciseLog[];
  records?: Records;
  settings: Settings;
  onToggle: (setIdx: number) => void;
  onPatch: (setIdx: number, patch: Partial<SetEntry>) => void;
  onSetMenu: (setIdx: number) => void;
  onAddSet: () => void;
}

/** Etiquetas de serie: 1, 2, 3… para las efectivas y C1, C2… para los calentamientos. */
function setLabels(sets: SetEntry[]) {
  let work = 0;
  let warm = 0;
  return sets.map((s) => (s.isWarmup ? `C${++warm}` : String(++work)));
}

function useSuggestion(ex: SessionExercise, exercise: Exercise | undefined, logs: ExerciseLog[], settings: Settings) {
  const unit = settings.unit;
  return useMemo(
    () =>
      exercise
        ? suggest({
            logs,
            region: exercise.region,
            repMin: ex.repMin,
            repMax: ex.repMax,
            targetSets: ex.targetSets,
            incrementUpperKg: settings.incrementUpperKg,
            incrementLowerKg: settings.incrementLowerKg,
            unit,
          })
        : null,
    [logs, exercise, ex.repMin, ex.repMax, ex.targetSets, settings.incrementUpperKg, settings.incrementLowerKg, unit],
  );
}

function ExercisePanel({ session, index, ex, exercise, logs, records, settings, onToggle, onPatch, onSetMenu, onAddSet }: PanelProps) {
  const unit = settings.unit;
  const advanced = showsEffort(settings);
  const last = logs[0];
  const sug = useSuggestion(ex, exercise, logs, settings);
  const pendingWork = ex.sets.filter((s) => !s.done && !s.isWarmup);
  const applied = !!sug && pendingWork.length > 0 && pendingWork.every((s) => s.weightKg === sug.weightKg && s.reps === sug.reps);
  const firstPending = ex.sets.findIndex((s) => !s.done);
  const members = supersetMembers(session, index);

  // PRs por serie, calculados contra historial + series previas de esta sesión.
  const prsBySet: PRKind[][] = ex.sets.map((s, j) =>
    s.done && !s.isWarmup && s.weightKg != null && s.reps && records
      ? setPRs(records, doneWorkSetsBefore(session, ex.exerciseId, { ex: index, set: j }), { w: s.weightKg, r: s.reps })
      : [],
  );
  const labels = setLabels(ex.sets);

  // "La vez pasada" para la serie activa: la misma serie efectiva de la última sesión.
  const activeSet = ex.sets[firstPending];
  let hint: string | undefined;
  if (activeSet && !activeSet.isWarmup) {
    const n = Number(labels[firstPending]) - 1;
    const prev = last?.workSets[n];
    if (prev) hint = `la vez pasada ${fmtWeight(prev.w, unit)} × ${prev.r}`;
    else if (!last) hint = 'primera vez';
  }

  const pill =
    sug && pendingWork.length > 0 && activeSet && !activeSet.isWarmup ? (
      <div className="sugpill">
        <button
          className="sugpill__btn"
          disabled={applied}
          aria-pressed={applied}
          title={sug.reason}
          onClick={() => applyToPending(session.id, index, sug.weightKg, sug.reps)}
          aria-label={
            applied
              ? `Sugerencia aplicada: ${fmtWeight(sug.weightKg, unit)} ${unit} por ${sug.reps} reps`
              : `Aplicar sugerencia (${KIND_LABEL[sug.kind]}): ${sug.reason} ${fmtWeight(sug.weightKg, unit)} ${unit} por ${sug.reps} reps en las series pendientes`
          }
        >
          {applied && <Icon name="check" size={16} stroke={2.5} />}
          Sugerido · <span className="mono">{fmtWeight(sug.weightKg, unit)} × {sug.reps}</span>
        </button>
        <Help term="sugerencia" />
      </div>
    ) : null;

  return (
    <div className="panel">
      {members.length > 1 && (
        <p className="panel__ss">
          Superset {members.indexOf(index) + 1} de {members.length} · sin descanso entre ejercicios del grupo
        </p>
      )}
      {exercise?.note && <p className="panel__note">{exercise.note}</p>}

      <ol className="sets" data-advanced={advanced || undefined}>
        {ex.sets.map((s, j) => (
          <SetRow
            key={s.id}
            set={s}
            label={labels[j]}
            unit={unit}
            advanced={advanced}
            active={j === firstPending}
            prs={prsBySet[j]}
            hint={j === firstPending ? hint : undefined}
            footer={j === firstPending ? pill : undefined}
            onPatch={(patch) => onPatch(j, patch)}
            onToggle={() => onToggle(j)}
            onMenu={() => onSetMenu(j)}
          />
        ))}
      </ol>

      <button className="btn btn--text panel__add" onClick={onAddSet}>
        <Icon name="plus" size={18} /> Agregar serie
      </button>
    </div>
  );
}

/** Hoja "···" del ejercicio: lo ocasional (calentamiento, nota, discos, cambiar) fuera de la vista principal. */
function ExerciseMenuSheet({
  session,
  index,
  exercise,
  settings,
  onClose,
  onWarmup,
  onNote,
  onHistory,
  onReplace,
  onMove,
  onRemove,
}: {
  session: Session;
  index: number;
  exercise?: Exercise;
  settings: Settings;
  onClose: () => void;
  onWarmup: () => void;
  onNote: () => void;
  onHistory: () => void;
  onReplace: () => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const ex = session.exercises[index];
  const unit = settings.unit;
  const labels = setLabels(ex.sets);
  const firstPending = ex.sets.findIndex((s) => !s.done);
  const plateSetIdx = firstPending !== -1 ? firstPending : ex.sets.length - 1;
  const plateSet = ex.sets[plateSetIdx];
  const plates =
    exercise?.equipment === 'barra' && plateSet?.weightKg != null
      ? { weightKg: plateSet.weightKg, barKg: barKgFor(settings.barKg, unit), label: `${plateSet.isWarmup ? 'calentamiento' : 'serie'} ${labels[plateSetIdx]}` }
      : null;
  return (
    <Sheet title={exercise?.name ?? 'Ejercicio'} eyebrow={`Ejercicio ${index + 1} de ${session.exercises.length}`} onClose={onClose}>
      <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
        {plates && <PlatesLine {...plates} unit={unit} />}
        <div className="menu">
          <button onClick={onWarmup}>
            <Icon name="plus" /> Agregar calentamiento
          </button>
          {exercise && (
            <button onClick={onNote}>
              <Icon name="edit" /> {exercise.note ? 'Editar nota del ejercicio' : 'Nota del ejercicio'}
            </button>
          )}
          <button onClick={onHistory}>
            <Icon name="list" /> Historial y récords
          </button>
          <button onClick={onReplace}>
            <Icon name="swap" /> Cambiar por otro de {MUSCLE_LABEL[exercise?.primaryMuscle ?? 'pecho'].toLowerCase()}
          </button>
          <button disabled={index === 0} onClick={() => onMove(index - 1)}>
            <Icon name="up" /> Mover antes
          </button>
          <button disabled={index === session.exercises.length - 1} onClick={() => onMove(index + 1)}>
            <Icon name="down" /> Mover después
          </button>
          <Link to={`/progreso/${ex.exerciseId}`}>
            <Icon name="arrow" /> Ver progreso (la sesión sigue abierta)
          </Link>
          <button className="menu__danger" onClick={onRemove}>
            <Icon name="trash" /> Quitar de la sesión
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** Discos por lado para la serie que sigue (solo ejercicios con barra). */
function PlatesLine({ weightKg, barKg, label, unit }: { weightKg: number; barKg: number; label: string; unit: Settings['unit'] }) {
  const r = platesPerSide(weightKg, barKg, unit);
  const n = (v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
  return (
    <p className="plates" aria-live="polite">
      <span className="eyebrow">Discos por lado · {label}</span>
      <span className="plates__row mono">
        {r.belowBar
          ? `Menos que la barra (${n(toDisplay(barKg, unit))} ${unit})`
          : r.perSide.length === 0
            ? 'Solo la barra'
            : r.perSide.map((p, i) => (
                <span key={i} className="plate" data-size={p >= (unit === 'kg' ? 20 : 45) ? 'l' : p >= (unit === 'kg' ? 10 : 25) ? 'm' : 's'}>
                  {n(p)}
                </span>
              ))}
        {!r.belowBar && r.remainder > 0 && <span className="muted"> + {n(r.remainder)} {unit} que no salen con discos</span>}
      </span>
    </p>
  );
}

function ExerciseNoteSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [text, setText] = useState(exercise.note ?? '');
  const save = async (note: string) => {
    await db.exercises.update(exercise.id, { note: note.trim() || undefined });
    onClose();
  };
  return (
    <Sheet
      title={exercise.name}
      eyebrow="Nota del ejercicio"
      onClose={onClose}
      footer={
        <div className="cluster">
          <button className="btn btn--primary" onClick={() => save(text)}>
            Guardar
          </button>
          {exercise.note && (
            <button className="btn btn--ghost" onClick={() => save('')}>
              Quitar nota
            </button>
          )}
        </div>
      }
    >
      <label className="field">
        <span className="field__label">Se muestra cada vez que hagas este ejercicio</span>
        <textarea
          className="textarea"
          value={text}
          maxLength={MAX_NOTE}
          placeholder="Asiento en 4, agarre cerrado, pausa abajo…"
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <span className="field__hint">
          {text.length}/{MAX_NOTE}
        </span>
      </label>
    </Sheet>
  );
}

function HistoryBlock({ logs, records, unit, advanced }: { logs: ExerciseLog[]; records?: Records; unit: Settings['unit']; advanced: boolean }) {
  if (logs.length === 0) {
    return (
      <section className="side-block">
        <div className="section-head">
          <span className="eyebrow eyebrow--ink">Historial</span>
        </div>
        <p className="small muted">Sin registros previos. Lo que hagas hoy será tu referencia.</p>
      </section>
    );
  }
  return (
    <section className="side-block">
      <div className="section-head">
        <span className="eyebrow eyebrow--ink">Récords</span>
      </div>
      {records && (
        <div className="stat-row" style={{ '--cols': 2 } as React.CSSProperties}>
          <div className="stat">
            <span className="eyebrow">Peso máx.</span>
            <span className="num-md">
              {fmtWeight(records.bestWeight, unit)}
              <span className="unit">{unit}</span>
            </span>
          </div>
          {advanced ? (
            <div className="stat">
              <span className="eyebrow">1RM est.</span>
              <span className="num-md">
                {fmtWeight(records.best1RM, unit)}
                <span className="unit">{unit}</span>
              </span>
            </div>
          ) : (
            <div className="stat">
              <span className="eyebrow">Sesiones</span>
              <span className="num-md">{logs.length}</span>
            </div>
          )}
        </div>
      )}
      <div className="section-head" style={{ marginTop: 16 }}>
        <span className="eyebrow eyebrow--ink">Últimas sesiones</span>
      </div>
      <ol className="hist-mini">
        {logs.slice(0, 4).map((l) => (
          <li key={l.id}>
            <span className="eyebrow">{fmtDateShort(l.date)}</span>
            <span className="mono small">{l.workSets.map((s) => `${fmtWeight(s.w, unit)}×${s.r}`).join('  ')}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SetMenuSheet({ session, exIdx, setIdx, advanced, onClose, onRemove }: { session: Session; exIdx: number; setIdx: number; advanced: boolean; onClose: () => void; onRemove: () => void }) {
  const set = session.exercises[exIdx].sets[setIdx];
  const [rpe, setRpe] = useState(set.rpe == null ? '' : String(set.rpe));
  const rpeNum = Number(rpe.replace(',', '.'));
  const rpeBad = rpe !== '' && (!Number.isFinite(rpeNum) || rpeNum < 1 || rpeNum > 10);
  return (
    <Sheet title={`Serie ${setIdx + 1}`} eyebrow={set.isWarmup ? 'Calentamiento' : 'Serie efectiva'} onClose={onClose}>
      <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
        <div className="menu">
          <button
            onClick={() => {
              updateSet(session.id, exIdx, setIdx, { isWarmup: !set.isWarmup });
              onClose();
            }}
          >
            <Icon name="check" /> {set.isWarmup ? 'Marcar como serie efectiva' : 'Marcar como calentamiento'}
          </button>
          <button className="menu__danger" onClick={onRemove}>
            <Icon name="trash" /> Eliminar serie
          </button>
        </div>
        {advanced && (
          <div className="field">
            <label className="field__label" htmlFor="rpe">
              RPE (1–10)
            </label>
            <input
              id="rpe"
              className="input input--num"
              inputMode="decimal"
              value={rpe}
              aria-invalid={rpeBad || undefined}
              onChange={(e) => {
                const t = e.target.value.replace(/[^\d.,]/g, '');
                setRpe(t);
                const n = Number(t.replace(',', '.'));
                if (t === '') updateSet(session.id, exIdx, setIdx, { rpe: null });
                else if (Number.isFinite(n) && n >= 1 && n <= 10) updateSet(session.id, exIdx, setIdx, { rpe: n });
              }}
            />
            <span className="field__hint">RPE 10 = al fallo; 8 = te quedaban ~2 reps. El RIR se anota en la tabla.</span>
            {rpeBad && <span className="field__error">Escribe un valor entre 1 y 10.</span>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
