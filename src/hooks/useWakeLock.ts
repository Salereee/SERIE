import { useEffect } from 'react';

/** Mantiene la pantalla encendida mientras `active` sea true (donde el navegador lo permita). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        /* denegado o sin batería suficiente */
      }
      if (cancelled) lock?.release().catch(() => {});
    };
    // El lock se pierde al ocultar la pestaña: se vuelve a pedir al regresar.
    const onVis = () => document.visibilityState === 'visible' && request();
    request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
