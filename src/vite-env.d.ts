/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** URL pública del sitio, para las etiquetas Open Graph (p. ej. https://serie.pages.dev). */
  readonly VITE_SITE_URL?: string;
  /** Token público de Cloudflare Web Analytics. Vacío = sin analítica. */
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
}
