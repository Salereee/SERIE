import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useExerciseMap, useSettings } from '../../db/hooks';
import { decodeProgram, ShareError, type SharedRoutine } from '../../domain/shareProgram';
import { useFeedback } from '../../ui/feedback';
import { Meta } from '../../ui/Meta';
import { DaysTable } from './TemplatePreview';
import './programs.css';

type State = { status: 'leyendo' } | { status: 'lista'; routine: SharedRoutine; duplicate: boolean } | { status: 'error'; message: string };

/**
 * Abre un enlace de "Compartir rutina" (`/importar#r=…`). Muestra la rutina antes de guardar nada:
 * el usuario decide si la guarda. Funciona también en un dispositivo recién estrenado (sin bienvenida).
 */
export function ImportProgramPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const settings = useSettings();
  const exercises = useExerciseMap();
  const { toast } = useFeedback();
  const [state, setState] = useState<State>({ status: 'leyendo' });
  const [makeActive, setMakeActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const code = new URLSearchParams(location.hash.slice(1)).get('r') ?? '';

  useEffect(() => {
    // Espera a que el catálogo de ejercicios esté cargado para validar contra él.
    if (exercises.size === 0) return;
    let cancelled = false;
    decodeProgram(code, exercises)
      .then(async (routine) => {
        const same = await db.programs.filter((p) => p.name === routine.program.name).count();
        if (!cancelled) setState({ status: 'lista', routine, duplicate: same > 0 });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof ShareError ? e.message : 'La rutina del enlace no es válida.' });
      });
    return () => {
      cancelled = true;
    };
  }, [code, exercises]);

  const save = async () => {
    if (state.status !== 'lista' || saving) return;
    setSaving(true);
    const { program, newExercises } = state.routine;
    const name = state.duplicate ? `${program.name} (compartida)` : program.name;
    await db.transaction('rw', db.exercises, db.programs, async () => {
      await db.exercises.bulkPut(newExercises);
      await db.programs.add({ ...program, name });
    });
    // En un dispositivo nuevo la rutina basta para empezar: no hace falta el cuestionario.
    await updateSettings({ ...(makeActive ? { activeProgramId: program.id } : {}), ...(settings.onboardingDone ? {} : { onboardingDone: true }) });
    toast({ message: 'Rutina guardada' });
    navigate(`/programas/${program.id}`, { replace: true, state: { onboarded: true } });
  };

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Rutina compartida</span>
        <h1 className="title-lg">{state.status === 'lista' ? state.routine.program.name : state.status === 'error' ? 'No se pudo abrir la rutina' : 'Abriendo la rutina…'}</h1>
      </header>

      {state.status === 'error' && (
        <div className="stack">
          <p>{state.message}</p>
          <div>
            <Link className="btn" to="/" replace>
              Ir a SERIE
            </Link>
          </div>
        </div>
      )}

      {state.status === 'lista' && (
        <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
          <Meta
            parts={[
              `${state.routine.program.days.length} días`,
              `${state.routine.program.days.reduce((a, d) => a + d.items.length, 0)} ejercicios`,
              state.routine.newExercises.length > 0 && `${state.routine.newExercises.length} propios`,
            ]}
          />
          <p className="muted" style={{ maxWidth: '60ch' }}>
            Revisa la rutina antes de guardarla. Se agrega como una rutina nueva: no reemplaza ni cambia nada de lo que ya tienes.
            {state.duplicate && ' Ya tienes una rutina con este nombre; esta se guardará como “(compartida)”.'}
          </p>
          <DaysTable days={state.routine.program.days} extra={state.routine.newExercises} wide />
          <label className="check">
            <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
            <span>Usarla como programa activo (Hoy te sugerirá sus días)</span>
          </label>
          <div className="cluster">
            <button className="btn btn--primary" onClick={save} disabled={saving}>
              Guardar rutina
            </button>
            <Link className="btn btn--ghost" to="/" replace>
              Cancelar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
