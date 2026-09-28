// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEED_EXERCISES } from '../../db/seed/exercises';
import { ExerciseCombobox, type ComboGroup } from './ExerciseCombobox';

// jsdom no implementa scrollIntoView ni CSS.escape.
Element.prototype.scrollIntoView = () => {};
globalThis.CSS ??= { escape: (s: string) => s.replace(/[^\w-]/g, (c) => `\\${c}`) } as typeof CSS;

afterEach(cleanup);

const byId = (id: string) => SEED_EXERCISES.find((e) => e.id === id)!;
const groups: ComboGroup[] = [
  { key: 'recientes', label: 'Recientes', items: [byId('sentadilla')] },
  { key: 'pecho', label: 'Pecho', items: [byId('press-banca-barra'), byId('press-inclinado-barra'), byId('aperturas-mancuerna')] },
];

function setup() {
  const onPick = vi.fn();
  render(<ExerciseCombobox groups={groups} query="" onQuery={() => {}} onPick={onPick} />);
  const input = screen.getByRole('combobox');
  return { onPick, input };
}

describe('selector de ejercicios con teclado', () => {
  it('sigue el patrón ARIA: combobox que controla un listbox', () => {
    const { input } = setup();
    const list = screen.getByRole('listbox');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('la primera opción empieza activa y Enter la elige', () => {
    const { input, onPick } = setup();
    const first = screen.getAllByRole('option')[0];
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(byId('sentadilla'));
  });

  it('flechas recorren las opciones entre grupos y no se salen de los extremos', () => {
    const { input, onPick } = setup();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const opts = screen.getAllByRole('option');
    expect(input.getAttribute('aria-activedescendant')).toBe(opts[2].id);
    expect(opts[2].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(opts[3].id);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenLastCalledWith(byId('aperturas-mancuerna'));
    for (let i = 0; i < 6; i++) fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe(opts[0].id);
  });

  it('el clic también elige', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByText('Press inclinado con barra'));
    expect(onPick).toHaveBeenCalledWith(byId('press-inclinado-barra'));
  });
});
