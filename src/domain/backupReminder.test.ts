import { describe, expect, it } from 'vitest';
import { backupReminder } from './backupReminder';

const DAY = 86_400_000;
const now = 1_800_000_000_000;

describe('recordatorio de respaldo', () => {
  it('sin sesiones no recuerda', () => {
    expect(backupReminder({ now, finished: [] }).show).toBe(false);
  });
  it('10 sesiones sin exportar', () => {
    const finished = Array.from({ length: 10 }, (_, i) => now - i * 3600_000);
    expect(backupReminder({ now, finished }).show).toBe(true);
    expect(backupReminder({ now, finished: finished.slice(0, 9) }).show).toBe(false);
  });
  it('14 días desde el último export con al menos una sesión nueva', () => {
    expect(backupReminder({ now, lastExportAt: now - 15 * DAY, finished: [now - DAY] }).show).toBe(true);
    expect(backupReminder({ now, lastExportAt: now - 15 * DAY, finished: [now - 20 * DAY] }).show).toBe(false);
  });
  it('"más tarde" lo pospone', () => {
    const finished = Array.from({ length: 12 }, (_, i) => now - i * 3600_000);
    expect(backupReminder({ now, finished, snoozedUntil: now + DAY }).show).toBe(false);
  });
});
