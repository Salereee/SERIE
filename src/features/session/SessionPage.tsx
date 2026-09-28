import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { useActiveSession, useExerciseMap, useSettings } from '../../db/hooks';
import type { Exercise, ExerciseLog, PRKind, Session, SessionExercise, SetEntry, Settings } from '../../db/schema';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/schema';
import { fmtClock, fmtDateShort, fmtRelativeDay } from '../../domain/format';
import { setsVolume, workSets } from '../../domain/logs';
import { suggest, type Suggestion } from '../../domain/progression';
import { computeRecords, PR_LABEL, setPRs, type Records } from '../../domain/records';
import { fmtVolume, fmtWeight } from '../../domain/units';
import { haptic, sfx, unlockAudio } from '../../hooks/audio';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useFeedback } from '../../ui/feedback';
import { Disclosure, useOpenSections } from '../../ui/Disclosure';
import { Icon } from '../../ui/Icon';
import { Meta } from '../../ui/Meta';
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
  setNotes,
  supersetMembers,
  uncompleteSet,
  updateSet,
} from './actions';
import { RestTimer } from './RestTimer';
import { SetRow } from './SetRow';
import { accordionState } from './accordion';
import { useSessionLock } from './useSessionLock';
import './session.css';

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

const closedByDefault = () => false;

function historySummary(r: Records | undefined, unit: Settings['unit']) {
  if (!r || r.sessions === 0) return 'Sin registros';
  return `Récord ${fmtWeight(r.bestWeight, unit)} ${unit} · ${r.sessions} ${r.sessions === 1 ? 'sesión' : 'sesiones'}`;
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
  const [finishing, setFinishing] = useState(false);
  const extra = useOpenSections('sesion', closedByDefault);
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
  const advanced = settings.mode === 'avanzado';

  const totals = useMemo(() => {
    let done = 0;
    let total = 0;
    let vol = 0;
    for (const e of session.exercises) {
      for (const s of e.sets) {
        if (s.isWarmup) continue;
        total++;
        if (s.done) done++;
      }
      vol += setsVolume(workSets(e.sets));
    }
    return { done, total, vol };
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
    if (!set.isWarmup && set.weightKg != null && set.reps) {
      const rec = history.recs.get(ex.exerciseId);
      if (rec) {
        const kinds = setPRs(rec, doneWorkSetsBefore(session, ex.exerciseId), { w: set.weightKg, r: set.reps });
        if (kinds.length) {
          const name = exMap.get(ex.exerciseId)?.name ?? '';
          setTimeout(() => {
            sfx('pr');
            haptic([30, 60, 30]);
          }, 140);
          toast({ tone: 'pr', message: `Récord · ${kinds.map((k) => PR_LABEL[k]).join(' + ')} · ${name}`, durationMs: 4500 });
        }
      }
    }
    await completeSet(session.id, exIdx, setIdx, settings.defaultRestSec);
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

  const stats = (
    <div className="rest__stats">
      <span>
        <span className="eyebrow">Series</span>
        <span className="mono">
          {totals.done}/{totals.total}
        </span>
      </span>
      <span>
        <span className="eyebrow">Volumen</span>
        <span className="mono">
          {fmtVolume(totals.vol, settings.unit)} {settings.unit}
        </span>
      </span>
    </div>
  );

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
      <SessionHeader session={session} onFinish={() => setFinishing(true)} />

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
            <div className="sess__listhead">
              <span className="eyebrow">
                {session.exercises.length} ejercicios · {totals.done}/{totals.total} series
              </span>
            </div>
            {session.exercises.map((ex, i) => {
              const row = rows[i];
              const exercise = exMap.get(ex.exerciseId);
              const ss = !!ex.supersetGroup && (session.exercises[i - 1]?.supersetGroup === ex.supersetGroup || session.exercises[i + 1]?.supersetGroup === ex.supersetGroup);
              return (
                <Disclosure
                  key={ex.id}
                  variant="row"
                  sticky={row.open}
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
                      <span className="sessx__idx mono">{row.status === 'hecho' ? <Icon name="check" size={16} stroke={2.5} /> : String(i + 1).padStart(2, '0')}</span>
                      <span className="sessx__name">
                        {ss && <span className="tag">SS</span>} {exercise?.name ?? ex.exerciseId}
                      </span>
                    </span>
                  }
                  summary={
                    <span className="sessx__sum">
                      <span className="sessx__prog">
                        {row.done}/{row.total}
                      </span>
                      {!row.open && <span className="sessx__detail">{row.summary}</span>}
                    </span>
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
                      onExMenu={() => setExMenu(i)}
                      onAddSet={(warmup) => addSet(session.id, i, warmup)}
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

            {!desktop && current && (
              <div className="sess__extra">
                <Disclosure
                  title={`Historial · ${exMap.get(current.exerciseId)?.name ?? ''}`}
                  summary={historySummary(history.recs.get(current.exerciseId), settings.unit)}
                  open={extra.isOpen('historial')}
                  onToggle={(o) => extra.setOpen('historial', o)}
                >
                  <HistoryBlock logs={history.by.get(current.exerciseId) ?? []} records={history.recs.get(current.exerciseId)} unit={settings.unit} />
                </Disclosure>
                <Disclosure
                  title="Notas de la sesión"
                  summary={session.notes?.trim() ? session.notes.trim().slice(0, 28) + (session.notes.trim().length > 28 ? '…' : '') : 'Sin notas'}
                  open={extra.isOpen('notas')}
                  onToggle={(o) => extra.setOpen('notas', o)}
                >
                  <NotesBlock session={session} />
                </Disclosure>
              </div>
            )}
          </div>

          {desktop && (
            <aside className="sess__side" aria-label="Contexto del ejercicio">
              {current && (
                <>
                  <span className="eyebrow">{exMap.get(current.exerciseId)?.name}</span>
                  <HistoryBlock logs={history.by.get(current.exerciseId) ?? []} records={history.recs.get(current.exerciseId)} unit={settings.unit} />
                </>
              )}
              <NotesBlock session={session} />
            </aside>
          )}
        </div>
      )}

      <RestTimer session={session} stats={stats} />
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
          advanced={advanced}
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
        <Sheet title={exMap.get(session.exercises[exMenu].exerciseId)?.name ?? 'Ejercicio'} eyebrow={`Ejercicio ${exMenu + 1} de ${session.exercises.length}`} onClose={() => setExMenu(null)}>
          <div className="menu">
            <button
              onClick={() => {
                setPicker({ replace: exMenu });
                setExMenu(null);
              }}
            >
              <Icon name="swap" /> Reemplazar por otro de {MUSCLE_LABEL[exMap.get(session.exercises[exMenu].exerciseId)?.primaryMuscle ?? 'pecho']}
            </button>
            <button disabled={exMenu === 0} onClick={() => (moveExercise(session.id, exMenu, exMenu - 1), setExMenu(null))}>
              <Icon name="up" /> Mover antes
            </button>
            <button disabled={exMenu === session.exercises.length - 1} onClick={() => (moveExercise(session.id, exMenu, exMenu + 1), setExMenu(null))}>
              <Icon name="down" /> Mover después
            </button>
            <Link to={`/progreso/${session.exercises[exMenu].exerciseId}`}>
              <Icon name="arrow" /> Ver progreso (la sesión sigue abierta)
            </Link>
            <button
              className="menu__danger"
              onClick={async () => {
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
            >
              <Icon name="trash" /> Quitar de la sesión
            </button>
          </div>
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

function SessionHeader({ session, onFinish }: { session: Session; onFinish: () => void }) {
  const now = useNow(1000);
  return (
    <header className="sess__head">
      <Link to="/" className="btn btn--ghost btn--icon" aria-label="Salir a Hoy (la sesión sigue abierta)">
        <Icon name="left" />
      </Link>
      <div className="sess__title">
        <span className="eyebrow">{session.dayName}</span>
        <span className="mono sess__elapsed" aria-label={`Tiempo transcurrido ${fmtClock((now - session.startedAt) / 1000)}`}>
          {fmtClock((now - session.startedAt) / 1000)}
        </span>
      </div>
      <button className="btn btn--sm btn--primary" onClick={onFinish}>
        Terminar
      </button>
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
  onExMenu: () => void;
  onAddSet: (warmup: boolean) => void;
}

function ExercisePanel({ session, index, ex, exercise, logs, records, settings, onToggle, onPatch, onSetMenu, onExMenu, onAddSet }: PanelProps) {
  const unit = settings.unit;
  const advanced = settings.mode === 'avanzado';
  const last = logs[0];
  const sug = useMemo(
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

  let work = 0;
  let warm = 0;
  const labels = ex.sets.map((s) => (s.isWarmup ? `C${++warm}` : String(++work)));

  return (
    <div className="panel">
      <div className="panel__meta">
        <Meta
          parts={[
            `${String(index + 1).padStart(2, '0')} / ${String(session.exercises.length).padStart(2, '0')}`,
            exercise && MUSCLE_LABEL[exercise.primaryMuscle],
            exercise && EQUIPMENT_LABEL[exercise.equipment],
          ]}
        />
        <button className="btn btn--ghost btn--icon" onClick={onExMenu} aria-label="Opciones del ejercicio">
          <Icon name="more" />
        </button>
      </div>
      {members.length > 1 && (
        <p className="panel__ss">
          <span className="tag">Superset</span> {members.indexOf(index) + 1} de {members.length} · sin descanso entre ejercicios del grupo
        </p>
      )}
      <p className="panel__target mono">
        {ex.targetSets ? `${ex.targetSets} × ${ex.repMin}–${ex.repMax}` : 'Sin objetivo'} · descanso {fmtClock(ex.restSec)}
      </p>

      <div className="panel__last">
        <span className="eyebrow">{last ? `Última vez · ${fmtRelativeDay(last.date)}` : 'Primera vez'}</span>
        {last ? (
          <span className="panel__lastsets mono">
            {last.workSets.map((s, i) => (
              <span key={i}>
                {fmtWeight(s.w, unit)}×{s.r}
              </span>
            ))}
          </span>
        ) : (
          <span className="small muted">Elige un peso con el que llegues a {ex.repMin ?? 8} reps con buena técnica.</span>
        )}
      </div>

      {sug && pendingWork.length > 0 && (
        <div className="sug" data-kind={sug.kind}>
          <div className="sug__text">
            <span className="eyebrow eyebrow--ink">Sugerencia · {KIND_LABEL[sug.kind]}</span>
            <span className="small">{sug.reason}</span>
          </div>
          <button
            className="btn btn--sm"
            disabled={applied}
            onClick={() => applyToPending(session.id, index, sug.weightKg, sug.reps)}
            aria-label={`Aplicar sugerencia: ${fmtWeight(sug.weightKg, unit)} ${unit} por ${sug.reps} reps en las series pendientes`}
          >
            {applied ? (
              'Aplicada'
            ) : (
              <span className="mono">
                {fmtWeight(sug.weightKg, unit)}×{sug.reps}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="sets" data-advanced={advanced || undefined}>
        <div className="sets__head" aria-hidden="true">
          <span>Serie</span>
          <span>Peso {unit}</span>
          <span>Reps</span>
          {advanced && <span>RIR</span>}
          <span />
        </div>
        <ol>
          {ex.sets.map((s, j) => (
            <SetRow
              key={s.id}
              set={s}
              label={labels[j]}
              unit={unit}
              advanced={advanced}
              active={j === firstPending}
              prs={prsBySet[j]}
              onPatch={(patch) => onPatch(j, patch)}
              onToggle={() => onToggle(j)}
              onMenu={() => onSetMenu(j)}
            />
          ))}
        </ol>
      </div>

      <div className="panel__tools">
        <button className="btn btn--sm" onClick={() => onAddSet(false)}>
          <Icon name="plus" size={16} /> Serie
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => onAddSet(true)}>
          <Icon name="plus" size={16} /> Calentamiento
        </button>
      </div>
    </div>
  );
}

function HistoryBlock({ logs, records, unit }: { logs: ExerciseLog[]; records?: Records; unit: Settings['unit'] }) {
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
          <div className="stat">
            <span className="eyebrow">1RM est.</span>
            <span className="num-md">
              {fmtWeight(records.best1RM, unit)}
              <span className="unit">{unit}</span>
            </span>
          </div>
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

function NotesBlock({ session }: { session: Session }) {
  return (
    <section className="side-block">
      <label className="section-head" htmlFor="sess-notes">
        <span className="eyebrow eyebrow--ink">Notas de la sesión</span>
      </label>
      <textarea
        id="sess-notes"
        className="textarea"
        defaultValue={session.notes}
        placeholder="Cómo te sentiste, ajustes de máquina, molestias…"
        onBlur={(e) => e.target.value !== (session.notes ?? '') && setNotes(session.id, e.target.value)}
      />
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
