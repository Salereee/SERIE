import { useEffect, useRef, useState } from 'react';
import type { PRKind, SetEntry, Unit } from '../../db/schema';
import { fromDisplay, parseDecimal, parseIntStrict, weightInputValue } from '../../domain/units';
import { Icon } from '../../ui/Icon';

interface Props {
  set: SetEntry;
  label: string;
  unit: Unit;
  advanced: boolean;
  active: boolean;
  prs: PRKind[];
  onPatch: (patch: Partial<SetEntry>) => void;
  onToggle: () => void;
  onMenu: () => void;
}

/** Fila de serie: peso y reps prellenados; un toque en ✓ la registra y arranca el descanso. */
export function SetRow({ set, label, unit, advanced, active, prs, onPatch, onToggle, onMenu }: Props) {
  const [w, setW] = useState(() => weightInputValue(set.weightKg, unit));
  const [r, setR] = useState(() => (set.reps == null ? '' : String(set.reps)));
  const [rir, setRir] = useState(() => (set.rir == null ? '' : String(set.rir)));
  const focused = useRef<string | null>(null);

  // Sincroniza con la base (p. ej. al aplicar una sugerencia) salvo que el usuario esté escribiendo.
  useEffect(() => {
    if (focused.current !== 'w') setW(weightInputValue(set.weightKg, unit));
    if (focused.current !== 'r') setR(set.reps == null ? '' : String(set.reps));
    if (focused.current !== 'rir') setRir(set.rir == null ? '' : String(set.rir));
  }, [set.weightKg, set.reps, set.rir, unit]);

  const wParsed = parseDecimal(w);
  const rParsed = parseIntStrict(r);
  const wBad = w !== '' && wParsed == null;
  const rBad = r !== '' && (rParsed == null || rParsed === 0 || rParsed > 200);
  const rirParsed = parseIntStrict(rir);
  const rirBad = rir !== '' && (rirParsed == null || rirParsed > 10);
  const canComplete = !set.done && wParsed != null && rParsed != null && rParsed > 0 && !wBad && !rBad;

  const commitW = (text: string) => {
    setW(text);
    const v = parseDecimal(text);
    if (text === '') onPatch({ weightKg: null });
    else if (v != null && v <= 2000) onPatch({ weightKg: fromDisplay(v, unit) });
  };
  const commitR = (text: string) => {
    const t = text.replace(/\D/g, '');
    setR(t);
    const v = parseIntStrict(t);
    if (t === '') onPatch({ reps: null });
    else if (v != null && v > 0 && v <= 200) onPatch({ reps: v });
  };
  const commitRir = (text: string) => {
    const t = text.replace(/\D/g, '');
    setRir(t);
    const v = parseIntStrict(t);
    if (t === '') onPatch({ rir: null });
    else if (v != null && v <= 10) onPatch({ rir: v });
  };

  const id = set.id.slice(0, 8);
  const pr = prs.length > 0;

  return (
    <li
      className="setrow"
      data-done={set.done || undefined}
      // Solo la serie recién registrada anima; al volver a un ejercicio no se repite.
      data-just={(set.done && set.doneAt && Date.now() - set.doneAt < 1500) || undefined}
      data-active={active || undefined}
      data-warmup={set.isWarmup || undefined}
      data-pr={pr || undefined}
      data-advanced={advanced || undefined}
    >
      <button className="setrow__label" onClick={onMenu} aria-label={`Opciones de la serie ${label}${set.isWarmup ? ' (calentamiento)' : ''}`}>
        <span className="mono">{label}</span>
        {pr && <span className="setrow__pr">PR</span>}
      </button>
      <label className="setrow__field">
        <span className="sr-only">Peso de la serie {label} en {unit}</span>
        <input
          className="input input--num setrow__input"
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="—"
          value={w}
          aria-invalid={wBad || undefined}
          aria-describedby={wBad ? `e-${id}` : undefined}
          onFocus={(e) => {
            focused.current = 'w';
            e.target.select();
          }}
          onBlur={() => {
            focused.current = null;
            // Solo corrige el texto si quedó inválido; si es válido ya se guardó al escribir.
            if (w !== '' && parseDecimal(w) == null) setW(weightInputValue(set.weightKg, unit));
          }}
          onChange={(e) => commitW(e.target.value.replace(/[^\d.,]/g, ''))}
        />
      </label>
      <label className="setrow__field">
        <span className="sr-only">Repeticiones de la serie {label}</span>
        <input
          className="input input--num setrow__input"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="—"
          value={r}
          aria-invalid={rBad || undefined}
          aria-describedby={rBad ? `e-${id}` : undefined}
          onFocus={(e) => {
            focused.current = 'r';
            e.target.select();
          }}
          onBlur={() => {
            focused.current = null;
            if (rBad) setR(set.reps == null ? '' : String(set.reps));
          }}
          onChange={(e) => commitR(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canComplete) {
              (e.target as HTMLInputElement).blur();
              onToggle();
            }
          }}
        />
      </label>
      {advanced && (
        <label className="setrow__field">
          <span className="sr-only">RIR de la serie {label} (reps en reserva)</span>
          <input
            className="input input--num setrow__input setrow__input--rir"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="—"
            value={rir}
            aria-invalid={rirBad || undefined}
            onFocus={(e) => {
              focused.current = 'rir';
              e.target.select();
            }}
            onBlur={() => (focused.current = null)}
            onChange={(e) => commitRir(e.target.value)}
          />
        </label>
      )}
      <button
        className="setrow__check"
        onClick={onToggle}
        disabled={!set.done && !canComplete}
        aria-pressed={set.done}
        aria-label={set.done ? `Serie ${label} registrada. Toca para desmarcar` : `Registrar serie ${label}`}
      >
        <Icon name="check" size={26} stroke={2.5} />
      </button>
      {(wBad || rBad) && (
        <span id={`e-${id}`} className="setrow__err field__error">
          {wBad ? 'Peso: número positivo, usa punto o coma para decimales.' : 'Reps: número entero entre 1 y 200.'}
        </span>
      )}
    </li>
  );
}
