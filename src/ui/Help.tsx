import { useState } from 'react';
import { useSettings } from '../db/hooks';
import { Sheet } from './Sheet';

/** Términos que el modo básico explica en una o dos líneas. */
export const GLOSSARY = {
  volumen: {
    title: 'Volumen',
    text: 'Peso × repeticiones de cada serie efectiva, todo sumado. Sirve para comparar cuánto trabajo hiciste entre sesiones. Los calentamientos no cuentan.',
  },
  records: {
    title: 'Récords',
    text: 'Tus mejores marcas en cada ejercicio: el peso más alto, la mejor serie (peso y reps combinados), más reps con un mismo peso y el mayor volumen en una sesión. Se detectan solos al marcar una serie.',
  },
  sugerencia: {
    title: 'Sugerencia',
    text: 'Primero sube repeticiones hasta el tope del rango en todas las series; cuando lo logras, la app propone subir el peso (cuánto, lo eliges en Ajustes). Si rindes menos varias sesiones seguidas, sugiere mantener o bajar un poco. Solo es una sugerencia: tú decides si la aplicas.',
  },
  calentamiento: {
    title: 'Calentamiento',
    text: 'Series ligeras antes de las de trabajo. Se ven en gris y no cuentan para volumen ni récords.',
  },
} as const;

export type HelpTerm = keyof typeof GLOSSARY;

/**
 * Botón "?" junto a un término. Solo aparece en modo básico: en avanzado se asume que ya se conocen.
 * El área táctil es de 44 px aunque el círculo se vea chico.
 */
export function Help({ term }: { term: HelpTerm }) {
  const { mode } = useSettings();
  const [open, setOpen] = useState(false);
  if (mode !== 'basico') return null;
  const g = GLOSSARY[term];
  return (
    <>
      <button type="button" className="help" onClick={() => setOpen(true)} aria-label={`Qué es: ${g.title}`}>
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <Sheet title={g.title} eyebrow="En pocas palabras" onClose={() => setOpen(false)}>
          <p className="help__text">{g.text}</p>
        </Sheet>
      )}
    </>
  );
}
