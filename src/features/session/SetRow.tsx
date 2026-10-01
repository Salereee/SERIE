import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PRKind, SetEntry, Unit } from '../../db/schema';
import { fmtWeight, fromDisplay, parseDecimal, parseIntStrict, weightInputValue } from '../../domain/units';
import { Icon } from '../../ui/Icon';

interface Props {
  set: SetEntry;
  label: string;
  unit: Unit;
  advanced: boolean;
  active: boolean;
  prs: PRKind[];
  /** Línea de guía de la serie activa: "la vez pasada 110 × 7". */
  hint?: string;
  /** Contenido bajo la serie activa (sugerencia). */
  footer?: ReactNode;
  onPatch: (patch: Partial<SetEntry>) => void;
  onToggle: () => void;
  onMenu: () => void;
}

/**
 * Fila de serie. Tres estados:
 *  - hecha: una línea compacta; tocarla la abre para editar;
 *  - activa (la siguiente pendiente): tarjeta con peso, reps y ✓ grandes;
 *  - pendiente: los mismos campos, sin tarjeta ni acento.
 * Peso y reps llegan prellenados; un toque en ✓ la registra y arranca el descanso.
 */
export function SetRow(props: Props) {
  const { set, label, unit, prs, onMenu } = props;
  const [editing, setEditing] = useState(false);
  const pr = prs.length > 0;
  const warm = set.isWarmup;

  if (set.done && !editing) {
    return (
      <li className="setrow setrow--done" data-warmup={warm || undefined} data-pr={pr || undefined} data-just={(set.doneAt && Date.now() - set.doneAt < 1500) || undefined}>
        <button className="setrow__line" onClick={() => setEditing(true)} aria-label={`Serie ${label} registrada: ${fmtWeight(set.weightKg, unit)} ${unit} por ${set.reps} reps${pr ? ', récord' : ''}. Toca para editar`}>
          <span className="setrow__num tnum">{label}</span>
          <span className="setrow__done mono">
            {fmtWeight(set.weightKg, unit)} {unit} × {set.reps}
            {props.advanced && set.rir != null && <span className="muted"> · RIR {set.rir}</span>}
          </span>
          {pr && <span className="tag tag--accent">PR</span>}
          <Icon name="check" size={20} stroke={2.5} className="setrow__tick" />
        </button>
        <button className="btn btn--ghost btn--icon setrow__more" onClick={onMenu} aria-label={`Opciones de la serie ${label}${warm ? ' (calentamiento)' : ''}`}>
          <Icon name="more" size={18} />
        </button>
      </li>
    );
  }
  return <SetInputs {...props} onDoneEditing={editing ? () => setEditing(false) : undefined} />;
}

function SetInputs({ set, label, unit, advanced, active, prs, hint, footer, onPatch, onToggle, onMenu, onDoneEditing }: Props & { onDoneEditing?: () => void }) {
  const [w, setW] = useState(() => weightInputValue(set.weightKg, unit));
  const [r, setR] = useState(() => (set.reps == null ? '' : String(set.reps)));
  const [rir, setRir] = useState(() => (set.rir == null ? '' : String(set.rir)));
  const focused = useRef<string | null>(null);
  const row = useRef<HTMLLIElement>(null);

  // Sincroniza con la base (p. ej. al aplicar una sugerencia) salvo que el usuario esté escribiendo.
  useEffect(() => {
    if (focused.current !== 'w') setW(weightInputValue(set.weightKg, unit));
    if (focused.current !== 'r') setR(set.reps == null ? '' : String(set.reps));
    if (focused.current !== 'rir') setRir(set.rir == null ? '' : String(set.rir));
  }, [set.weightKg, set.reps, set.rir, unit]);

  // Una serie hecha abierta para editar recibe el foco; se vuelve a plegar al salir de ella (onBlur abajo).
  const editMode = useRef(!!onDoneEditing);
  useEffect(() => {
    if (editMode.current) row.current?.querySelector('input')?.focus();
  }, []);

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
  const name = set.isWarmup ? `Calentamiento ${label.replace(/^C/, '')}` : `Serie ${label}`;

  return (
    <li
      ref={row}
      className="setrow"
      data-done={set.done || undefined}
      data-active={active || undefined}
      data-warmup={set.isWarmup || undefined}
      data-pr={pr || undefined}
      data-advanced={advanced || undefined}
      onBlur={(e) => {
        if (onDoneEditing && !e.currentTarget.contains(e.relatedTarget as Node | null)) onDoneEditing();
      }}
    >
      {active && (
        <p className="setrow__hint">
          <button className="setrow__name" onClick={onMenu} aria-label={`Opciones de ${name.toLowerCase()}`}>
            {name}
          </button>
          {hint && <span> · {hint}</span>}
        </p>
      )}
      <div className="setrow__fields">
        {!active && (
          <button className="setrow__label tnum" onClick={onMenu} aria-label={`Opciones de la serie ${label}${set.isWarmup ? ' (calentamiento)' : ''}`}>
            {label}
            {pr && <span className="tag tag--accent">PR</span>}
          </button>
        )}
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
          <span className="setrow__suffix" aria-hidden="true">
            {unit}
          </span>
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
          <span className="setrow__suffix" aria-hidden="true">
            reps
          </span>
        </label>
        {advanced && (
          <label className="setrow__field setrow__field--rir">
            <span className="sr-only">RIR de la serie {label} (reps en reserva)</span>
            <input
              className="input input--num setrow__input setrow__input--rir"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="RIR"
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
      </div>
      {(wBad || rBad) && (
        <span id={`e-${id}`} className="setrow__err field__error">
          {wBad ? 'Peso: número positivo, usa punto o coma para decimales.' : 'Reps: número entero entre 1 y 200.'}
        </span>
      )}
      {active && footer}
    </li>
  );
}
