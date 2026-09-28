import { useEffect, useState } from 'react';

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Cuenta de 0 al valor con ease-out. Solo para momentos raros (resumen de sesión):
 * celebra el resultado sin retrasar la lectura (720 ms).
 */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 720, delay = 0 }: { value: number; format?: (n: number) => string; duration?: number; delay?: number }) {
  const [n, setN] = useState(() => (reduce() ? value : 0));
  useEffect(() => {
    if (reduce()) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      // ease-out cúbico: rápido al inicio, se asienta en el valor final.
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);
  return (
    <>
      <span aria-hidden="true">{format(n)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
