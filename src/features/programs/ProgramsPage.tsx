import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useSettings } from '../../db/hooks';
import type { EquipmentProfile, Program } from '../../db/schema';
import { EQUIPMENT_PROFILE_LABEL, TEMPLATES, TEMPLATE_BY_KEY, buildProgram, type TemplateKey } from '../../db/seed/programs';
import { fmtDateShort } from '../../domain/format';
import { uid } from '../../domain/ids';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { DaysTable } from './TemplatePreview';
import { RUTINAS_NAV, SegNav } from '../../ui/SegNav';
import './programs.css';

export function ProgramsPage() {
  const programs = useLiveQuery(() => db.programs.orderBy('updatedAt').reverse().toArray(), [], undefined);
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const creating = params.get('nuevo') === '1';
  const setCreating = (v: boolean) => setParams(v ? { nuevo: '1' } : {}, { replace: true });
  const active = programs?.find((p) => p.id === settings.activeProgramId);
  const { toast } = useFeedback();

  if (!programs) return null;

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title-xl">Rutinas</h1>
        <SegNav items={RUTINAS_NAV} label="Rutinas" />
      </header>

      {programs.length === 0 ? (
        <div className="empty">
          <span className="empty__title">Todavía no tienes un programa</span>
          <p>
            Responde 4 preguntas y te recomiendo un split, o elige una plantilla (Full Body, Torso/Pierna, PPL, PHUL, Arnold o
            Bro Split). También puedes entrenar sin programa con una sesión libre desde Hoy.
          </p>
          <div className="cluster">
            <Link className="btn btn--primary" to="/bienvenida?paso=preguntas">
              Responder cuestionario
            </Link>
            <button className="btn" onClick={() => setCreating(true)}>
              Ver plantillas
            </button>
          </div>
        </div>
      ) : (
        <div className="grid12">
          <section className="span-5 stack" aria-label="Mis programas" style={{ '--gap': '8px' } as React.CSSProperties}>
            <ul className="prog-cards">
              {programs.map((p) => {
                const isActive = p.id === settings.activeProgramId;
                return (
                  <li key={p.id} className="card prog-card" data-active={isActive || undefined}>
                    <Link to={`/programas/${p.id}`} className="prog-card__link">
                      <span className="prog-card__name">{p.name}</span>
                      <span className="eyebrow">
                        {p.days.length} días · editado {fmtDateShort(p.updatedAt)}
                      </span>
                      {isActive && <span className="dot-live">Activo</span>}
                    </Link>
                    {isActive ? (
                      <Icon name="right" className="prog-card__chev" />
                    ) : (
                      <button
                        className="btn btn--sm"
                        onClick={async () => {
                          await updateSettings({ activeProgramId: p.id });
                          toast({ message: `Programa activo: ${p.name}` });
                        }}
                      >
                        Activar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <button className="btn btn--sm prog-new" onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} /> Nuevo programa
            </button>
          </section>
          <section className="span-7 desktop-only" aria-labelledby="activo-titulo">
            {active ? (
              <div className="stack">
                <div className="section-head">
                  <h2 id="activo-titulo" className="eyebrow eyebrow--ink">
                    {active.name}
                  </h2>
                  <Link to={`/programas/${active.id}`} className="link-btn small">
                    {settings.mode === 'avanzado' ? 'Editar' : 'Ver detalle'}
                  </Link>
                </div>
                <DaysTable days={active.days} compact wide />
              </div>
            ) : (
              <div className="empty">
                <span className="empty__title">Ningún programa activo</span>
                <p>Activa uno de la lista para que Hoy te sugiera qué día toca.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {creating && <NewProgramSheet onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewProgramSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<EquipmentProfile>(settings.questionnaire?.equipment ?? 'gimnasio');
  const advanced = settings.mode === 'avanzado';

  const fromTemplate = async (key: TemplateKey) => {
    const q = settings.questionnaire;
    const p = buildProgram(key, { equipment, goal: q?.goal ?? 'hipertrofia', experience: q?.experience ?? 'intermedio' });
    await db.programs.add(p);
    const hadActive = settings.activeProgramId && (await db.programs.get(settings.activeProgramId));
    if (!hadActive) await updateSettings({ activeProgramId: p.id });
    onClose();
    navigate(`/programas/${p.id}`);
  };

  const fromScratch = async () => {
    const now = Date.now();
    const p: Program = {
      id: uid(),
      name: 'Mi programa',
      days: [
        { id: uid(), name: 'Día 1', items: [] },
        { id: uid(), name: 'Día 2', items: [] },
      ],
      createdAt: now,
      updatedAt: now,
    };
    await db.programs.add(p);
    onClose();
    navigate(`/programas/${p.id}`);
  };

  return (
    <Sheet title="Nuevo programa" eyebrow="Programas" onClose={onClose} wide>
      <div className="stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <div className="cluster">
          <Link className="btn" to="/bienvenida?paso=preguntas" onClick={onClose}>
            Recomiéndame uno (4 preguntas)
          </Link>
          {advanced && (
            <button className="btn btn--primary" onClick={fromScratch}>
              Empezar desde cero
            </button>
          )}
        </div>
        <div className="field">
          <span className="field__label" id="tpl-eq">
            Equipo disponible
          </span>
          <div className="seg" role="group" aria-labelledby="tpl-eq">
            {(Object.keys(EQUIPMENT_PROFILE_LABEL) as EquipmentProfile[]).map((k) => (
              <button key={k} aria-pressed={equipment === k} onClick={() => setEquipment(k)}>
                {EQUIPMENT_PROFILE_LABEL[k].split(' ')[0] === 'Solo' ? 'Sin equipo' : EQUIPMENT_PROFILE_LABEL[k].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="section-head">
            <span className="eyebrow eyebrow--ink">Plantillas</span>
            {advanced && <span className="eyebrow">Podrás modificarla después</span>}
          </div>
          <div className="tpl-grid">
            {TEMPLATES.map((t) => (
              <button key={t.key} className="tpl" onClick={() => fromTemplate(t.key)}>
                <span className="tpl__short">{t.short}</span>
                <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <span className="title-sm">{TEMPLATE_BY_KEY[t.key].name}</span>
                  <span className="small muted">{t.summary}</span>
                </span>
                <span className="tnum small muted">
                  {t.daysRange[0]}–{t.daysRange[1]} días
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
