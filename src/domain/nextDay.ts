import type { Program, Session } from '../db/schema';

/** Índice del día que sigue: el posterior al último día terminado de este programa. */
export function nextDayIndex(program: Program, sessionsDesc: Pick<Session, 'programId' | 'dayId' | 'status'>[]): number {
  if (program.days.length === 0) return -1;
  const last = sessionsDesc.find((s) => s.status === 'terminada' && s.programId === program.id && s.dayId);
  if (!last) return 0;
  const i = program.days.findIndex((d) => d.id === last.dayId);
  if (i === -1) return 0;
  return (i + 1) % program.days.length;
}
