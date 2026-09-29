import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../../db/db';
import { updateSettings, useSettings } from '../../db/hooks';
import type { Settings, Theme, Unit } from '../../db/schema';
import { fmtClock, fmtRelativeDay } from '../../domain/format';
import { INCREMENT_OPTIONS, switchUnit } from '../../domain/unitSwitch';
import { BAR_OPTIONS, barKgFor } from '../../domain/plates';
import { KG_PER_LB, fromDisplay, toDisplay } from '../../domain/units';
import { previewSound, unlockAudio, vibrate } from '../../hooks/audio';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from '../../pwa/install';
import { IOSSteps } from '../../pwa/InstallGuide';
import { Disclosure, useOpenSections } from '../../ui/Disclosure';
import { Select } from '../../ui/Select';
import { Sheet } from '../../ui/Sheet';
import { About } from './About';
import { BackupReminder } from './BackupReminder';
import { DataSection } from './DataSection';
import { Row } from './Row';
import './settings.css';

const RESTS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300];
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

export function SettingsPage() {
  const s = useSettings();
  const location = useLocation();
  const programs = useLiveQuery(() => db.programs.orderBy('updatedAt').reverse().toArray(), [], []);
  const [about, setAbout] = useState(false);
  const [iosSteps, setIosSteps] = useState(false);
  const canPrompt = useCanPromptInstall();
  const installed = isStandalone();
  const desktop = useMediaQuery('(min-width: 900px)');
  // Escritorio: todo abierto (hay espacio). Celular: cerrado, salvo si se llega con #datos o #instalar.
  const defaults = useCallback(
    (id: string) => desktop || (id === 'datos' && location.hash === '#datos') || (id === 'app' && location.hash === '#instalar'),
    [desktop, location.hash],
  );
  const sections = useOpenSections('ajustes', defaults);

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  const set = (patch: Partial<Settings>) => updateSettings(patch);
  const fmtInc = (kg: number) => toDisplay(kg, s.unit).toLocaleString('es-MX', { maximumFractionDigits: 2 });

  const incOptions = (current: number) => {
    const opts = INCREMENT_OPTIONS[s.unit].map((v) => fromDisplay(v, s.unit));
    return opts.some((o) => near(o, current)) ? opts : [...opts, current].sort((a, b) => a - b);
  };

  const bar = barKgFor(s.barKg, s.unit);
  const barOptions = (() => {
    const opts = BAR_OPTIONS[s.unit].map((v) => fromDisplay(v, s.unit));
    return opts.some((o) => near(o, bar)) ? opts : [...opts, bar].sort((a, b) => b - a);
  })();

  const incSelect = (label: string, value: number, key: 'incrementUpperKg' | 'incrementLowerKg') => (
    <label className="field">
      <span className="field__label">{label}</span>
      <select className="select input--num" value={incOptions(value).find((o) => near(o, value))} onChange={(e) => set({ [key]: Number(e.target.value) })}>
        {incOptions(value).map((o) => (
          <option key={o} value={o}>
            {fmtInc(o)}&nbsp;{s.unit}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="page settings">
      <header className="page-head">
        <span className="eyebrow">Versión {__APP_VERSION__}</span>
        <h1 className="title-lg">Ajustes</h1>
        <p className="small muted">Tus datos viven solo en este dispositivo y este navegador; nada se envía a internet.</p>
      </header>

      <BackupReminder />

      {/* Lo que se cambia de un toque queda siempre a la vista (controles segmentados). */}
      <section className="settings__quick" aria-label="Ajustes rápidos">
        <Row title="Modo" hint="Básico: solo peso y reps, con programas listos. Avanzado agrega RIR/RPE, 1RM estimado, supersets y edición de programas. Cambiar no borra nada.">
          <Seg
            label="Modo"
            value={s.mode}
            options={[
              ['basico', 'Básico'],
              ['avanzado', 'Avanzado'],
            ]}
            onChange={(v) => set({ mode: v as Settings['mode'] })}
          />
        </Row>
        <Row title="Unidad de peso" hint={`Todo se guarda en kg; solo cambia cómo se muestra (1 lb = ${KG_PER_LB.toFixed(4)} kg).`}>
          <Seg
            label="Unidad"
            value={s.unit}
            options={[
              ['kg', 'kg'],
              ['lb', 'lb'],
            ]}
            onChange={(v) => set(switchUnit(s, v as Unit))}
          />
        </Row>
        <Row title="Tema" hint="Sistema sigue el modo claro u oscuro de tu dispositivo.">
          <Seg
            label="Tema"
            value={s.theme}
            options={[
              ['sistema', 'Sistema'],
              ['claro', 'Claro'],
              ['oscuro', 'Oscuro'],
            ]}
            onChange={(v) => set({ theme: v as Theme })}
          />
        </Row>
      </section>

      <div className="settings__groups">
        <div className="settings__col">
          <Disclosure
            title="Entrenamiento"
            summary={`+${fmtInc(s.incrementUpperKg)}/${fmtInc(s.incrementLowerKg)} ${s.unit} · ${fmtClock(s.defaultRestSec)}`}
            open={sections.isOpen('entrenamiento')}
            onToggle={(o) => sections.setOpen('entrenamiento', o)}
          >
            <Row title="Incremento de peso" hint="Lo que la sugerencia de progresión sube cuando completas el tope del rango.">
              <div className="settings__pair">
                {incSelect('Tren superior', s.incrementUpperKg, 'incrementUpperKg')}
                {incSelect('Tren inferior', s.incrementLowerKg, 'incrementLowerKg')}
              </div>
            </Row>
            <Row title="Peso de la barra" hint="Para calcular los discos por lado en los ejercicios con barra.">
              <select
                className="select input--num"
                aria-label="Peso de la barra"
                value={String(barOptions.find((o) => near(o, bar)) ?? bar)}
                onChange={(e) => set({ barKg: Number(e.target.value) })}
              >
                {barOptions.map((o) => (
                  <option key={o} value={o}>
                    {o === 0 ? 'Sin barra (solo discos)' : `${fmtInc(o)} ${s.unit}`}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Descanso por defecto" hint="Para ejercicios agregados sobre la marcha. Cada ejercicio de un programa usa su propio descanso.">
              <select className="select input--num" value={s.defaultRestSec} onChange={(e) => set({ defaultRestSec: Number(e.target.value) })} aria-label="Descanso por defecto">
                {RESTS.map((r) => (
                  <option key={r} value={r}>
                    {fmtClock(r)}
                  </option>
                ))}
              </select>
            </Row>
            {s.mode === 'avanzado' && (
              <Row
                title="Anotar esfuerzo (RIR y RPE)"
                hint="RIR = repeticiones que te quedaban en reserva al terminar la serie (0 = no podías hacer otra). Si no lo usas, apágalo: se quita la columna y lo ya anotado se conserva."
              >
                <div className="cluster settings__toggles">
                  <Toggle label="Pedir RIR y RPE" checked={s.effortTracking !== false} onChange={(v) => set({ effortTracking: v })} />
                </div>
              </Row>
            )}
            <Row title="Programa activo" hint="Define qué día te sugiere Hoy.">
              <Select
                label="Programa activo"
                size="md"
                value={s.activeProgramId ?? ''}
                options={[{ value: '', label: 'Ninguno' }, ...programs.map((p) => ({ value: p.id, label: p.name, hint: `${p.days.length} días` }))]}
                onChange={(v) => set({ activeProgramId: v || undefined })}
              />
            </Row>
            <Row title="Cuestionario" hint="Vuelve a responder las 4 preguntas para recibir otra recomendación. Tus programas se conservan.">
              <div>
                <Link className="btn btn--sm" to="/bienvenida?paso=preguntas">
                  Repetir cuestionario
                </Link>
              </div>
            </Row>
          </Disclosure>

          <Disclosure
            title="Sonidos y vibración"
            summary={`Sonidos ${s.sound ? 'sí' : 'no'} · vibración ${s.vibration ? 'sí' : 'no'}`}
            open={sections.isOpen('sonido')}
            onToggle={(o) => sections.setOpen('sonido', o)}
          >
            <Row
              title="Avisos"
              hint="Clic suave al registrar una serie, dos notas al romper un récord, cuenta regresiva y aviso al terminar el descanso. El fin del descanso también se ve: la barra cambia de color y la pantalla destella, así se nota aunque el teléfono esté en silencio. En iPhone no hay vibración."
            >
              <div className="cluster settings__toggles">
                <Toggle label="Sonidos" checked={s.sound} onChange={(v) => set({ sound: v })} />
                <Toggle label="Vibración" checked={s.vibration} onChange={(v) => set({ vibration: v })} />
                <button
                  className="btn btn--sm"
                  onClick={() => {
                    unlockAudio();
                    if (s.sound) setTimeout(previewSound, 30);
                    if (s.vibration) vibrate([220, 90, 220]);
                  }}
                >
                  Probar
                </button>
              </div>
            </Row>
          </Disclosure>
        </div>

        <div className="settings__col" id="datos">
          <Disclosure
            title="Datos y respaldo"
            summary={s.lastExportAt ? `Respaldo ${fmtRelativeDay(s.lastExportAt)}` : 'Sin respaldo'}
            open={sections.isOpen('datos')}
            onToggle={(o) => sections.setOpen('datos', o)}
          >
            <DataSection />
          </Disclosure>

          <Disclosure
            title="App"
            summary={`v${__APP_VERSION__} · ${installed ? 'instalada' : 'sin instalar'}`}
            open={sections.isOpen('app')}
            onToggle={(o) => sections.setOpen('app', o)}
          >
            <Row
              id="instalar"
              title="Instalar la app"
              hint={
                installed
                  ? 'Ya la estás usando instalada. Funciona sin señal y tu sistema conserva sus datos.'
                  : 'Instalada funciona sin señal, abre a pantalla completa y el sistema protege mejor tus datos.'
              }
            >
              {!installed && (
                <div className="cluster">
                  {canPrompt && (
                    <button className="btn btn--sm btn--primary" onClick={() => promptInstall()}>
                      Instalar SERIE
                    </button>
                  )}
                  {isIOS() && (
                    <button className="btn btn--sm" onClick={() => setIosSteps(true)}>
                      Cómo instalar en iPhone
                    </button>
                  )}
                  {!canPrompt && !isIOS() && <span className="small muted">Usa la opción “Instalar” o “Agregar a inicio” del menú de tu navegador.</span>}
                </div>
              )}
            </Row>
            <Row title="Acerca de" hint="Aviso de salud, privacidad, créditos y licencias.">
              <div className="cluster">
                <button className="btn btn--sm" onClick={() => setAbout(true)}>
                  Ver
                </button>
                <span className="small muted mono">v{__APP_VERSION__}</span>
              </div>
            </Row>
          </Disclosure>
        </div>
      </div>

      {about && <About onClose={() => setAbout(false)} />}
      {iosSteps && (
        <Sheet title="Agregar a la pantalla de inicio" eyebrow="iPhone y iPad" onClose={() => setIosSteps(false)}>
          <IOSSteps />
        </Sheet>
      )}
    </div>
  );
}

function Seg({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="toggle__box" aria-hidden="true" />
      {label}
    </button>
  );
}
