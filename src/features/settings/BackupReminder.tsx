import { useLiveQuery } from 'dexie-react-hooks';
import { exportAndDownload } from '../../db/backup';
import { db } from '../../db/db';
import { updateSettings, useActiveSession, useSettings } from '../../db/hooks';
import { backupReminder } from '../../domain/backupReminder';
import { useFeedback } from '../../ui/feedback';

/** Aviso discreto (no modal) cuando toca exportar. Nunca aparece con una sesión activa. */
export function BackupReminder() {
  const s = useSettings();
  const active = useActiveSession();
  const { toast } = useFeedback();
  const finished = useLiveQuery(
    () => db.sessions.where('status').equals('terminada').filter((x) => !x.isDemo).toArray((xs) => xs.map((x) => x.startedAt)),
    [],
    [] as number[],
  );
  if (active !== undefined) return null;
  const r = backupReminder({ now: Date.now(), lastExportAt: s.lastExportAt, snoozedUntil: s.exportReminderSnoozedUntil, finished });
  if (!r.show) return null;

  const what = s.lastExportAt
    ? `Llevas ${r.sessionsSince} ${r.sessionsSince === 1 ? 'sesión' : 'sesiones'} y ${r.daysSince} días desde tu último respaldo.`
    : `Tienes ${r.sessionsSince} ${r.sessionsSince === 1 ? 'sesión' : 'sesiones'} registradas y ningún respaldo.`;

  return (
    <aside className="reminder" aria-label="Recordatorio de respaldo">
      <p className="small">
        <strong>Respaldo pendiente.</strong> {what} Tus datos solo existen en este navegador.
      </p>
      <div className="cluster" style={{ flexWrap: 'nowrap' }}>
        <button
          className="btn btn--sm btn--ghost"
          onClick={() => updateSettings({ exportReminderSnoozedUntil: Date.now() + 3 * 86_400_000 })}
        >
          Más tarde
        </button>
        <button
          className="btn btn--sm btn--primary"
          onClick={async () => {
            await exportAndDownload();
            toast({ message: 'Respaldo descargado' });
          }}
        >
          Exportar
        </button>
      </div>
    </aside>
  );
}
