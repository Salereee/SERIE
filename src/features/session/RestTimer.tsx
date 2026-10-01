import { useEffect, useRef, useState } from 'react';
import type { Session } from '../../db/schema';
import { fmtClock } from '../../domain/format';
import { haptic, sfx } from '../../hooks/audio';
import { useNow } from '../../hooks/useNow';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { adjustTimer, skipTimer } from './actions';

/**
 * Tarjeta fija de descanso, en la zona del pulgar: reloj y "Saltar". Tocar el reloj abre los ajustes de ±15 s.
 * El tiempo restante se calcula como endsAt − ahora en cada repintado:
 * si la pestaña se congela o el celular se bloquea, al volver muestra el valor correcto.
 */
export function RestTimer({ session }: { session: Session }) {
  const timer = session.restTimer;
  const now = useNow(100, !!timer);
  const fired = useRef<number | null>(null);
  const lastTick = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [announce, setAnnounce] = useState('');
  const startKey = timer ? timer.endsAt - timer.totalSec * 1000 : null;

  // Lectores de pantalla: solo inicio y fin del descanso, nunca cada segundo.
  useEffect(() => {
    if (timer) setAnnounce(`Descanso de ${fmtClock(timer.totalSec)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey]);

  const remainingMs = timer ? timer.endsAt - now : 0;
  const done = !!timer && remainingMs <= 0;
  const secs = Math.ceil(Math.abs(remainingMs) / 1000);
  const final = !!timer && !done && secs <= 3;

  // Cuenta regresiva audible en los últimos 3 segundos (solo con la pestaña visible).
  useEffect(() => {
    if (!final || document.visibilityState !== 'visible' || lastTick.current === secs) return;
    lastTick.current = secs;
    sfx('tick');
  }, [final, secs]);

  useEffect(() => {
    if (!timer || !done || fired.current === timer.endsAt) return;
    fired.current = timer.endsAt;
    lastTick.current = null;
    setAnnounce('Descanso terminado');
    // Si terminó hace mucho (pestaña en segundo plano), no suena tarde.
    if (Date.now() - timer.endsAt > 4000) return;
    haptic([220, 90, 220]);
    sfx('rest-end');
    // Aviso visual que no depende del sonido ni de la vibración (iPhone, modo silencio).
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1400);
    return () => clearTimeout(t);
  }, [done, timer]);

  // El título de la pestaña también avisa (se ve en la lista de pestañas y en el multitarea).
  useEffect(() => {
    if (!done) return;
    const prev = document.title;
    document.title = '● Descanso terminado — SERIE';
    return () => {
      document.title = prev;
    };
  }, [done]);

  const live = (
    <span className="sr-only" aria-live="polite">
      {announce}
    </span>
  );

  // La hoja de ajustes se cierra sola cuando el descanso termina o se salta.
  useEffect(() => {
    if (done || !timer) setAdjusting(false);
  }, [done, timer]);

  if (!timer) return live;

  const pct = Math.min(1, Math.max(0, 1 - remainingMs / (timer.totalSec * 1000)));

  // Región de anuncios y destello fuera de la tarjeta: se mantienen montados y el destello cubre toda la pantalla.
  return (
    <>
      {live}
      {flash && <div className="rest-flash" aria-hidden="true" />}
      <div className={`rest${done ? ' rest--done' : ''}${final ? ' rest--final' : ''}`} role="timer" aria-label="Descanso" key={timer.endsAt - timer.totalSec * 1000}>
        <div className="rest__bar" aria-hidden="true">
          <span className="rest__fill" style={{ transform: `scaleX(${pct})` }} />
        </div>
        <button
          className="rest__time"
          onClick={() => setAdjusting(true)}
          disabled={done}
          aria-label={done ? `Descanso terminado hace ${fmtClock(secs)}` : `Descanso: quedan ${fmtClock(secs)}. Toca para ajustar`}
        >
          <span className="rest__label">{done ? 'Descanso terminado' : 'Descanso'}</span>
          <span className="rest__clock mono" key={done ? 'done' : final ? secs : 'run'}>
            {done ? `+${fmtClock(secs)}` : fmtClock(secs)}
          </span>
        </button>
        <button className="rest__skip" onClick={() => skipTimer(session.id)}>
          {done ? (
            <>
              <Icon name="check" size={18} /> Listo
            </>
          ) : (
            <>
              <Icon name="skip" size={18} /> Saltar
            </>
          )}
        </button>
      </div>
      {adjusting && !done && (
        <Sheet title="Ajustar descanso" eyebrow={`Quedan ${fmtClock(secs)}`} onClose={() => setAdjusting(false)}>
          <div className="rest-adjust">
            <button className="btn btn--lg" onClick={() => adjustTimer(session.id, -15)} aria-label="Quitar 15 segundos">
              <span className="mono">−15 s</span>
            </button>
            <button className="btn btn--lg" onClick={() => adjustTimer(session.id, 15)} aria-label="Agregar 15 segundos">
              <span className="mono">+15 s</span>
            </button>
            <button
              className="btn btn--lg btn--ghost rest-adjust__skip"
              onClick={() => {
                setAdjusting(false);
                void skipTimer(session.id);
              }}
            >
              <Icon name="skip" size={18} /> Saltar descanso
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
