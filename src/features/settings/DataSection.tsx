import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackupError, backupFilename, downloadBlob, exportAndDownload, exportAndShare, exportBackup, importBackup, readBackupFile, wipeAll, type ImportMode, type ImportResult } from '../../db/backup';
import { db } from '../../db/db';
import { hasDemoData, loadDemoData, removeDemoData } from '../../db/demo';
import { useSettings } from '../../db/hooks';
import type { ValidBackup } from '../../db/validate';
import { fmtDateFull, fmtRelativeDay } from '../../domain/format';
import { useFeedback } from '../../ui/feedback';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { Row } from './Row';

type ImportStep =
  | { step: 'elegir'; file: File; backup: ValidBackup }
  | { step: 'hecho'; result: ImportResult; mode: ImportMode; previous: Blob };

export function DataSection() {
  const s = useSettings();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();
  const demo = useLiveQuery(() => hasDemoData(), [], false);
  const activeSession = useLiveQuery(() => db.sessions.where('status').equals('activa').count(), [], 0);
  const [busy, setBusy] = useState(false);
  const [imp, setImp] = useState<ImportStep | null>(null);
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; persisted?: boolean }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setStorage({ usage: est?.usage, quota: est?.quota, persisted });
    })().catch(() => {});
  }, []);

  const doExport = async () => {
    await exportAndDownload();
    toast({ message: 'Respaldo descargado' });
  };

  const pickFile = async (f: File) => {
    try {
      setBusy(true);
      const backup = await readBackupFile(f);
      setImp({ step: 'elegir', file: f, backup });
    } catch (e) {
      toast({ message: e instanceof BackupError ? `No se importó nada. ${e.message}` : 'No se pudo leer el archivo.', durationMs: 9000 });
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (mode: ImportMode) => {
    if (imp?.step !== 'elegir') return;
    setBusy(true);
    try {
      // Copia de seguridad automática de lo que hay ahora, antes de escribir.
      const previous = await exportBackup();
      const result = await importBackup(imp.backup, mode);
      // En un dispositivo nuevo, tener datos importados basta para saltar la bienvenida.
      if (!(await db.settings.get('app'))?.onboardingDone) await db.settings.update('app', { onboardingDone: true });
      setImp({ step: 'hecho', result, mode, previous });
    } catch {
      toast({ message: 'La importación falló y no se cambió nada.', durationMs: 7000 });
      setImp(null);
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    const first = await confirm({
      title: '¿Borrar todos los datos?',
      body: 'Se eliminarán sesiones, programas, ejercicios propios y ajustes de este navegador. Antes puedes exportar un respaldo.',
      confirmLabel: 'Continuar',
      danger: true,
    });
    if (!first) return;
    const wantsBackup = await confirm({
      title: '¿Descargar un respaldo antes de borrar?',
      body: 'Recomendado: con ese archivo puedes recuperar todo más tarde desde Importar.',
      confirmLabel: 'Descargar respaldo',
      cancelLabel: 'Seguir sin respaldo',
    });
    if (wantsBackup) await exportAndDownload();
    const second = await confirm({
      title: 'Última confirmación',
      body: 'Esto no se puede deshacer. ¿Borrar todo ahora?',
      confirmLabel: 'Sí, borrar todo',
      danger: true,
    });
    if (!second) return;
    await wipeAll();
    navigate('/bienvenida');
  };

  return (
    <>
      <Row title="Dónde viven tus datos" hint="Solo en este dispositivo y en este navegador: no se envían a ningún servidor ni se sincronizan con tus otros equipos.">
        {storage.usage != null && (
          <span className="small muted mono">
            {(storage.usage / 1024 / 1024).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MB usados ·{' '}
            {storage.persisted ? 'almacenamiento persistente' : 'el navegador podría liberar espacio si le falta'}
          </span>
        )}
        {storage.persisted === false && (
          <span className="small muted">Para proteger tus datos, instala la app (Ajustes → Instalar) y exporta respaldos con regularidad.</span>
        )}
      </Row>

      <Row
        title="Respaldo"
        hint={
          s.lastExportAt
            ? `Último respaldo: ${fmtDateFull(s.lastExportAt)} (${fmtRelativeDay(s.lastExportAt)}).`
            : 'Aún no has exportado ningún respaldo. Hazlo de vez en cuando; también sirve para pasar tus datos a otro dispositivo.'
        }
      >
        <div className="cluster">
          <button className="btn btn--sm btn--primary" onClick={doExport}>
            Exportar JSON
          </button>
          <button className="btn btn--sm" onClick={() => fileRef.current?.click()} disabled={busy || activeSession > 0}>
            Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) pickFile(f);
            }}
          />
        </div>
        {activeSession > 0 && <span className="small muted">Termina la sesión en curso para poder importar.</span>}
      </Row>

      <Row
        title="Pasar todo a otro dispositivo"
        hint="Para ver tu historial en la computadora o en otro celular. Aquí: toca Enviar respaldo y mándatelo por WhatsApp, correo, AirDrop o Drive. Allá: abre SERIE → Ajustes → Datos y respaldo → Importar JSON y elige Reemplazar (si allá no tienes nada) o Fusionar. Solo la rutina: Programas → Compartir."
      >
        <div className="cluster">
          <button
            className="btn btn--sm"
            onClick={async () => {
              const r = await exportAndShare();
              if (r === 'descargado') toast({ message: 'Respaldo descargado: ábrelo en el otro dispositivo con Importar JSON' });
            }}
          >
            Enviar respaldo
          </button>
        </div>
      </Row>

      <Row title="Datos de ejemplo" hint="Historial falso de un Torso/Pierna para probar gráficas, récords y sugerencias. Se quita sin tocar tus datos reales.">
        <div className="cluster">
          <button
            className="btn btn--sm"
            disabled={busy || activeSession > 0}
            onClick={async () => {
              setBusy(true);
              await loadDemoData(10);
              setBusy(false);
              toast({ message: '10 semanas de ejemplo cargadas' });
            }}
          >
            10 semanas
          </button>
          <button
            className="btn btn--sm"
            disabled={busy || activeSession > 0}
            onClick={async () => {
              setBusy(true);
              await loadDemoData(52);
              setBusy(false);
              toast({ message: 'Un año de ejemplo cargado' });
            }}
          >
            1 año
          </button>
          {demo && (
            <button
              className="btn btn--sm btn--danger"
              disabled={busy}
              onClick={async () => {
                const ok = await confirm({ title: '¿Quitar los datos de ejemplo?', body: 'Solo se borran las sesiones y el programa de ejemplo.', confirmLabel: 'Quitar', danger: true });
                if (!ok) return;
                const n = await removeDemoData();
                toast({ message: `${n} sesiones de ejemplo quitadas` });
              }}
            >
              Quitar ejemplo
            </button>
          )}
        </div>
      </Row>

      <Row title="Borrar todos los datos" hint="Elimina sesiones, programas, ejercicios propios y ajustes de este navegador. Te pedirá confirmar dos veces y te ofrecerá un respaldo antes.">
        <div>
          <button className="btn btn--sm btn--danger" onClick={wipe} disabled={activeSession > 0}>
            <Icon name="trash" size={16} /> Borrar todo
          </button>
        </div>
      </Row>

      {imp?.step === 'elegir' && (
        <Sheet title="¿Cómo quieres importar?" eyebrow={imp.file.name} onClose={() => setImp(null)}>
          <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
            <p className="small muted">
              El archivo es válido: {imp.backup.sessions.length} sesiones, {imp.backup.programs.length} programas y{' '}
              {imp.backup.exercises.filter((e) => e.isCustom).length} ejercicios propios. Antes de escribir se guarda una copia de lo que tienes ahora.
            </p>
            <div className="menu">
              <button onClick={() => runImport('fusionar')} disabled={busy}>
                <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <span>Fusionar</span>
                  <span className="small muted" style={{ fontWeight: 400 }}>
                    Agrega lo que no tienes y no toca nada de lo que ya existe. Úsalo para juntar datos de dos dispositivos.
                  </span>
                </span>
              </button>
              <button onClick={() => runImport('reemplazar')} disabled={busy}>
                <span className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                  <span className="menu__danger">Reemplazar</span>
                  <span className="small muted" style={{ fontWeight: 400 }}>
                    Borra tus sesiones, programas y ejercicios propios actuales y deja exactamente lo del archivo.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {imp?.step === 'hecho' && (
        <Sheet
          title="Importación terminada"
          eyebrow={imp.mode === 'fusionar' ? 'Fusionar' : 'Reemplazar'}
          onClose={() => setImp(null)}
          footer={
            <>
              <button className="btn" onClick={() => downloadBlob(imp.previous, backupFilename('serie-copia-previa'))}>
                Descargar copia previa
              </button>
              <button className="btn btn--primary" onClick={() => setImp(null)}>
                Listo
              </button>
            </>
          }
        >
          <p className="lead">
            Se {imp.mode === 'fusionar' ? 'agregaron' : 'cargaron'} {imp.result.sessions} sesiones, {imp.result.programs} programas y {imp.result.exercises} ejercicios propios.
            {imp.result.skipped > 0 && ` ${imp.result.skipped} sesión en curso no se importó porque ya tienes una abierta.`}
          </p>
          <p className="small muted" style={{ marginTop: 12 }}>
            La copia de lo que tenías antes de importar está lista para descargar por si necesitas volver atrás.
          </p>
        </Sheet>
      )}
    </>
  );
}
