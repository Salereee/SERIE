import { useEffect, useState } from 'react';
import { updateSettings, useSettings } from '../db/hooks';
import { Sheet } from '../ui/Sheet';
import { isIOSSafari, isStandalone } from './install';

/** Pasos para agregar a la pantalla de inicio en iPhone/iPad. */
export function IOSSteps() {
  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <ol className="steps">
        <li>
          Toca el botón <strong>Compartir</strong> de Safari (el cuadro con una flecha hacia arriba, abajo en el centro o arriba a la
          derecha).
        </li>
        <li>
          Desliza y elige <strong>Agregar a inicio</strong>.
        </li>
        <li>
          Confirma con <strong>Agregar</strong>. Abre SERIE desde el ícono nuevo de tu pantalla de inicio.
        </li>
      </ol>
      <p className="small muted">
        Por qué importa: si usas la app solo dentro de Safari y pasan varias semanas sin abrirla, iOS puede borrar sus datos para
        liberar espacio. Instalada en la pantalla de inicio, iOS la trata como una app y conserva tus datos. Además funciona sin señal.
      </p>
    </div>
  );
}

/** Se muestra una sola vez en iOS Safari cuando la app no está instalada (después, en Ajustes). */
export function InstallGuideOnce() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!s.onboardingDone || s.installHintSeen) return;
    if (isIOSSafari() && !isStandalone()) {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, [s.onboardingDone, s.installHintSeen]);

  if (!open) return null;
  const close = () => {
    setOpen(false);
    updateSettings({ installHintSeen: true });
  };
  return (
    <Sheet title="Agrega SERIE a tu pantalla de inicio" eyebrow="Recomendado en iPhone" onClose={close} footer={<button className="btn btn--primary" onClick={close}>Entendido</button>}>
      <IOSSteps />
      <p className="small muted" style={{ marginTop: 12 }}>
        Puedes volver a ver estos pasos en Ajustes → Instalar la app.
      </p>
    </Sheet>
  );
}
