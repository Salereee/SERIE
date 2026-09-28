import { useCallback, useEffect, useState } from 'react';

/**
 * Evita que dos pestañas editen la misma sesión a la vez (Web Locks API).
 * - La primera pestaña obtiene el candado y edita; las demás quedan en solo lectura.
 * - Las de solo lectura esperan en cola: si la que edita se cierra, la siguiente retoma sola.
 * - "Editar aquí" toma el control (steal); la otra pestaña pasa a solo lectura y se forma en la cola.
 * Sin soporte de Web Locks (navegadores muy viejos) se permite editar.
 */
export function useSessionLock(sessionId: string | undefined) {
  const [state, setState] = useState<'pendiente' | 'editor' | 'lectura'>('pendiente');
  const [steal, setSteal] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    if (!('locks' in navigator)) {
      setState('editor');
      return;
    }
    let cancelled = false;
    let release: (() => void) | null = null;
    const name = `serie-sesion-${sessionId}`;

    const hold = () => {
      setState('editor');
      // Mantiene el candado mientras la pantalla esté montada.
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    };

    const queue = () => {
      navigator.locks
        .request(name, () => (cancelled ? undefined : hold()))
        .catch(() => {
          // Nos lo quitaron con "Editar aquí" en otra pestaña: solo lectura y de vuelta a la cola.
          if (!cancelled) {
            setState('lectura');
            queue();
          }
        });
    };

    const options: LockOptions = steal > 0 ? { steal: true } : { ifAvailable: true };
    navigator.locks
      .request(name, options, (lock) => {
        if (cancelled) return;
        if (lock) return hold();
        // Un reintento corto: el candado puede estar liberándose (remontaje de la misma pestaña).
        setTimeout(() => {
          if (cancelled) return;
          navigator.locks.request(name, { ifAvailable: true }, (again) => {
            if (cancelled) return;
            if (again) return hold();
            setState('lectura');
            queue();
          });
        }, 300);
      })
      .catch(() => {
        if (!cancelled) {
          setState('lectura');
          queue();
        }
      });

    return () => {
      cancelled = true;
      (release as (() => void) | null)?.();
    };
  }, [sessionId, steal]);

  const takeOver = useCallback(() => setSteal((n) => n + 1), []);
  return { readOnly: state === 'lectura', takeOver };
}
