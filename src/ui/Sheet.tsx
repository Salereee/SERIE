import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface SheetProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  full?: boolean;
  /** Elemento que recibe el foco al abrir (por defecto el primer control del cuerpo). */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Hoja inferior en celular, diálogo centrado en escritorio. Atrapa el foco y cierra con Esc. */
export function Sheet({ title, eyebrow, onClose, children, footer, wide, full, initialFocus }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Salida: misma trayectoria que la entrada, más corta; luego se desmonta.
  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), 170);
  }, []);
  const closeRef = useRef(requestClose);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current!;
    const target =
      initialFocus?.current ??
      (node.querySelector('.sheet__body ' + FOCUSABLE) as HTMLElement | null) ??
      (node.querySelector('.sheet__foot ' + FOCUSABLE) as HTMLElement | null) ??
      node;
    target.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab') {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="sheet-backdrop"
      data-closing={closing || undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={ref}
        className={`sheet${wide ? ' sheet--wide' : ''}${full ? ' sheet--full' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sheet__head">
          <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={titleId} className="title-sm">
              {title}
            </h2>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={requestClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
