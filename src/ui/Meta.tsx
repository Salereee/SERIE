import type { ReactNode } from 'react';

/**
 * Línea de metadatos estilo revista ("TOCA HOY · DÍA 2 DE 4 · TORSO/PIERNA").
 * Cada segmento es indivisible: si no cabe, baja completo a la siguiente línea
 * en vez de partir la frase a la mitad.
 */
export function Meta({ parts, className = '' }: { parts: (ReactNode | false | null | undefined)[]; className?: string }) {
  const items = parts.filter((p) => p !== false && p != null && p !== '');
  return (
    <span className={`eyebrow meta ${className}`}>
      {items.map((p, i) => (
        <span key={i} className="meta__part">
          {p}
        </span>
      ))}
    </span>
  );
}
