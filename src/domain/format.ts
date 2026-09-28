const dateLong = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const dateShort = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const dateFull = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });
const monthYear = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });

export const fmtDateLong = (t: number) => dateLong.format(t);
export const fmtDateShort = (t: number) => dateShort.format(t).replace('.', '');
export const fmtDateFull = (t: number) => dateFull.format(t).replace('.', '');
export const fmtTime = (t: number) => time.format(t);
export const fmtMonthYear = (t: number) => monthYear.format(t);

/** 3725 → "1:02:05"; 95 → "1:35". */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 5400 → "1 h 30 min"; 2700 → "45 min". */
export function fmtDuration(totalSec: number): string {
  if (totalSec < 60) return `${Math.max(0, Math.round(totalSec))} s`;
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "hace 3 días", "hoy", "ayer". */
export function fmtRelativeDay(t: number, now = Date.now()): string {
  const d0 = startOfDay(now);
  const d1 = startOfDay(t);
  const diff = Math.round((d0 - d1) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff < 7) return `hace ${diff} días`;
  if (diff < 14) return 'hace 1 semana';
  if (diff < 60) return `hace ${Math.floor(diff / 7)} semanas`;
  return fmtDateFull(t);
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Lunes de la semana de t (semana que empieza en lunes, como en México). */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t));
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.getTime();
}
