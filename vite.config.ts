import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Decisiones de publicación (ver README). Todas se controlan con variables de entorno
 * para aplicarlas sin tocar código:
 *  - VITE_SITE_URL: URL pública (Open Graph absoluto). Vacía = rutas relativas.
 *  - VITE_CF_ANALYTICS_TOKEN: activa Cloudflare Web Analytics. Vacía = sin analítica.
 *  - ALLOW_INDEXING=true: permite buscadores. Por defecto: noindex.
 *  - SOURCEMAP=true: publica source maps. Por defecto: no.
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
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n',
      });
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: { sourcemap: env.SOURCEMAP === 'true' },
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    plugins: [
      react(),
      publishSettings(env),
      previewHeaders(),
      VitePWA({
        // 'prompt': nunca se actualiza sola; la app avisa y el usuario decide cuándo.
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'SERIE — registro de entrenamiento',
          short_name: 'SERIE',
          description: 'Registra tus rutinas de gimnasio. Tus datos se guardan solo en tu dispositivo.',
          lang: 'es-MX',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0e0e0d',
          theme_color: '#0e0e0d',
          categories: ['health', 'fitness', 'sports'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Todo lo necesario para funcionar sin señal después de la primera visita.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          globIgnores: ['og.png'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
  };
});
