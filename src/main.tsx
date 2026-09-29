import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/lists.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ensureSeed } from './db/db';
import { primeSettings } from './db/hooks';
import { describeStorageError } from './db/storageErrors';
import { FeedbackProvider } from './ui/feedback';

const root = createRoot(document.getElementById('root')!);

ensureSeed()
  .then((settings) => {
    primeSettings(settings);
    // Pide al navegador no borrar los datos bajo presión de espacio (best effort).
    navigator.storage?.persist?.().catch(() => {});
    root.render(
      <StrictMode>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </BrowserRouter>
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    // Nunca pantalla en blanco: explica qué pasó y qué hacer.
    const d = describeStorageError(err) ?? {
      title: 'No se pudo abrir la base de datos local',
      body: 'Revisa que el navegador permita guardar datos para este sitio (en modo incógnito algunos lo bloquean), cierra otras pestañas de SERIE y recarga.',
    };
    root.render(
      <main className="main">
        <div className="page">
          <div className="empty" role="alert">
            <span className="eyebrow">SERIE · error de almacenamiento</span>
            <span className="empty__title">{d.title}</span>
            <p>{d.body}</p>
            <button className="btn btn--primary" onClick={() => window.location.reload()}>
              Recargar
            </button>
            <details className="small muted">
              <summary>Detalle técnico</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{String((err as Error)?.message ?? err)}</pre>
            </details>
          </div>
        </div>
      </main>,
    );
  });
