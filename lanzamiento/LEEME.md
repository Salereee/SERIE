# Kit de lanzamiento — SERIE v1.0.0

Todo se generó a partir del código real de la app (tokens, fuentes y marca de `scripts/make-icons.mjs`) y de capturas tomadas con los datos de ejemplo de la propia app. **No se modificó nada fuera de esta carpeta.**

> **URL provisional:** donde veas `https://serie.pages.dev`, cámbiala por tu URL definitiva
> (en `04-landing/index.html` es la constante `APP_URL` y las metas `og:image`; en `02-indexacion/robots.txt` y `sitemap.xml`).

## 01-logo
| Archivo | Uso |
|---|---|
| `serie-logo-*` | Cuadro naranja + SERIE (el que ya usa la app en la cabecera) |
| `serie-logo-mancuerna-*` | Versión con la mancuerna, para fondos donde el cuadro se pierda |
| `serie-icono-*` | Solo la mancuerna: oscuro, claro, naranja y transparente (1024 px) |
| `serie-avatar-redes-1080.png` | Foto de perfil (margen seguro para recorte circular) |

Variantes: `oscuro` (fondo #0E0E0D), `claro` (fondo #F2F1EC), `transparente-tinta` (para fondos claros), `transparente-blanco` (para fondos oscuros). SVG para web/impresión, PNG a 4× para todo lo demás.

## 02-indexacion — lo que leen Google, WhatsApp, iOS y Android
- `og-es.png`, `og-en.png` — 1200×630, vista previa al compartir el link.
- `favicon.ico` (16/32/48), `favicon.svg`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `mstile-150.png`, `icons/` (192, 512, maskable).
- `screenshots/` — capturas para el manifest (ventana de instalación enriquecida en Android).
- `head-snippet.html` — metas OG/Twitter, canonical y datos estructurados (schema.org `WebApplication`).
- `manifest-agregar.json` — `screenshots` y `shortcuts` para el manifest de `vite.config.ts`.
- `robots.txt`, `sitemap.xml`.

**Para que Google la indexe:** en Cloudflare pon `ALLOW_INDEXING=true` y `VITE_SITE_URL=<tu URL>`. Hoy el build publica `noindex` por defecto.

## 03-funcionamiento — imágenes de cómo funciona
- `es/` y `en/`, cada una con `post-4x5/` (1080×1350) y `historia-9x16/` (1080×1920). 8 piezas:
  01 Cada serie, anotada · 02 Hoy · 03 Un toque · 04 Descanso · 05 Progreso por ejercicio · 06 Constancia · 07 Programas · 08 Privacidad.
- `capturas/` — capturas limpias en móvil (3×) y escritorio (2×), tema oscuro y claro.
- Nota: en las versiones en inglés el texto de la imagen está en inglés, pero la interfaz dentro de la captura sigue en español, porque así es la app.

## 04-landing
Página aparte, bilingüe (ES/EN con botón, detecta el idioma del navegador; `#en` fuerza inglés), tema claro/oscuro automático, con un timer de descanso animado en el hero. Es estática: sube la carpeta completa (`index.html` + `img/`) a otro proyecto de Cloudflare Pages o a cualquier hosting.

## 05-scripts
- `cap.mjs` — vuelve a tomar las capturas (necesita `npm run build && npx vite preview` corriendo y Playwright).
- `launch-assets.mjs` — regenera logo, OG, íconos e imágenes. Cópialo a `scripts/` del proyecto y corre:
  `node scripts/launch-assets.mjs <carpeta-capturas> <carpeta-salida>`.

## Checklist antes de publicar
- [ ] Definir URL final y reemplazar `serie.pages.dev`.
- [ ] Copiar `02-indexacion/*` a `public/` y pegar `head-snippet.html` en `index.html`.
- [ ] Agregar `screenshots`/`shortcuts` al manifest en `vite.config.ts`.
- [ ] Cloudflare: `ALLOW_INDEXING=true`, `VITE_SITE_URL`, `NODE_VERSION=22`.
- [ ] Publicar la landing y enlazar el botón a la app.
- [ ] Probar el link en WhatsApp y en https://www.opengraph.xyz para ver la vista previa.
- [ ] Dar de alta el sitio en Google Search Console y enviar `sitemap.xml`.
