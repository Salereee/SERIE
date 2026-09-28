import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportAndDownload } from '../db/backup';

interface Props {
  children: ReactNode;
  /** Cambia al navegar para limpiar el error. */
  resetKey?: string;
}

/**
 * Captura fallos de una pantalla sin tumbar la app completa. La sesión activa vive en IndexedDB,
 * así que un error aquí no la pierde: al volver a Hoy o a la sesión, sigue igual.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null; exported: boolean }> {
  state = { error: null as Error | null, exported: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Sin telemetría: la app no envía nada a ningún servidor.
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, exported: false });
  }

  render() {
    const { error, exported } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page">
        <div className="empty" role="alert">
          <span className="empty__title">Algo falló en esta pantalla</span>
          <p>
            Tus datos están a salvo: se guardan en el dispositivo con cada cambio, incluida la sesión en curso. Vuelve a Hoy para
            seguir. Si se repite, exporta un respaldo por precaución.
          </p>
          <div className="cluster">
            <a className="btn btn--primary" href="/">
              Ir a Hoy
            </a>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await exportAndDownload();
                  this.setState({ exported: true });
                } catch {
                  /* si ni esto funciona, el mensaje de arriba sigue siendo la guía */
                }
              }}
            >
              {exported ? 'Respaldo descargado' : 'Exportar respaldo'}
            </button>
          </div>
          <details className="small muted">
            <summary>Detalle técnico</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error.message || error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
