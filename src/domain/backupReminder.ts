export const REMIND_AFTER_DAYS = 14;
export const REMIND_AFTER_SESSIONS = 10;
const DAY = 86_400_000;

export interface ReminderInput {
  now: number;
  lastExportAt?: number;
  snoozedUntil?: number;
  /** Fechas de inicio de las sesiones terminadas. */
  finished: number[];
}

export interface ReminderState {
  show: boolean;
  sessionsSince: number;
  daysSince: number;
}

/** ¿Toca recordar el respaldo? 14 días o 10 sesiones terminadas desde el último export (o desde la primera sesión). */
export function backupReminder({ now, lastExportAt, snoozedUntil, finished }: ReminderInput): ReminderState {
  if (finished.length === 0) return { show: false, sessionsSince: 0, daysSince: 0 };
  const base = lastExportAt ?? Math.min(...finished);
  const sessionsSince = finished.filter((t) => t > (lastExportAt ?? 0)).length;
  const daysSince = Math.floor((now - base) / DAY);
  const due = daysSince >= REMIND_AFTER_DAYS || sessionsSince >= REMIND_AFTER_SESSIONS;
  const snoozed = snoozedUntil != null && snoozedUntil > now;
  return { show: due && !snoozed && sessionsSince > 0, sessionsSince, daysSince };
}
