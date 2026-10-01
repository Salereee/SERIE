import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useSettings } from '../../db/hooks';
import type { Program } from '../../db/schema';
import { uid } from '../../domain/ids';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
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
  const [menu, setMenu] = useState(false);
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
        <Link to="/programas" className="btn btn--text back-link">
          <Icon name="left" size={18} /> Rutinas
        </Link>
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
              <h1 className="title-xl">{program.name}</h1>
              {advanced && (
                <button className="btn btn--ghost btn--icon" onClick={() => setEditingName(true)} aria-label="Renombrar programa">
                  <Icon name="edit" />
                </button>
              )}
            </div>
          )}
          <button className="btn btn--ghost btn--icon" onClick={() => setMenu(true)} aria-label={`Más opciones de ${program.name}`}>
            <Icon name="more" />
          </button>
        </div>
        <div className="cluster prog__meta">
          <span className="eyebrow">
            {program.days.length} días · {program.days.reduce((a, d) => a + d.items.length, 0)} ejercicios
          </span>
          {isActive ? (
            <span className="dot-live">Activo</span>
          ) : (
            <button
              className="btn btn--sm"
              onClick={async () => {
                await updateSettings({ activeProgramId: program.id });
                toast({ message: 'Programa activado' });
              }}
            >
              Activar
            </button>
          )}
        </div>
      </header>

      {advanced ? (
        <Builder program={program} />
      ) : (
        <div className="stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <div className="reminder">
            <p className="small">Para editar ejercicios, activa el modo avanzado.</p>
            <button className="btn btn--sm" onClick={() => updateSettings({ mode: 'avanzado' })}>
              Activar
            </button>
          </div>
          <DaysTable days={program.days} wide />

        </div>
      )}

      {sharing && <ShareSheet program={program} onClose={() => setSharing(false)} />}

      {menu && (
        <Sheet title={program.name} eyebrow="Programa" onClose={() => setMenu(false)}>
          <div className="menu">
            <button
              onClick={() => {
                setMenu(false);
                setSharing(true);
              }}
            >
              <Icon name="link" /> Compartir
            </button>
            <button
              onClick={() => {
                setMenu(false);
                void duplicate();
              }}
            >
              <Icon name="plus" /> Duplicar
            </button>
            <button
              className="menu__danger"
              onClick={() => {
                setMenu(false);
                void remove();
              }}
            >
              <Icon name="trash" /> Borrar programa
            </button>
          </div>
        </Sheet>
      )}

      <section className="stack" aria-label="Empezar un día">
        <div className="section-head">
          <span className="eyebrow eyebrow--ink">Empezar un día</span>
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
