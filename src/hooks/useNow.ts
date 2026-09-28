import { useEffect, useState } from 'react';

/**
 * Reloj para re-render. El tiempo real siempre sale de Date.now(); el intervalo solo repinta,
 * así que si el navegador lo frena en segundo plano no se pierde precisión.
 */
export function useNow(intervalMs = 250, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs, enabled]);
  return now;
}
