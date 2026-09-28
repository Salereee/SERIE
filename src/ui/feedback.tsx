import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Sheet } from './Sheet';

/* ——— Toasts con deshacer ——— */

interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'pr';
  durationMs?: number;
}
interface ToastItem extends ToastInput {
  id: number;
  leaving?: boolean;
}

/* ——— Confirmación ——— */

interface ConfirmInput {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (t: ToastInput) => void;
  confirm: (c: ConfirmInput) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmInput & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  // Sale por donde entró (abajo) y luego se desmonta.
  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 160);
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.durationMs ?? (t.onAction ? 6000 : 3200));
    },
    [dismiss],
  );

  const confirm = useCallback((c: ConfirmInput) => new Promise<boolean>((resolve) => setPending({ ...c, resolve })), []);

  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.tone === 'pr' ? ' toast--pr' : ''}`} data-leaving={t.leaving || undefined}>
            {t.tone === 'pr' && <span className="toast__mark" aria-hidden="true">PR</span>}
            <span className="toast__msg">{t.message}</span>
            {t.onAction && (
              <button
                className="toast__action"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel ?? 'Deshacer'}
              </button>
            )}
          </div>
        ))}
      </div>
      {pending && (
        <Sheet
          title={pending.title}
          eyebrow="Confirmar"
          onClose={() => close(false)}
          footer={
            <>
              <button className="btn" onClick={() => close(false)}>
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button className={`btn ${pending.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => close(true)}>
                {pending.confirmLabel ?? 'Confirmar'}
              </button>
            </>
          }
        >
          {pending.body && <p className="lead">{pending.body}</p>}
        </Sheet>
      )}
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('FeedbackProvider falta');
  return c;
}
