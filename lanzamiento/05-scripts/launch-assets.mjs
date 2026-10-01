// Genera el kit de lanzamiento de SERIE: logo, imágenes de indexación y de funcionamiento (ES/EN).
// Uso: node scripts/launch-assets.mjs <carpeta-capturas> <carpeta-salida>
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = resolve(process.argv[2]);
const OUT = resolve(process.argv[3]);
const SITE = 'https://serie.pages.dev'; // placeholder: cámbialo cuando tengas la URL definitiva

const font = (pkg, file) => {
  const buf = readFileSync(resolve(root, 'node_modules/@fontsource', pkg, 'files', file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const INK = '#0E0E0D';
const PAPER = '#F2F1EC';
const ACCENT = '#FF5A1F';
const ACCENT_LIGHT = '#C43800';
const MUTED = '#A3A198';
const MUTED_L = '#5D5C56';
const SOFT = '#3A3935';

const G7 = font('space-grotesk', 'space-grotesk-latin-700-normal.woff');
const G6 = font('space-grotesk', 'space-grotesk-latin-600-normal.woff');
const G5 = font('space-grotesk', 'space-grotesk-latin-500-normal.woff');
const M5 = font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff');

function text(f, str, x, y, size, fill, tracking = 0) {
  let cx = x;
  let svg = '';
  const n = (v) => v.toFixed(2);
  for (const ch of str) {
    const glyph = f.charToGlyph(ch);
    const d = glyph
      .getPath(cx, y, size)
      .commands.map((c) =>
        c.type === 'Z' ? 'Z' : c.type === 'Q' ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}` : c.type === 'C' ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`,
      )
      .join('');
    if (d) svg += `<path d="${d}" fill="${fill}"/>`;
    cx += (glyph.advanceWidth / f.unitsPerEm) * size + tracking;
  }
  return { svg, width: cx - x - tracking };
}
const measure = (f, s, size, tr = 0) => text(f, s, 0, 0, size, '#000', tr).width;

/** Marca de mancuerna (idéntica al favicon). */
function mark(cx, cy, s, { bar = ACCENT, plate = PAPER } = {}) {
  const u = s / 32, x0 = cx - s / 2, y0 = cy - s / 2;
  return `<rect x="${x0 + 6 * u}" y="${y0 + 14 * u}" width="${20 * u}" height="${4 * u}" fill="${bar}"/>
<rect x="${x0 + 4 * u}" y="${y0 + 8 * u}" width="${4 * u}" height="${16 * u}" fill="${plate}"/>
<rect x="${x0 + 24 * u}" y="${y0 + 8 * u}" width="${4 * u}" height="${16 * u}" fill="${plate}"/>
<rect x="${x0 + 1 * u}" y="${y0 + 11 * u}" width="${3 * u}" height="${10 * u}" fill="${plate}"/>
<rect x="${x0 + 28 * u}" y="${y0 + 11 * u}" width="${3 * u}" height="${10 * u}" fill="${plate}"/>`;
}
function ruler(x, y, width, color, step = 12, big = 5) {
  let d = '';
  for (let i = 0, px = x; px <= x + width; i++, px += step) {
    const h = i % big === 0 ? 18 : 9;
    d += `<rect x="${px}" y="${y - h}" width="${i % big === 0 ? 3 : 2}" height="${h}" fill="${color}"/>`;
  }
  return d;
}
const svgDoc = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;

async function png(svg, out, opts = {}) {
  mkdirSync(dirname(out), { recursive: true });
  let img = sharp(Buffer.from(svg), { density: opts.density ?? 72 });
  await img.png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out.replace(OUT, ''));
}
const save = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); console.log('✓', p.replace(OUT, '')); };

/* ---------------- 1. LOGO ---------------- */
const L = resolve(OUT, '01-logo');
// Ícono (mark sobre cuadro)
const iconSvg = (size, { bg = INK, plate = PAPER, bar = ACCENT, scale = 0.72, radius = 0 } = {}) =>
  svgDoc(size, size, `${bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : ''}${mark(size / 2, size / 2, size * scale, { plate, bar })}`);
// Wordmark con cuadro naranja (como en la app) y horizontal con mancuerna
function lockup({ fg, accent, bg, withMark = false, markPlate }) {
  const size = 120, tr = 26;
  const w = measure(G7, 'SERIE', size, tr);
  const pad = 40;
  const markW = withMark ? 150 : 84;
  const W = Math.ceil(pad + markW + 36 + w + pad), H = 220;
  const base = 158;
  const m = withMark
    ? mark(pad + markW / 2, H / 2, markW, { plate: markPlate ?? fg, bar: accent })
    : `<rect x="${pad}" y="${base - 84}" width="84" height="84" fill="${accent}"/>`;
  return svgDoc(W, H, m + text(G7, 'SERIE', pad + markW + 36, base, size, fg, tr).svg, bg);
}
const variants = [
  ['serie-logo-oscuro', { fg: PAPER, accent: ACCENT, bg: INK }],
  ['serie-logo-claro', { fg: INK, accent: ACCENT_LIGHT, bg: PAPER }],
  ['serie-logo-transparente-tinta', { fg: INK, accent: ACCENT_LIGHT }],
  ['serie-logo-transparente-blanco', { fg: PAPER, accent: ACCENT }],
];
for (const [name, v] of variants) {
  const s = lockup(v);
  save(resolve(L, 'svg', name + '.svg'), s);
  await png(s, resolve(L, 'png', name + '.png'), { density: 288 });
  const sm = lockup({ ...v, withMark: true });
  save(resolve(L, 'svg', name.replace('logo', 'logo-mancuerna') + '.svg'), sm);
  await png(sm, resolve(L, 'png', name.replace('logo', 'logo-mancuerna') + '.png'), { density: 288 });
}
for (const [name, o] of [
  ['serie-icono-oscuro', {}],
  ['serie-icono-claro', { bg: PAPER, plate: INK, bar: ACCENT_LIGHT }],
  ['serie-icono-naranja', { bg: ACCENT, plate: INK, bar: PAPER }],
  ['serie-icono-transparente', { bg: null }],
]) {
  save(resolve(L, 'svg', name + '.svg'), iconSvg(512, o));
  await png(iconSvg(1024, o), resolve(L, 'png', name + '-1024.png'));
}
// Avatar para redes (círculo seguro)
await png(iconSvg(1080, { scale: 0.6 }), resolve(L, 'png', 'serie-avatar-redes-1080.png'));

/* ---------------- 2. INDEXACIÓN ---------------- */
const I = resolve(OUT, '02-indexacion');
function ogSvg(lang) {
  const W = 1200, H = 630;
  const t = lang === 'es'
    ? { l1: 'Cada serie,', l2: 'anotada', sub: 'REGISTRO DE ENTRENAMIENTO · SIN CUENTAS · TUS DATOS EN TU DISPOSITIVO', num: 'N.º 01' }
    : { l1: 'Every set,', l2: 'logged', sub: 'WORKOUT LOG · NO ACCOUNTS · YOUR DATA STAYS ON YOUR DEVICE', num: 'No. 01' };
  const brand = text(G7, 'SERIE', 124, 118, 40, PAPER, 9);
  const l1 = text(G7, t.l1, 72, 340, 150, PAPER, -6);
  const l2 = text(G7, t.l2, 72, 480, 150, PAPER, -6);
  const dot = text(G7, '.', 72 + l2.width - 4, 480, 150, ACCENT);
  const sub = text(M5, t.sub, 72, 580, 19, MUTED, 1.2);
  const nw = measure(G6, t.num, 26, 2);
  const num = text(G6, t.num, 1128 - nw, 118, 26, MUTED, 2);
  return svgDoc(W, H, `<rect x="72" y="86" width="34" height="34" fill="${ACCENT}"/>${brand.svg}${num.svg}<rect x="72" y="150" width="${W - 144}" height="4" fill="${PAPER}"/>${l1.svg}${l2.svg}${dot.svg}${ruler(72, 530, W - 144, '#5D5C56')}${sub.svg}`, INK);
}
await png(ogSvg('es'), resolve(I, 'og-es.png'));
await png(ogSvg('en'), resolve(I, 'og-en.png'));
// íconos y favicons
await png(iconSvg(16, { scale: 0.9 }), resolve(I, 'favicon-16.png'));
await png(iconSvg(32, { scale: 0.9 }), resolve(I, 'favicon-32.png'));
await png(iconSvg(48, { scale: 0.86 }), resolve(I, 'favicon-48.png'));
await png(iconSvg(180), resolve(I, 'apple-touch-icon.png'));
await png(iconSvg(192), resolve(I, 'icons/icon-192.png'));
await png(iconSvg(512), resolve(I, 'icons/icon-512.png'));
await png(iconSvg(512, { scale: 0.56 }), resolve(I, 'icons/icon-maskable-512.png'));
await png(iconSvg(150, { scale: 0.6 }), resolve(I, 'mstile-150.png'));
save(resolve(I, 'favicon.svg'), iconSvg(32, { scale: 0.9 }));
// favicon.ico (PNG-embebido, 16/32/48)
{
  const bufs = await Promise.all([16, 32, 48].map((s) => sharp(Buffer.from(iconSvg(s, { scale: s < 40 ? 0.9 : 0.86 }))).png().toBuffer()));
  const head = Buffer.alloc(6 + 16 * bufs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(bufs.length, 4);
  let off = head.length;
  bufs.forEach((b, i) => {
    const s = [16, 32, 48][i], o = 6 + 16 * i;
    head.writeUInt8(s, o); head.writeUInt8(s, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12);
    off += b.length;
  });
  save(resolve(I, 'favicon.ico'), Buffer.concat([head, ...bufs]));
}
// capturas PWA (manifest "screenshots": instalación enriquecida en Android/Chrome)
const S = (f) => resolve(SHOTS, f);
for (const [src, dst] of [
  ['m-dark-02-hoy.png', 'screenshots/movil-1-hoy.png'],
  ['m-dark-03-sesion.png', 'screenshots/movil-2-sesion.png'],
  ['m-dark-06-ejercicio.png', 'screenshots/movil-3-progreso.png'],
  ['m-dark-07-historial.png', 'screenshots/movil-4-historial.png'],
]) { mkdirSync(dirname(resolve(I, dst)), { recursive: true }); await sharp(S(src)).resize(1080).png({ compressionLevel: 9 }).toFile(resolve(I, dst)); console.log('✓', dst); }
for (const [src, dst] of [
  ['d-dark-02-hoy.png', 'screenshots/escritorio-1-hoy.png'],
  ['d-dark-03-sesion.png', 'screenshots/escritorio-2-sesion.png'],
]) { await sharp(S(src)).resize(1920).png({ compressionLevel: 9 }).toFile(resolve(I, dst)); console.log('✓', dst); }

/* ---------------- 3. FUNCIONAMIENTO ---------------- */
const F = resolve(OUT, '03-funcionamiento');
const FEATS = [
  { shot: 'm-dark-01-bienvenida.png', es: ['Cada serie,', 'anotada.', 'Registro de rutinas de gimnasio. Gratis, sin cuentas.'], en: ['Every set,', 'logged.', 'A gym workout log. Free, no sign-up.'] },
  { shot: 'm-dark-02-hoy.png', es: ['Abres la app', 'y ya sabes qué toca.', 'Tu día, tus ejercicios y tu semana en una pantalla.'], en: ['Open it and', 'know what’s next.', 'Today’s workout, exercises and week on one screen.'] },
  { shot: 'm-dark-03a-sesion.png', es: ['Una serie,', 'un toque.', 'Peso y reps prellenados con lo de la última vez.'], en: ['One set,', 'one tap.', 'Weight and reps prefilled from last time.'] },
  { shot: 'm-dark-03-sesion.png', bottom: true, es: ['El descanso', 'se cuenta solo.', 'Timer automático con ±15 s, sonido y aviso visual.'], en: ['Rest timer', 'that runs itself.', 'Auto-start, ±15 s, sound and a visual cue.'] },
  { shot: 'm-dark-06-ejercicio.png', es: ['Mira cómo', 'vas subiendo.', '1RM estimado, peso máximo y récords por ejercicio.'], en: ['Watch yourself', 'get stronger.', 'Estimated 1RM, top weight and PRs per exercise.'] },
  { shot: 'm-dark-05-progreso.png', es: ['Tu constancia,', 'a la vista.', 'Sesiones en 30 días, racha y frecuencia semanal.'], en: ['Consistency,', 'made visible.', 'Sessions in 30 days, streak and weekly frequency.'] },
  { shot: 'm-dark-09-programa.png', es: ['Split listo', 'o hecho a mano.', 'PPL, Torso/Pierna, Full Body… o arma el tuyo.'], en: ['Ready-made split', 'or build your own.', 'PPL, Upper/Lower, Full Body… or your own.'] },
  { shot: null, es: ['Sin cuentas.', 'Tus datos, tuyos.', 'Todo se guarda en tu teléfono. Funciona sin internet.'], en: ['No accounts.', 'Your data, yours.', 'Everything stays on your phone. Works offline.'] },
];

async function feature(i, f, lang, fmt) {
  const [W, H] = fmt === 'post' ? [1080, 1350] : [1080, 1920];
  const [a, b, sub] = f[lang];
  const M = 72;
  const num = String(i + 1).padStart(2, '0');
  const folio = lang === 'es' ? `N.º ${num}` : `No. ${num}`;
  const brand = text(G7, 'SERIE', M + 44, M + 30, 30, PAPER, 7);
  const fw = measure(M5, folio, 22, 1);
  const top = `<rect x="${M}" y="${M}" width="30" height="30" fill="${ACCENT}"/>${brand.svg}${text(M5, folio, W - M - fw, M + 26, 22, MUTED, 1).svg}<rect x="${M}" y="${M + 58}" width="${W - 2 * M}" height="3" fill="${PAPER}"/>`;
  // Titular: tamaño que quepa en el ancho
  const avail = W - 2 * M;
  let size = fmt === 'post' ? 96 : 104;
  while (Math.max(measure(G7, a, size, -3), measure(G7, b, size, -3)) > avail) size -= 2;
  const y1 = M + 58 + 40 + size * 0.95;
  const y2 = y1 + size * 1.02;
  const bEnd = b.endsWith('.') ? b.slice(0, -1) : b;
  const t1 = text(G7, a, M, y1, size, PAPER, -3);
  const t2 = text(G7, bEnd, M, y2, size, PAPER, -3);
  const dot = b.endsWith('.') ? text(G7, '.', M + t2.width - 2, y2, size, ACCENT).svg : '';
  const subY = y2 + 64;
  const subT = text(M5, sub.toUpperCase(), M, subY, 19, MUTED, 0.6);
  let subSvg = subT.svg;
  if (subT.width > avail) {
    // parte en dos líneas
    const words = sub.toUpperCase().split(' ');
    let l1 = '';
    for (const w of words) { if (measure(M5, (l1 + ' ' + w).trim(), 19, 0.6) > avail) break; l1 = (l1 + ' ' + w).trim(); }
    const l2 = sub.toUpperCase().slice(l1.length).trim();
    subSvg = text(M5, l1, M, subY, 19, MUTED, 0.6).svg + text(M5, l2, M, subY + 30, 19, MUTED, 0.6).svg;
  }
  const rulerY = subY + 70;
  const head = top + t1.svg + t2.svg + dot + subSvg + ruler(M, rulerY, W - 2 * M, SOFT);
  const bodyTop = Math.round(rulerY + 44);
  let comp;
  if (f.shot) {
    const pw = fmt === 'post' ? 560 : 700;
    const ph = Math.round((pw * 2532) / 1170);
    const px = Math.round((W - pw) / 2);
    const shot = await sharp(resolve(SHOTS, f.shot)).resize(pw, ph).png().toBuffer();
    const visible = f.bottom ? H - bodyTop - 86 : H - bodyTop;
    const vh = Math.min(ph, visible);
    const crop = await sharp(shot).extract({ left: 0, top: f.bottom ? ph - vh : 0, width: pw, height: vh }).toBuffer();
    const frame = `<rect x="${px - 14}" y="${bodyTop - 14}" width="${pw + 28}" height="${f.bottom ? vh + 28 : visible + 40}" fill="none" stroke="${PAPER}" stroke-width="3"/>`;
    const bg = await sharp(Buffer.from(svgDoc(W, H, head + frame, INK))).png().toBuffer();
    comp = sharp(bg).composite([{ input: crop, left: px, top: bodyTop }]);
  } else {
    // Pieza tipográfica: candado + lista de garantías
    const items = lang === 'es'
      ? ['Sin registro ni correo', 'Sin servidores: IndexedDB local', 'Funciona sin conexión', 'Instalable como app', 'Respaldo en archivo cuando quieras', '100 % gratis']
      : ['No sign-up, no email', 'No servers: local IndexedDB', 'Works offline', 'Installable as an app', 'Back up to a file anytime', '100% free'];
    let s = '';
    let y = bodyTop + 30;
    const rowH = fmt === 'post' ? 86 : 118;
    items.forEach((it, k) => {
      s += `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="1.5" fill="${SOFT}"/>`;
      s += text(M5, String(k + 1).padStart(2, '0'), M, y + rowH / 2 + 10, 22, ACCENT, 1).svg;
      s += text(G5, it, M + 80, y + rowH / 2 + 14, 40, PAPER, -0.5).svg;
      y += rowH;
    });
    s += `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="1.5" fill="${SOFT}"/>`;
    comp = sharp(Buffer.from(svgDoc(W, H, head + s, INK)));
  }
  const out = resolve(F, lang, fmt === 'post' ? 'post-4x5' : 'historia-9x16', `${num}-${(f.en[0] + ' ' + f.en[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`);
  mkdirSync(dirname(out), { recursive: true });
  await comp.png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out.replace(OUT, ''));
}
for (const lang of ['es', 'en']) for (const fmt of ['post', 'story']) for (const [i, f] of FEATS.entries()) await feature(i, f, lang, fmt);

// capturas limpias
for (const f of ['m-dark-01-bienvenida', 'm-dark-02-hoy', 'm-dark-03a-sesion', 'm-dark-03-sesion', 'm-dark-05-progreso', 'm-dark-06-ejercicio', 'm-dark-07-historial', 'm-dark-08-biblioteca', 'm-dark-09-programa', 'm-light-02-hoy', 'm-light-03-sesion', 'm-light-05-progreso', 'm-light-06-ejercicio', 'd-dark-02-hoy', 'd-dark-03-sesion', 'd-dark-05-progreso', 'd-dark-06-ejercicio', 'd-light-02-hoy']) {
  try { mkdirSync(resolve(F, 'capturas'), { recursive: true }); copyFileSync(resolve(SHOTS, f + '.png'), resolve(F, 'capturas', f.replace(/^m-/, 'movil-').replace(/^d-/, 'escritorio-').replace('dark', 'oscuro').replace('light', 'claro') + '.png')); } catch {}
}
console.log('listo');
