import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState } from 'react';
import { useExerciseMap } from '../../db/hooks';
import type { Program } from '../../db/schema';
import { encodeProgram, shareUrl } from '../../domain/shareProgram';
import { useFeedback } from '../../ui/feedback';
import { Sheet } from '../../ui/Sheet';

/** QR dibujado como SVG (sin imágenes externas ni HTML inyectado; cumple la CSP). */
function Qr({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { size: n, path: d };
  }, [text]);
  return (
    <svg className="qr" viewBox={`-4 -4 ${size + 8} ${size + 8}`} role="img" aria-label="Código QR con el enlace de la rutina" shapeRendering="crispEdges">
      <rect x="-4" y="-4" width={size + 8} height={size + 8} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/**
 * Compartir una rutina con otro dispositivo (tu computadora, otro celular o un amigo) sin cuentas:
 * la rutina va dentro del enlace. No incluye historial ni notas.
 */
export function ShareSheet({ program, onClose }: { program: Program; onClose: () => void }) {
  const exercises = useExerciseMap();
  const { toast } = useFeedback();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (exercises.size === 0) return;
    encodeProgram(program, exercises)
      .then((code) => setUrl(shareUrl(code)))
      .catch(() => setFailed(true));
  }, [program, exercises]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: 'Enlace copiado' });
    } catch {
      toast({ message: 'No se pudo copiar. Mantén presionado el enlace para copiarlo.' });
    }
  };
  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: program.name, text: `Rutina “${program.name}” para SERIE`, url });
    } catch {
      /* el usuario cerró el menú de compartir */
    }
  };

  return (
    <Sheet title="Compartir rutina" eyebrow={program.name} onClose={onClose}>
      <div className="share">
        {failed && <p className="field__error">Este navegador no pudo preparar el enlace. Prueba con uno más reciente.</p>}
        {!url && !failed && <p className="muted">Preparando el enlace…</p>}
        {url && (
          <>
            <ol className="share__steps">
              <li>
                <b>A tu computadora:</b> envíate el enlace (WhatsApp Web, correo, Telegram…) y ábrelo allá.
              </li>
              <li>
                <b>A otro celular:</b> escanea el código con su cámara.
              </li>
            </ol>
            <div className="share__qr">
              <Qr text={url} />
            </div>
            <div className="cluster">
              {canShare && (
                <button className="btn btn--primary" onClick={share}>
                  Enviar enlace
                </button>
              )}
              <button className={`btn${canShare ? '' : ' btn--primary'}`} onClick={copy}>
                Copiar enlace
              </button>
            </div>
            <p className="small muted">
              El enlace lleva solo la rutina: días, ejercicios, series, reps y descansos. No incluye tu historial ni tus notas. SERIE no la sube a ningún
              servidor: viaja dentro del enlace. Quien lo abra la guarda como una rutina nueva.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
