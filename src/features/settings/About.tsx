import { Sheet } from '../../ui/Sheet';
import { ANALYTICS_ENABLED } from '../../config';

const CREDITS: [string, string, string][] = [
  ['Space Grotesk', 'Florian Karsten', 'SIL Open Font License 1.1'],
  ['JetBrains Mono', 'JetBrains', 'SIL Open Font License 1.1'],
  ['React y React DOM', 'Meta', 'MIT'],
  ['React Router', 'Remix / Shopify', 'MIT'],
  ['Dexie.js', 'David Fahlander', 'Apache 2.0'],
  ['dnd kit', 'Claudéric Demers', 'MIT'],
  ['Workbox (vía vite-plugin-pwa)', 'Google', 'MIT'],
  ['Fontsource', 'Fontsource', 'MIT'],
];

export function About({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Acerca de SERIE" eyebrow={`Versión ${__APP_VERSION__}`} onClose={onClose} wide>
      <div className="about stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <section className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <h3 className="title-sm">Tu salud va primero</h3>
          <p>
            SERIE es una libreta de entrenamiento, no un entrenador ni un médico. Las sugerencias de peso, repeticiones y descarga
            son orientativas: se calculan con reglas simples a partir de lo que registras y no conocen tu técnica, tu historial
            médico ni cómo te sientes hoy. Si algo duele, detente. Si tienes una lesión o condición de salud, consulta a un
            profesional antes de entrenar.
          </p>
        </section>
        <section className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <h3 className="title-sm">Tus datos son tuyos</h3>
          <p>
            Todo lo que registras se guarda solo en este dispositivo, dentro de tu navegador. No hay cuentas, no se envía nada a
            ningún servidor y nadie más puede verlo. Por lo mismo, si borras los datos del sitio o pierdes el teléfono, se
            pierden: exporta un respaldo de vez en cuando.
          </p>
          {ANALYTICS_ENABLED ? (
            <p>
              Para saber cuántas personas usan la app, el sitio usa Cloudflare Web Analytics: cuenta visitas de forma anónima,
              sin cookies y sin ver nada de lo que registras.
            </p>
          ) : (
            <p>El sitio no usa cookies, anuncios ni analítica.</p>
          )}
        </section>
        <section className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <h3 className="title-sm">Créditos y licencias</h3>
          <table className="reps-table">
            <tbody>
              {CREDITS.map(([name, author, license]) => (
                <tr key={name}>
                  <td>
                    <strong>{name}</strong>
                    <span className="small muted"> · {author}</span>
                  </td>
                  <td className="small num">{license}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Las fuentes se incluyen en la app; no se cargan desde servicios externos.</p>
          {/* Enlace normal (no <Link>): /inicio/ es una página estática fuera de la app. */}
          <p className="small muted">
            ¿Quieres recomendar SERIE? Comparte la <a href={`${import.meta.env.BASE_URL}inicio/`}>página de presentación</a>.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
