import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useSettings } from '../../db/hooks';
import type { Program } from '../../db/schema';
import { uid } from '../../domain/ids';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Meta } from '../../ui/Meta';
import { useStartSession } from '../session/useStartSession';
import { Builder } from './Builder';
import { ShareSheet } from './ShareSheet';
import { DaysTable } from './TemplatePreview';
import './programs.css';

export function ProgramPage() {
  const { id } = useParams();
  const program = useLiveQuery(() => db.programs.get(id!), [id], null);
  const settings = useSettings();
  const navigate = useNavigate();
  const { confirm, toast } = useFeedback();
  const [editingName, setEditingName] = useState(false);
  const [sharing, setSharing] = useState(false);
  const start = useStartSession();

  if (program === null) return null;
  if (!program) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty__title">Este programa ya no existe</span>
          <p>Puede que lo hayas borrado. Vuelve a la lista para elegir otro.</p>
          <Link to="/programas" className="btn">
            Ver programas
          </Link>
        </div>
      </div>
    );
  }

  const advanced = settings.mode === 'avanzado';
  const isActive = settings.activeProgramId === program.id;

  const remove = async () => {
    const ok = await confirm({
      title: `¿Borrar “${program.name}”?`,
      body: 'Tu historial de sesiones se conserva; solo se elimina la plantilla del programa.',
      confirmLabel: 'Borrar programa',
      danger: true,
    });
    if (!ok) return;
    const snapshot = program;
    await db.programs.delete(program.id);
    if (isActive) await updateSettings({ activeProgramId: undefined });
    navigate('/programas');
    toast({
      message: 'Programa borrado',
      onAction: async () => {
        await db.programs.put(snapshot);
        if (isActive) await updateSettings({ activeProgramId: snapshot.id });
      },
    });
  };

  const duplicate = async () => {
    const now = Date.now();
    const copy: Program = {
      ...structuredClone(program),
      id: uid(),
      name: `${program.name} (copia)`,
      isDemo: undefined,
      createdAt: now,
      updatedAt: now,
    };
    copy.days = copy.days.map((d) => ({ ...d, id: uid(), items: d.items.map((i) => ({ ...i, id: uid() })) }));
    await db.programs.add(copy);
    navigate(`/programas/${copy.id}`);
    toast({ message: 'Programa duplicado' });
  };

  const rename = async (name: string) => {
    const n = name.trim();
    if (n) await db.programs.update(program.id, { name: n, updatedAt: Date.now() });
    setEditingName(false);
  };

  return (
    <div className="page">
      <header className="page-head">
        <Link to="/programas" className="link-btn small" style={{ width: 'fit-content' }}>
          <Icon name="left" size={16} /> Programas
        </Link>
        <Meta parts={[`${program.days.length} días`, `${program.days.reduce((a, d) => a + d.items.length, 0)} ejercicios`, isActive && 'activo']} />
        <div className="page-head__row">
          {advanced && editingName ? (
            <input
              className="input title-md"
              defaultValue={program.name}
              autoFocus
              aria-label="Nombre del programa"
              onBlur={(e) => rename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setEditingName(false);
              }}
              style={{ maxWidth: 520 }}
            />
          ) : (
            <div className="title-edit">
              <h1 className="title-lg">{program.name}</h1>
              {advanced && (
                <button className="btn btn--ghost btn--icon" onClick={() => setEditingName(true)} aria-label="Renombrar programa">
                  <Icon name="edit" />
                </button>
              )}
            </div>
          )}
          <div className="cluster">
            {!isActive && (
              <button
                className="btn btn--primary"
                onClick={async () => {
                  await updateSettings({ activeProgramId: program.id });
                  toast({ message: 'Programa activado' });
                }}
              >
                Activar
              </button>
            )}
            <button className="btn" onClick={() => setSharing(true)}>
              Compartir
            </button>
            <button className="btn" onClick={duplicate}>
              Duplicar
            </button>
            <button className="btn btn--danger" onClick={remove}>
              Borrar
            </button>
          </div>
        </div>
      </header>

      {advanced ? (
        <Builder program={program} />
      ) : (
        <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <div className="note">
            <span>
              En modo básico el programa se usa tal cual. Para cambiar ejercicios, series, reps o descansos, activa el modo
              avanzado; nada de lo que ya registraste se pierde.
            </span>
            <div>
              <button className="btn btn--sm" onClick={() => updateSettings({ mode: 'avanzado' })}>
                Cambiar a modo avanzado
              </button>
            </div>
          </div>
          <DaysTable days={program.days} wide />

        </div>
      )}

      {sharing && <ShareSheet program={program} onClose={() => setSharing(false)} />}

      <section className="stack" aria-label="Empezar un día">
        <div className="section-head">
          <span className="eyebrow eyebrow--ink">Empezar un día concreto</span>
        </div>
        <div className="cluster">
          {program.days.map((d) => (
            <button
              key={d.id}
              className="btn btn--sm"
              onClick={() => start({ program, dayId: d.id })}
            >
              {d.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
