import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useSettings } from '../../db/hooks';
import type { Questionnaire } from '../../db/schema';
import { EQUIPMENT_PROFILE_LABEL, TEMPLATE_BY_KEY, buildProgram, type TemplateKey } from '../../db/seed/programs';
import { recommend } from '../../domain/recommend';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Icon } from '../../ui/Icon';
import { TemplatePreview } from '../programs/TemplatePreview';
import { loadDemoData } from '../../db/demo';
import { useFeedback } from '../../ui/feedback';
import { sfx, unlockAudio } from '../../hooks/audio';
import './onboarding.css';

type Answers = Partial<Questionnaire>;

interface Question<K extends keyof Questionnaire> {
  key: K;
  title: string;
  options: { value: Questionnaire[K]; label: string; hint?: string }[];
}

const QUESTIONS = [
  {
    key: 'daysPerWeek',
    title: '¿Cuántos días por semana puedes entrenar?',
    options: [2, 3, 4, 5, 6].map((d) => ({ value: d, label: `${d} días`, hint: d === 2 ? 'Mínimo útil' : d === 6 ? 'Requiere buena recuperación' : undefined })),
  } as Question<'daysPerWeek'>,
  {
    key: 'experience',
    title: '¿Cuánta experiencia tienes con pesas?',
    options: [
      { value: 'principiante', label: 'Principiante', hint: 'Menos de 1 año entrenando constante' },
      { value: 'intermedio', label: 'Intermedio', hint: '1 a 3 años; conoces los básicos' },
      { value: 'avanzado', label: 'Avanzado', hint: 'Más de 3 años; progresas lento' },
    ],
  } as Question<'experience'>,
  {
    key: 'goal',
    title: '¿Cuál es tu objetivo principal?',
    options: [
      { value: 'fuerza', label: 'Fuerza', hint: 'Mover más peso: reps bajas, descansos largos' },
      { value: 'hipertrofia', label: 'Hipertrofia', hint: 'Ganar músculo: reps moderadas, más volumen' },
      { value: 'general', label: 'Condición general', hint: 'Estar en forma y constante' },
    ],
  } as Question<'goal'>,
  {
    key: 'equipment',
    title: '¿Con qué equipo cuentas?',
    options: [
      { value: 'gimnasio', label: EQUIPMENT_PROFILE_LABEL.gimnasio, hint: 'Barras, máquinas y poleas' },
      { value: 'mancuernas', label: EQUIPMENT_PROFILE_LABEL.mancuernas, hint: 'Mancuernas y un banco' },
      { value: 'corporal', label: EQUIPMENT_PROFILE_LABEL.corporal, hint: 'Se asume una barra para dominadas' },
    ],
  } as Question<'equipment'>,
] as const;

export function OnboardingPage() {
  const settings = useSettings();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<'intro' | 'preguntas' | 'resultado'>(params.get('paso') === 'preguntas' ? 'preguntas' : 'intro');
  const [answers, setAnswers] = useState<Answers>(settings.questionnaire ?? {});
  const [qi, setQi] = useState(0);
  const desktop = useMediaQuery('(min-width: 900px)');
  const navigate = useNavigate();
  const { toast } = useFeedback();

  const complete = QUESTIONS.every((q) => answers[q.key] !== undefined);

  const choose = async (key: TemplateKey) => {
    const q = answers as Questionnaire;
    const program = buildProgram(key, { equipment: q.equipment, goal: q.goal, experience: q.experience });
    await db.programs.add(program);
    await updateSettings({ activeProgramId: program.id, onboardingDone: true, questionnaire: q });
    toast({ message: `Programa activo: ${program.name}` });
    navigate('/', { state: { onboarded: true } });
  };

  const startAdvanced = async () => {
    await updateSettings({ mode: 'avanzado', onboardingDone: true });
    navigate('/programas?nuevo=1');
  };

  const demo = async () => {
    await loadDemoData();
    toast({ message: 'Datos de ejemplo cargados. Puedes quitarlos en Ajustes.' });
    navigate('/', { state: { onboarded: true } });
  };

  if (phase === 'intro') {
    return (
      <div className="page onb">
        <header className="onb__head">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true" />
            SERIE
          </span>
          {settings.onboardingDone && (
            <Link to="/" className="link-btn">
              Volver
            </Link>
          )}
        </header>
        <div className="onb__hero">
          <div className="onb__folio">
            <span className="eyebrow">Registro de entrenamiento</span>
            <span className="eyebrow mono">N.º 01 · local</span>
          </div>
          <h1 className="onb__title">
            <span>Cada serie,</span>
            <span>
              anotada<span className="accent">.</span>
            </span>
          </h1>
          <div className="ruler" aria-hidden="true" />
          <p className="lead">
            Tus datos se guardan solo en este navegador: sin cuentas ni servidores. Empieza con un programa recomendado o arma
            el tuyo.
          </p>
        </div>
        <div className="onb__choices">
          <button className="onb__choice" onClick={() => setPhase('preguntas')}>
            <span className="onb__num outline-num" aria-hidden="true">
              01
            </span>
            <span className="eyebrow">Modo básico · 4 preguntas</span>
            <span className="title-md">Recomiéndame un programa</span>
            <span className="muted">Te sugiero un split según tus días, experiencia, objetivo y equipo.</span>
            <Icon name="arrow" size={28} />
          </button>
          <button className="onb__choice" onClick={startAdvanced}>
            <span className="onb__num outline-num" aria-hidden="true">
              02
            </span>
            <span className="eyebrow">Modo avanzado</span>
            <span className="title-md">Armo el mío</span>
            <span className="muted">Constructor desde cero o a partir de una plantilla, con RIR/RPE y supersets.</span>
            <Icon name="arrow" size={28} />
          </button>
        </div>
        <p className="small muted">
          ¿Solo quieres ver cómo funciona?{' '}
          <button className="link-btn" onClick={demo}>
            Cargar datos de ejemplo
          </button>
        </p>
        <p className="small muted">
          ¿Ya usas SERIE en otro dispositivo?{' '}
          <Link className="link-btn" to="/ajustes#datos">
            Importar tu respaldo
          </Link>
        </p>
      </div>
    );
  }

  if (phase === 'resultado' && complete) {
    const q = answers as Questionnaire;
    const { best, alternatives } = recommend(q);
    const bt = TEMPLATE_BY_KEY[best.key];
    return (
      <div className="page onb">
        <header className="onb__head">
          <button className="link-btn" onClick={() => setPhase('preguntas')}>
            <Icon name="left" size={16} /> Cambiar respuestas
          </button>
          <span className="eyebrow mono">
            {q.daysPerWeek}D · {q.experience.slice(0, 3).toUpperCase()} · {q.goal.slice(0, 3).toUpperCase()}
          </span>
        </header>
        <div className="grid12">
          <section className="span-7 stack" style={{ '--gap': '20px' } as React.CSSProperties} aria-labelledby="rec-title">
            <span className="eyebrow">Recomendado para ti</span>
            <h1 id="rec-title" className="title-xl">
              {bt.name}
            </h1>
            <p className="lead">{best.reason}</p>
            <div className="cluster">
              <button className="btn btn--primary btn--lg" onClick={() => choose(best.key)}>
                Usar {bt.name}
              </button>
            </div>
            <TemplatePreview templateKey={best.key} q={q} />
          </section>
          <section className="span-5 stack" style={{ '--gap': '0' } as React.CSSProperties} aria-labelledby="alt-title">
            <div className="section-head">
              <h2 id="alt-title" className="eyebrow eyebrow--ink">
                Alternativas válidas
              </h2>
              <span className="eyebrow mono">{alternatives.length}</span>
            </div>
            {alternatives.length === 0 && <p className="muted">Con {q.daysPerWeek} días no hay otra opción que tenga sentido.</p>}
            <ul className="list">
              {alternatives.map((a) => (
                <AltRow key={a.key} k={a.key} reason={a.reason} q={q} onChoose={() => choose(a.key)} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  // Preguntas: una por pantalla en celular, todas juntas en escritorio.
  const visible = desktop ? QUESTIONS : [QUESTIONS[qi]];
  const set = <K extends keyof Questionnaire>(k: K, v: Questionnaire[K]) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    if (!desktop) {
      // Deja ver la selección (la tinta entra en 240 ms) antes de pasar a la siguiente pregunta.
      window.setTimeout(() => {
        if (qi < QUESTIONS.length - 1) setQi(qi + 1);
        else setPhase('resultado');
      }, 280);
    }
  };

  return (
    <div className="page onb">
      <header className="onb__head">
        <button
          className="link-btn"
          onClick={() => (!desktop && qi > 0 ? setQi(qi - 1) : settings.onboardingDone && params.get('paso') ? navigate(-1) : setPhase('intro'))}
        >
          <Icon name="left" size={16} /> Atrás
        </button>
        {!desktop && (
          <span className="eyebrow mono" aria-live="polite">
            {String(qi + 1).padStart(2, '0')} / {String(QUESTIONS.length).padStart(2, '0')}
          </span>
        )}
      </header>
      {!desktop && (
        <div className="onb__progress" aria-hidden="true">
          {QUESTIONS.map((q, i) => (
            <span key={q.key} data-on={i <= qi || undefined} />
          ))}
        </div>
      )}
      <div className="onb__questions">
        {visible.map((q) => {
          const idx = QUESTIONS.indexOf(q);
          return (
            <fieldset key={q.key} className="onb__q">
              <legend className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <span className="outline-num onb__qnum" aria-hidden="true">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="title-md">{q.title}</span>
              </legend>
              <div className="options" role="radiogroup" aria-label={q.title}>
                {(q.options as { value: string | number; label: string; hint?: string }[]).map((o, oi) => (
                  <button
                    key={String(o.value)}
                    role="radio"
                    aria-checked={answers[q.key] === o.value}
                    className="option"
                    onClick={() => {
                      unlockAudio();
                      sfx('tap');
                      set(q.key, o.value as never);
                    }}
                  >
                    <span className="option__key">{String.fromCharCode(65 + oi)}</span>
                    <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                      <span className="option__title">{o.label}</span>
                      {o.hint && <span className="small muted">{o.hint}</span>}
                    </span>
                    {answers[q.key] === o.value ? <Icon name="check" /> : <span />}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
      {desktop && (
        <div className="cluster">
          <button className="btn btn--primary btn--lg" disabled={!complete} onClick={() => setPhase('resultado')}>
            Ver recomendación <Icon name="arrow" />
          </button>
          {!complete && <span className="small muted">Responde las 4 preguntas.</span>}
        </div>
      )}
    </div>
  );
}

function AltRow({ k, reason, q, onChoose }: { k: TemplateKey; reason: string; q: Questionnaire; onChoose: () => void }) {
  const [open, setOpen] = useState(false);
  const t = TEMPLATE_BY_KEY[k];
  return (
    <li className="alt">
      <div className="alt__head">
        <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
          <span className="title-sm">{t.name}</span>
          <span className="small muted">{reason}</span>
        </div>
        <button className="btn btn--sm" onClick={onChoose}>
          Usar
        </button>
      </div>
      <button className="link-btn small" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Ocultar días' : `Ver ${t.days.length} días`}
      </button>
      {open && <TemplatePreview templateKey={k} q={q} compact />}
    </li>
  );
}

