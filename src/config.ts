/**
 * Configuración pública del sitio (nada de esto es secreto: termina en el HTML).
 * Se define con variables de entorno al construir; ver README → "Decisiones de publicación".
 */
export const ANALYTICS_ENABLED = Boolean(import.meta.env.VITE_CF_ANALYTICS_TOKEN);
