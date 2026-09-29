import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Decisiones de publicación (ver README). Todas se controlan con variables de entorno
 * para aplicarlas sin tocar código:
 *  - VITE_SITE_URL: URL pública (Open Graph, canonical y sitemap). Vacía = rutas relativas y sin sitemap.
 *  - VITE_CF_ANALYTICS_TOKEN: activa Cloudflare Web Analytics. Vacía = sin analítica.
 *  - ALLOW_INDEXING=true: permite buscadores (y publica sitemap.xml si hay VITE_SITE_URL). Por defecto: noindex.
 *  - SOURCEMAP=true: publica source maps. Por defecto: no.
 *  - BASE_PATH: subruta donde vive la app (p. ej. /serie/ en GitHub Pages). Vacía = raíz del dominio.
 *  - GITHUB_PAGES=true: agrega lo que Cloudflare resuelve y GitHub Pages no (ver githubPages()).
 */
function publishSettings(env: Record<string, string>): Plugin {
  const site = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');
  const token = env.VITE_CF_ANALYTICS_TOKEN ?? '';
  const indexable = env.ALLOW_INDEXING === 'true';
  return {
    name: 'serie-publish-settings',
    transformIndexHtml(html) {
      let out = html.replaceAll('%SITE_URL%', site);
      out = out.replace('%ROBOTS%', indexable ? 'index, follow' : 'noindex, nofollow');
      if (token) {
        out = out.replace(
          '</body>',
          `  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token })}'></script>\n  </body>`,
        );
      }
      return out;
    },
    generateBundle() {
      // El sitemap necesita URL absolutas: solo se publica si se puede indexar y hay dominio.
      const sitemap = indexable && site !== '';
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: indexable ? `User-agent: *\nAllow: /\n${sitemap ? `Sitemap: ${site}/sitemap.xml\n` : ''}` : 'User-agent: *\nDisallow: /\n',
      });
      if (sitemap) {
        const lastmod = new Date().toISOString().slice(0, 10);
        const urls = ['/', '/inicio/'].map((path) => `  <url><loc>${site}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        });
      }
    },
  };
}

/**
 * GitHub Pages no lee public/_headers ni tiene modo SPA:
 *  - la CSP va en una etiqueta <meta> (sin frame-ancestors, que en <meta> no aplica);
 *  - 404.html es una copia de index.html, así un enlace directo a /serie/progreso abre la app
 *    y React Router resuelve la ruta.
 */
function githubPages(enabled: boolean): Plugin {
  const csp =
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests";
  let outDir = 'dist';
  return {
    name: 'serie-github-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      if (!enabled) return html;
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`);
    },
    closeBundle() {
      if (!enabled) return;
      const dir = new URL(`./${outDir}/`, import.meta.url);
      copyFileSync(new URL('index.html', dir), new URL('404.html', dir));
      writeFileSync(new URL('.nojekyll', dir), '');
      // Solo sirven en Cloudflare Pages.
      for (const f of ['_headers', '_redirects']) rmSync(new URL(f, dir), { force: true });
    },
  };
}

/**
 * `vite preview` aplica las cabeceras globales (`/*`) de public/_headers,
 * para probar la CSP en local igual que en Cloudflare Pages.
 */
function previewHeaders(): Plugin {
  return {
    name: 'serie-preview-headers',
    configurePreviewServer(server) {
      const text = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8');
      const headers: [string, string][] = [];
      let inGlobal = false;
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        if (!/^\s/.test(line)) {
          inGlobal = line.trim() === '/*';
          continue;
        }
        const m = inGlobal && line.trim().match(/^([\w-]+):\s*(.+)$/);
        if (m) headers.push([m[1], m[2]]);
      }
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of headers) if (k !== 'Strict-Transport-Security') res.setHeader(k, k === 'Content-Security-Policy' ? v.replace('; upgrade-insecure-requests', '') : v);
        next();
      });
    },
  };
}

/**
 * En local, `/inicio` (sin barra) caería en el fallback SPA de Vite y abriría la app.
 * Se redirige a `/inicio/`, que sirve public/inicio/index.html, como hace Cloudflare Pages.
 * En `npm run dev` además hay que apuntar `/inicio/` al archivo: Vite no busca index.html en public/.
 */
function landingRedirect(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader(name: string, value: string): unknown; end(): unknown }, next: () => void) => {
    const [path, query] = (req.url ?? '').split('?');
    if (path !== '/inicio') return next();
    res.statusCode = 308;
    res.setHeader('Location', `/inicio/${query ? `?${query}` : ''}`);
    res.end();
  };
  return {
    name: 'serie-landing-redirect',
    configureServer(server) {
      server.middlewares.use(redirect);
      server.middlewares.use((req, _res, next) => {
        if (req.url?.split('?')[0] === '/inicio/') req.url = req.url.replace('/inicio/', '/inicio/index.html');
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Siempre con barra al inicio y al final: '/', '/serie/'.
  const base = `/${(env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: { sourcemap: env.SOURCEMAP === 'true' },
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    plugins: [
      react(),
      publishSettings(env),
      previewHeaders(),
      landingRedirect(),
      githubPages(env.GITHUB_PAGES === 'true'),
      VitePWA({
        // 'prompt': nunca se actualiza sola; la app avisa y el usuario decide cuándo.
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: base,
          name: 'SERIE — registro de entrenamiento',
          short_name: 'SERIE',
          description: 'Registra tus rutinas de gimnasio. Tus datos se guardan solo en tu dispositivo.',
          lang: 'es-MX',
          dir: 'ltr',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0e0e0d',
          theme_color: '#0e0e0d',
          categories: ['health', 'fitness', 'sports'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          // Capturas para la ventana de instalación enriquecida (Android/Chrome y escritorio).
          screenshots: [
            { src: 'screenshots/movil-1-hoy.png', sizes: '1080x2337', type: 'image/png', form_factor: 'narrow', label: 'Hoy: tu día de entrenamiento' },
            { src: 'screenshots/movil-2-sesion.png', sizes: '1080x2337', type: 'image/png', form_factor: 'narrow', label: 'Sesión activa con timer de descanso' },
            { src: 'screenshots/movil-3-progreso.png', sizes: '1080x2337', type: 'image/png', form_factor: 'narrow', label: 'Progreso por ejercicio' },
            { src: 'screenshots/movil-4-historial.png', sizes: '1080x2337', type: 'image/png', form_factor: 'narrow', label: 'Historial de sesiones' },
            { src: 'screenshots/escritorio-1-hoy.png', sizes: '1920x1200', type: 'image/png', form_factor: 'wide', label: 'SERIE en computadora' },
            { src: 'screenshots/escritorio-2-sesion.png', sizes: '1920x1200', type: 'image/png', form_factor: 'wide', label: 'Sesión en computadora' },
          ],
          // Accesos directos (mantener presionado el ícono). Solo rutas que existen en src/App.tsx.
          shortcuts: [
            { name: 'Ver progreso', short_name: 'Progreso', url: `${base}progreso`, icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
            { name: 'Historial', short_name: 'Historial', url: `${base}historial`, icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          ],
        },
        workbox: {
          // Todo lo necesario para funcionar sin señal después de la primera visita.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          // Fuera del precache: imágenes para compartir, capturas del manifest, favicons PNG
          // (el navegador usa el SVG) y la página de presentación. Así el service worker sigue ligero.
          globIgnores: ['og.png', 'og-en.png', 'favicon-*.png', 'screenshots/**', 'inicio/**'],
          navigateFallback: `${base}index.html`,
          // /inicio es una página estática aparte: una app instalada no debe responderla con la app.
          navigateFallbackDenylist: [new RegExp(`^${escaped}inicio(/|$)`)],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
  };
});
