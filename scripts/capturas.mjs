// Toma las capturas de la app con los datos de ejemplo: celular (390 × 844, 3×) y escritorio (1440 × 900, 2×),
// tema claro y oscuro. Las usan docs/rediseno, public/inicio/img, public/screenshots y el kit de lanzamiento.
// Requiere la app servida (npm run build && npx vite preview --port 4173) y Playwright con Chromium.
//   node scripts/capturas.mjs <carpeta-salida> [url]
// Nombres: {m|d}-{dark|light}-NN-pantalla.png (el formato que espera lanzamiento/05-scripts/launch-assets.mjs).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const load = async () => {
  try {
    return await import('playwright');
  } catch {
    return import('/opt/node22/lib/node_modules/playwright/index.mjs');
  }
};
const { chromium } = await load();

const out = resolve(process.argv[2] ?? 'capturas');
const url = (process.argv[3] ?? 'http://localhost:4173').replace(/\/$/, '');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function run(scheme, device) {
  const mobile = device === 'm';
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 2,
    colorScheme: scheme,
    locale: 'es-MX',
    timezoneId: 'America/Tijuana',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  const p = await ctx.newPage();
  const snap = async (name) => {
    await p.waitForTimeout(700);
    await p.screenshot({ path: resolve(out, `${device}-${scheme}-${name}.png`) });
    console.log(`${device}-${scheme}-${name}`);
  };
  const go = async (path) => {
    await p.goto(url + path);
    await p.waitForLoadState('networkidle');
  };

  await go('/bienvenida');
  await snap('01-bienvenida');
  await p.getByText('Cargar datos de ejemplo').click();
  await p.waitForTimeout(2500);

  await go('/');
  await snap('02-hoy');
  await go('/progreso');
  await snap('05-progreso');
  await go('/progreso/sentadilla');
  await snap('06-ejercicio');
  await go('/historial');
  await snap('07-historial');
  await go('/biblioteca');
  await snap('08-biblioteca');
  await go('/programas');
  await snap('10-programas');
  await p.getByText('Torso / Pierna (ejemplo)').first().click();
  await snap('09-programa');
  await go('/ajustes');
  await snap('11-ajustes');

  // Sesión: recién empezada y con dos series registradas (descanso corriendo).
  await go('/');
  await p.getByRole('button', { name: /^Empezar/ }).first().click();
  await p.waitForURL(/\/sesion$/);
  await p.waitForTimeout(800);
  await snap('03a-sesion');
  const regs = p.locator('[aria-label^="Registrar serie"]');
  await regs.first().click();
  await p.waitForTimeout(600);
  await regs.first().click();
  await p.waitForTimeout(3000);
  await snap('03-sesion');

  // Resumen: termina y guarda.
  await p.getByRole('button', { name: /^Terminar/ }).first().click();
  await p.getByRole('button', { name: 'Guardar y terminar' }).click();
  await p.waitForURL(/resumen/);
  await p.waitForTimeout(1500);
  await snap('04-resumen');
  await ctx.close();
}

// SOLO=dark:m (o light:d…) limita la corrida a un tema y un dispositivo.
const solo = process.env.SOLO?.split(':');
for (const scheme of ['dark', 'light'])
  for (const device of ['m', 'd']) if (!solo || (solo[0] === scheme && (!solo[1] || solo[1] === device))) await run(scheme, device);
await browser.close();
