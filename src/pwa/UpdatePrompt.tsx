import { useRegisterSW } from 'virtual:pwa-register/react';
import { useActiveSession } from '../db/hooks';

/**
 * Aviso de versión nueva. Nunca recarga sola y nunca aparece con una sesión activa:
 * espera a que termines para no interrumpir el entrenamiento.
 */
export function UpdatePrompt() {
  const active = useActiveSession();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa si hay versión nueva cada hora mientras la app esté abierta.
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  if (!needRefresh || active !== undefined) return null;
  return (
    <div className="update-bar" role="status">
      <span>Hay una versión nueva de SERIE.</span>
      <span className="cluster" style={{ flexWrap: 'nowrap' }}>
        <button className="btn btn--sm btn--ghost" onClick={() => setNeedRefresh(false)}>
          Después
        </button>
        <button className="btn btn--sm btn--primary" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </button>
      </span>
    </div>
  );
}
