// Genera los íconos de la PWA y la imagen Open Graph a partir de la identidad visual.
// Uso: npm run icons   (los PNG resultantes se versionan en public/, no hace falta correrlo en cada build)
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => resolve(root, 'public', p);
const font = (pkg, file) => {
  const buf = readFileSync(resolve(root, 'node_modules/@fontsource', pkg, 'files', file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

const INK = '#0E0E0D';
const PAPER = '#F2F1EC';
const ACCENT = '#FF5A1F';

const grotesk = font('space-grotesk', 'space-grotesk-latin-700-normal.woff');
const groteskMed = font('space-grotesk', 'space-grotesk-latin-600-normal.woff');
const mono = font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff');

/** Texto convertido a trazos: no depende de fuentes instaladas en la máquina que genera. */
function text(f, str, x, y, size, fill, tracking = 0) {
  let cx = x;
  let svg = '';
  for (const ch of str) {
    const glyph = f.charToGlyph(ch);
    // Se arma el trazo a mano: toPathData() de opentype.js a veces escribe "NaN" con posiciones fraccionarias.
    const n = (v) => v.toFixed(2);
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

/** Marca: barra con discos, el mismo dibujo del favicon. `s` = lado del cuadro de dibujo. */
function mark(cx, cy, s) {
  const u = s / 32;
  const x0 = cx - s / 2;
  const y0 = cy - s / 2;
  return `
    <rect x="${x0 + 6 * u}" y="${y0 + 14 * u}" width="${20 * u}" height="${4 * u}" fill="${ACCENT}"/>
    <rect x="${x0 + 4 * u}" y="${y0 + 8 * u}" width="${4 * u}" height="${16 * u}" fill="${PAPER}"/>
    <rect x="${x0 + 24 * u}" y="${y0 + 8 * u}" width="${4 * u}" height="${16 * u}" fill="${PAPER}"/>
    <rect x="${x0 + 1 * u}" y="${y0 + 11 * u}" width="${3 * u}" height="${10 * u}" fill="${PAPER}"/>
    <rect x="${x0 + 28 * u}" y="${y0 + 11 * u}" width="${3 * u}" height="${10 * u}" fill="${PAPER}"/>`;
}

function ruler(x, y, width, color, step = 12, big = 5) {
  let d = '';
  for (let i = 0, px = x; px <= x + width; i++, px += step) {
    const h = i % big === 0 ? 18 : 9;
    d += `<rect x="${px}" y="${y - h}" width="${i % big === 0 ? 3 : 2}" height="${h}" fill="${color}"/>`;
  }
  return d;
}

function iconSvg(size, { maskable = false, favicon = false } = {}) {
  // En íconos "maskable" el sistema recorta hasta un 20 %: la marca va más chica.
  // En el favicon (16–48 px) va más grande para que se lea en la pestaña.
  const s = size * (maskable ? 0.56 : favicon ? 0.9 : 0.72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${INK}"/>
    ${mark(size / 2, size / 2, s)}
  </svg>`;
}

function ogSvg() {
  const W = 1200;
  const H = 630;
  const brand = text(grotesk, 'SERIE', 124, 118, 40, PAPER, 9);
  const l1 = text(grotesk, 'Cada serie,', 72, 340, 150, PAPER, -6);
  const l2 = text(grotesk, 'anotada', 72, 480, 150, PAPER, -6);
  const dot = text(grotesk, '.', 72 + l2.width - 4, 480, 150, ACCENT);
  const sub = text(mono, 'REGISTRO DE ENTRENAMIENTO · SIN CUENTAS · TUS DATOS EN TU DISPOSITIVO', 72, 580, 19, '#A3A198', 1.2);
  const num = text(groteskMed, 'N.º 01', 1030, 118, 26, '#A3A198', 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${INK}"/>
    <rect x="72" y="86" width="34" height="34" fill="${ACCENT}"/>
    ${brand.svg}
    ${num.svg}
    <rect x="72" y="150" width="${W - 144}" height="4" fill="${PAPER}"/>
    ${l1.svg}${l2.svg}${dot.svg}
    ${ruler(72, 530, W - 144, '#5D5C56')}
    ${sub.svg}
  </svg>`;
}

async function png(svg, out) {
  mkdirSync(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out.replace(root, '.'));
}

await png(iconSvg(192), pub('icons/icon-192.png'));
await png(iconSvg(512), pub('icons/icon-512.png'));
await png(iconSvg(512, { maskable: true }), pub('icons/icon-maskable-512.png'));
await png(iconSvg(180), pub('apple-touch-icon.png'));
await png(ogSvg(), pub('og.png'));
writeFileSync(pub('favicon.svg'), iconSvg(32, { favicon: true }).replace(/\n\s*/g, ''));
console.log('✓ ./public/favicon.svg');
