// Genera las imágenes del README (docs/img/) con la identidad de la app: Space Grotesk + JetBrains Mono,
// tinta/papel y un solo acento. Usa las capturas reales de public/inicio/img/.
// Requiere Google Chrome y puppeteer-core (no es dependencia del proyecto):
//   npm i --no-save puppeteer-core && node scripts/readme-visuals.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'docs/img');
const tmp = resolve(out, '.tmp');
mkdirSync(tmp, { recursive: true });
const url = (p) => pathToFileURL(resolve(root, p)).href;
const font = (pkg, file) => url(`node_modules/@fontsource/${pkg}/files/${file}`);
const shot = (name, theme) => url(`public/inicio/img/${name}${theme === 'claro' ? '-claro' : ''}.webp`);

const THEMES = {
  oscuro: { bg: '#0e0e0d', surface: '#161614', ink: '#f2f1ec', muted: '#a3a198', soft: '#3a3935', accent: '#ff5a1f' },
  claro: { bg: '#f2f1ec', surface: '#fbfaf7', ink: '#0e0e0d', muted: '#5d5c56', soft: '#c9c7bf', accent: '#c43800' },
};

const base = (t, w, h) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:SG;font-weight:400;src:url(${font('space-grotesk', 'space-grotesk-latin-400-normal.woff2')})}
@font-face{font-family:SG;font-weight:500;src:url(${font('space-grotesk', 'space-grotesk-latin-500-normal.woff2')})}
@font-face{font-family:SG;font-weight:700;src:url(${font('space-grotesk', 'space-grotesk-latin-700-normal.woff2')})}
@font-face{font-family:JB;font-weight:400;src:url(${font('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2')})}
@font-face{font-family:JB;font-weight:500;src:url(${font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2')})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{background:${t.bg};color:${t.ink};font-family:SG,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.mono{font-family:JB,monospace}
.eyebrow{font-family:JB,monospace;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${t.muted}}
.ink{color:${t.ink}}
.dot{color:${t.accent}}
.ruler{height:14px;background:
  repeating-linear-gradient(90deg,${t.ink} 0 1px,transparent 1px 8px) bottom/100% 7px no-repeat,
  repeating-linear-gradient(90deg,${t.ink} 0 2px,transparent 2px 40px) bottom/100% 14px no-repeat}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:26px;letter-spacing:.22em}
.brand i{width:22px;height:22px;background:${t.accent};display:block}
.phone{border:2px solid ${t.ink};background:${t.bg};padding:8px;box-shadow:14px 14px 0 ${t.soft}}
.phone img{display:block;width:100%;border:1px solid ${t.soft}}
.rule{border-top:2px solid ${t.ink}}
</style>`;

const hero = (t, th) => `${base(t, 1200, 540)}
<div style="position:absolute;left:64px;top:56px;width:640px">
  <div class="brand"><i></i>SERIE</div>
  <div style="display:flex;justify-content:space-between;margin-top:54px;padding-bottom:12px;border-bottom:2px solid ${t.ink}">
    <span class="eyebrow ink">Registro de entrenamiento</span><span class="eyebrow">N.º 01 · v1.0</span>
  </div>
  <h1 style="font-size:92px;line-height:.92;letter-spacing:-.045em;font-weight:700;margin-top:30px">Cada serie,<br>anotada<span class="dot">.</span></h1>
  <div class="ruler" style="margin-top:28px;width:560px"></div>
  <p style="font-size:21px;line-height:1.45;margin-top:22px;max-width:30ch;color:${t.muted}">Planea tu split, registra peso y reps en un toque y mira cómo subes.</p>
</div>
<div class="phone" style="position:absolute;left:760px;top:70px;width:230px;transform:rotate(-3deg)"><img src="${shot('hoy', th)}"></div>
<div class="phone" style="position:absolute;left:920px;top:120px;width:230px;transform:rotate(2deg)"><img src="${shot('sesion', th)}"></div>`;

const SCREENS = [
  ['01', 'hoy', 'Hoy', 'Qué día toca y con qué ejercicios.'],
  ['02', 'sesion', 'Sesión', 'Peso y reps prellenados; un toque registra.'],
  ['03', 'ejercicio', 'Por ejercicio', 'Récords, gráfica y sugerencia de peso.'],
  ['04', 'progreso', 'Progreso', 'Sesiones, volumen y constancia.'],
];
const screens = (t, th) => `${base(t, 1200, 720)}
<div style="position:absolute;left:56px;right:56px;top:40px;display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:2px solid ${t.ink}">
  <span class="eyebrow ink">Pantallas</span><span class="eyebrow">Capturas reales · datos de ejemplo</span>
</div>
<div style="position:absolute;left:56px;right:56px;top:100px;display:grid;grid-template-columns:repeat(4,1fr);gap:40px">
${SCREENS.map(([n, img, title, text]) => `<figure>
  <div class="phone" style="box-shadow:10px 10px 0 ${t.soft}"><img src="${shot(img, th)}" style="height:470px;object-fit:cover;object-position:top"></div>
  <figcaption style="margin-top:26px">
    <div style="display:flex;gap:10px;align-items:baseline"><span class="mono dot" style="font-size:14px">${n}</span><span style="font-weight:700;font-size:22px;letter-spacing:-.02em">${title}</span></div>
    <p style="margin-top:6px;font-size:15px;line-height:1.4;color:${t.muted}">${text}</p>
  </figcaption></figure>`).join('')}
</div>`;

const desktop = (t, th) => `${base(t, 1200, 800)}
<div style="position:absolute;left:56px;right:56px;top:40px;display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:2px solid ${t.ink}">
  <span class="eyebrow ink">En computadora</span><span class="eyebrow">Barra lateral · dos columnas</span>
</div>
<div style="position:absolute;left:56px;right:70px;top:104px;border:2px solid ${t.ink};background:${t.bg};box-shadow:14px 14px 0 ${t.soft}">
  <div style="display:flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-bottom:2px solid ${t.ink}">
    <i style="width:10px;height:10px;border:2px solid ${t.ink}"></i><i style="width:10px;height:10px;border:2px solid ${t.ink}"></i><i style="width:10px;height:10px;background:${t.accent}"></i>
    <span class="mono" style="font-size:13px;color:${t.muted};margin-left:14px">salereee.github.io/SERIE</span>
  </div>
  <img src="${shot('escritorio', th)}" style="display:block;width:100%">
</div>`;

const PRINCIPLES = [
  ['Sin cuentas', 'Nada de registro ni contraseñas. Abres y entrenas.'],
  ['Sin servidor', 'Tus datos viven en tu navegador (IndexedDB). Nada se envía a internet.'],
  ['Sin conexión', 'Se instala como app y funciona sin señal después de la primera visita.'],
];
const principles = (t) => `${base(t, 1200, 300)}
<div style="position:absolute;left:56px;right:56px;top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:40px">
${PRINCIPLES.map(([title, text], i) => `<div style="border-top:2px solid ${t.ink};padding-top:22px">
  <span class="mono dot" style="font-size:14px">0${i + 1}</span>
  <h3 style="font-size:40px;letter-spacing:-.035em;line-height:1;margin-top:18px">${title}<span class="dot">.</span></h3>
  <p style="margin-top:16px;font-size:17px;line-height:1.45;color:${t.muted}">${text}</p>
</div>`).join('')}
</div>
<div class="ruler" style="position:absolute;left:56px;right:56px;bottom:28px"></div>`;

// Tarjeta para redes (Settings → Social preview de GitHub): 1280×640.
const social = (t) => `${base(t, 1280, 640)}
<div style="position:absolute;left:80px;top:72px;width:720px">
  <div class="brand"><i></i>SERIE</div>
  <h1 style="font-size:104px;line-height:.92;letter-spacing:-.045em;font-weight:700;margin-top:70px">Cada serie,<br>anotada<span class="dot">.</span></h1>
  <div class="ruler" style="margin-top:36px;width:600px"></div>
  <p class="mono" style="font-size:17px;margin-top:26px;color:${t.muted};letter-spacing:.04em">PWA · SIN CUENTAS · SIN CONEXIÓN · GRATIS</p>
</div>
<div class="phone" style="position:absolute;left:880px;top:64px;width:300px;transform:rotate(-2deg)"><img src="${shot('sesion', 'oscuro')}"></div>`;

const jobs = [];
for (const th of ['oscuro', 'claro']) {
  const t = THEMES[th];
  jobs.push([`hero-${th}`, hero(t, th), 1200, 540]);
  jobs.push([`pantallas-${th}`, screens(t, th), 1200, 720]);
  jobs.push([`escritorio-${th}`, desktop(t, th), 1200, 800]);
  jobs.push([`principios-${th}`, principles(t), 1200, 300]);
}
jobs.push(['social-preview', social(THEMES.oscuro), 1280, 640]);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
for (const [name, html, w, h] of jobs) {
  const file = resolve(tmp, `${name}.html`);
  writeFileSync(file, html);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: name === 'social-preview' ? 1 : 1.5 });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(out, `${name}.png`) });
  console.log('docs/img/' + name + '.png');
}
await browser.close();
