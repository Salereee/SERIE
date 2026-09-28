// Sonidos generados con WebAudio: sin archivos, pesan cero y suenan igual sin internet.
// Son cortos y graves de volumen a propósito: acompañan, no llaman la atención.
// iOS exige "desbloquear" el audio dentro de un toque del usuario (unlockAudio).
import { getSettingsSnapshot } from '../db/hooks';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Llamar dentro de un gesto del usuario (p. ej. al marcar una serie). */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

interface Note {
  f: number; // frecuencia (Hz)
  at: number; // inicio relativo (s)
  dur: number; // duración (s)
  gain?: number;
  type?: OscillatorType;
  /** Frecuencia final para un pequeño glissando. */
  to?: number;
}

function play(notes: Note[]) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + 0.005;
  const master = c.createGain();
  master.gain.value = 0.9;
  master.connect(c.destination);
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.f, t0 + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
    const peak = n.gain ?? 0.12;
    g.gain.setValueAtTime(0.0001, t0 + n.at);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
    osc.connect(g).connect(master);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.02);
  }
}

export type Sfx = 'set' | 'unset' | 'pr' | 'tick' | 'rest-end' | 'finish' | 'tap' | 'fold';

const SOUNDS: Record<Sfx, Note[]> = {
  // Serie registrada: clic seco y corto, como un seguro de disco.
  set: [
    { f: 1850, to: 1200, at: 0, dur: 0.045, gain: 0.07, type: 'triangle' },
    { f: 620, at: 0.012, dur: 0.07, gain: 0.05 },
  ],
  // Deshacer: el mismo clic, descendente.
  unset: [{ f: 900, to: 520, at: 0, dur: 0.07, gain: 0.05, type: 'triangle' }],
  // Récord: dos notas ascendentes (quinta justa), cálidas.
  pr: [
    { f: 660, at: 0, dur: 0.16, gain: 0.09, type: 'triangle' },
    { f: 990, at: 0.09, dur: 0.28, gain: 0.08, type: 'triangle' },
    { f: 1980, at: 0.09, dur: 0.12, gain: 0.015 },
  ],
  // Cuenta regresiva de los últimos segundos del descanso.
  tick: [{ f: 1400, at: 0, dur: 0.03, gain: 0.035 }],
  // Fin del descanso: dos pulsos claros, audibles en el gimnasio.
  'rest-end': [
    { f: 880, at: 0, dur: 0.14, gain: 0.16, type: 'square' },
    { f: 1175, at: 0.2, dur: 0.22, gain: 0.14, type: 'square' },
  ],
  // Sesión terminada: arpegio mayor corto.
  finish: [
    { f: 523, at: 0, dur: 0.2, gain: 0.08, type: 'triangle' },
    { f: 659, at: 0.1, dur: 0.2, gain: 0.08, type: 'triangle' },
    { f: 784, at: 0.2, dur: 0.22, gain: 0.08, type: 'triangle' },
    { f: 1047, at: 0.32, dur: 0.4, gain: 0.07, type: 'triangle' },
  ],
  // Toque de interfaz (selección en el cuestionario).
  tap: [{ f: 1200, to: 900, at: 0, dur: 0.035, gain: 0.04, type: 'triangle' }],
  // Abrir una sección desplegable: apenas un roce.
  fold: [{ f: 700, to: 980, at: 0, dur: 0.03, gain: 0.018, type: 'sine' }],
};

/** Reproduce un efecto si el usuario tiene el sonido activado. */
export function sfx(name: Sfx) {
  if (!getSettingsSnapshot().sound) return;
  play(SOUNDS[name]);
}

/** Pulso háptico corto (Android). En iOS Safari no existe la Vibration API. */
export function haptic(pattern: number | number[] = 12) {
  if (!getSettingsSnapshot().vibration) return;
  vibrate(pattern);
}

export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* sin soporte */
    }
  }
}

/** Sonido de prueba desde Ajustes (ignora el ajuste para poder escucharlo). */
export function previewSound() {
  play(SOUNDS['rest-end']);
}
