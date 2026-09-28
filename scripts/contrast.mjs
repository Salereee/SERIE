// Verifica contraste WCAG de cada combinación texto/fondo que usa la app, en ambos temas.
// Uso: node scripts/contrast.mjs   (sale con código 1 si alguna combinación no cumple)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}
const light = tokens(css.slice(0, css.indexOf('@media')));
const dark = { ...light, ...tokens(css.slice(css.indexOf(":root[data-theme='oscuro']"))) };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [texto, fondo, mínimo, dónde aparece]
const PAIRS = [
  ['ink', 'bg', 4.5, 'texto general'],
  ['ink', 'surface', 4.5, 'inputs, notas'],
  ['ink', 'fill', 4.5, 'filas en hover / seleccionadas'],
  ['ink-2', 'bg', 4.5, 'texto secundario'],
  ['muted', 'bg', 4.5, 'etiquetas y metadatos'],
  ['muted', 'surface', 4.5, 'pistas en inputs'],
  ['muted', 'fill', 4.5, 'metadatos en filas activas'],
  ['bg', 'ink', 4.5, 'botón primario, barra de sesión, toasts'],
  ['accent', 'bg', 4.5, 'texto de acento (PR en inputs, punto de marca)'],
  ['accent', 'surface', 4.5, 'acento sobre superficie'],
  ['accent-ink', 'accent', 4.5, 'botón ✓ activo, toast PR, descanso terminado'],
  ['danger', 'bg', 4.5, 'botones de borrar'],
  ['danger', 'surface', 4.5, 'errores en formularios'],
  ['focus', 'bg', 3, 'anillo de foco (no texto)'],
  ['accent', 'bg', 3, 'barra de serie activa y puntos PR (no texto)'],
  ['line', 'bg', 3, 'bordes de inputs (no texto)'],
];

let bad = 0;
for (const [name, t] of [['claro', light], ['oscuro', dark]]) {
  console.log(`\nTema ${name}`);
  for (const [fg, bg, min, where] of PAIRS) {
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1 (mín ${min})  ${fg} sobre ${bg} — ${where}`);
  }
}
process.exit(bad ? 1 : 0);
