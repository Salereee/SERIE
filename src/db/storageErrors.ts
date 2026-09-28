import { useEffect, useSyncExternalStore } from 'react';
import { db } from './db';

/** Traduce errores de IndexedDB/Dexie a mensajes claros en español. */
export function describeStorageError(err: unknown): { title: string; body: string } | null {
  const name = (err as { name?: string })?.name ?? '';
  const inner = (err as { inner?: { name?: string } })?.inner?.name ?? '';
  const n = `${name} ${inner}`;
  if (n.includes('QuotaExceeded')) {
    return {
      title: 'Sin espacio para guardar',
      body: 'El navegador no tiene espacio para guardar más datos. El último cambio no se guardó. Libera espacio en el dispositivo o borra datos de ejemplo, y exporta un respaldo.',
    };
  }
  if (n.includes('MissingAPI') || n.includes('SecurityError') || n.includes('InvalidAccess')) {
    return {
      title: 'Este navegador no permite guardar datos',
      body: 'Parece que estás en modo incógnito o que el navegador bloquea el almacenamiento de este sitio. SERIE necesita guardar datos en el dispositivo: abre la app en una ventana normal o permite el almacenamiento para este sitio.',
    };
  }
  if (n.includes('DatabaseClosed') || n.includes('VersionChange')) {
    return {
      title: 'La app se actualizó en otra pestaña',
      body: 'Recarga esta pestaña para seguir usando la versión nueva. No se perdió nada.',
    };
  }
  if (n.includes('UnknownError') || n.includes('InvalidState') || n.includes('OpenFailed')) {
    return {
      title: 'No se pudo acceder a los datos',
      body: 'El almacenamiento del navegador dio un error. Cierra otras pestañas de SERIE y recarga. Si continúa, reinicia el navegador.',
    };
  }
  return null;
}

/* ——— Aviso cuando otra pestaña actualiza el esquema ——— */

let outdated = false;
const subs = new Set<() => void>();
db.on('versionchange', () => {
  // Otra pestaña abrió una versión nueva de la base: cerramos esta conexión y pedimos recargar.
  db.close();
  outdated = true;
  subs.forEach((f) => f());
  return false;
});

export function useDbOutdated(): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => outdated,
    () => false,
  );
}

/** Convierte rechazos no atrapados de almacenamiento en avisos visibles (nunca fallos silenciosos). */
export function useStorageErrorToasts(show: (title: string, body: string) => void) {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const d = describeStorageError(e.reason);
      if (d) {
        e.preventDefault();
        show(d.title, d.body);
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [show]);
}
