# SERIE — registro de rutinas de gimnasio

App web para planear splits y registrar entrenamientos: series, peso, reps, descansos, récords y progreso. **Todo se guarda en tu dispositivo** (IndexedDB): sin cuentas, sin servidor. Se instala como app y funciona sin conexión después de la primera visita.

- Interfaz en español de México, para celular y escritorio.
- Modo básico (cuestionario → split recomendado) y avanzado (constructor, RIR/RPE, supersets).
- Timer de descanso, récords en vivo, sobrecarga progresiva sugerida, gráficas de progreso.

## Requisitos

- Node **22.12 o más reciente** (fijado en `.nvmrc` y en `engines` de `package.json`).
- npm 10+.

## Correr en local

```bash
npm install
npm run dev
```

Abre la URL `Local` que imprime Vite (por defecto <http://localhost:5173>).

### Abrirla desde el celular

`npm run dev` ya expone el servidor en tu red local. Vite imprime algo como:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.74:5173/
```

1. Conecta el celular a **la misma red WiFi** que la computadora.
2. Abre la URL `Network` en el navegador del celular.
3. Si no carga, permite Node.js en el firewall (en Windows: “Redes privadas”) y verifica que la red esté marcada como privada.

> En modo desarrollo no hay service worker; la instalación y el modo sin conexión se prueban con `npm run build && npm run preview` o en el sitio publicado.

## Tests y build

| Comando | Qué hace |
| --- | --- |
| `npm test` | Pruebas de lógica: 1RM, progresión, deload, récords, recomendación, migraciones, sesión, respaldo (incluidos archivos malformados), unidades, medianoche |
| `npm run check:contrast` | Verifica contraste WCAG AA de todas las combinaciones de color, en ambos temas |
| `npm run build` | Revisa tipos y genera `dist/` (incluye service worker, manifest, `_headers`, `_redirects`, `robots.txt`) |
| `npm run build:ci` | `test` + `check:contrast` + `build`. **Es el que usa Cloudflare**: si un test falla, no se publica |
| `npm run preview` | Sirve `dist/` en <http://localhost:4173> (con `--host` para probar en el celular) |
| `npm run icons` | Regenera íconos PWA, `apple-touch-icon`, favicon e imagen Open Graph desde la identidad visual |

## Despliegue en Cloudflare Pages

### Opción A: conectar el repositorio de GitHub (recomendada)

1. Sube el repo a GitHub.
2. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elige el repo.
3. Configuración de build:
   - **Framework preset:** None
   - **Build command:** `npm run build:ci`
   - **Build output directory:** `dist`
   - **Variables de entorno:** `NODE_VERSION` = `22` (más las opcionales de [Decisiones de publicación](#decisiones-de-publicación)).
4. Guarda y despliega. Cada push a la rama principal publica; cada pull request genera una vista previa con su propia URL.

### Opción B: subida directa con Wrangler

```bash
npm run build:ci
npx wrangler pages deploy dist --project-name serie
```

La primera vez, Wrangler abre el navegador para iniciar sesión en Cloudflare y crea el proyecto.

### Qué se publica además de la app

- `public/_headers`: CSP estricta (solo recursos propios), `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (solo *wake lock*; cámara, micrófono y ubicación bloqueados) y cache largo para `/assets/*`.
- `public/_redirects`: `/* /index.html 200` para que las rutas de la app funcionen al recargar. Vite no genera `404.html`, así que no hay conflicto.

### Rollback

- **Desde el panel:** Workers & Pages → proyecto → **Deployments** → en un despliegue anterior, **⋯ → Rollback to this deployment**. Es inmediato.
- **Desde git:** `git revert <commit>` y push; Cloudflare publica la versión corregida.
- Los usuarios con la app abierta verán “Hay una versión nueva · Actualizar” (nunca durante una sesión activa). Sus datos no se tocan: viven en su dispositivo.

## Decisiones de publicación

Se controlan con variables de entorno en Cloudflare (**Settings → Variables and Secrets**) o en `.env.production.local`; ninguna es secreta. Ver `.env.example`.

| Variable | Efecto | Por defecto |
| --- | --- | --- |
| `VITE_SITE_URL` | URL pública; se usa para que la imagen Open Graph tenga URL absoluta (WhatsApp, Facebook) | vacío (ruta relativa) |
| `ALLOW_INDEXING` | `true` = aparece en buscadores (`robots.txt` y meta `robots`) | no indexar |
| `SOURCEMAP` | `true` = publica los source maps | no |
| `VITE_CF_ANALYTICS_TOKEN` | Activa Cloudflare Web Analytics y cambia el aviso de privacidad en “Acerca de”. **Además** hay que cambiar la línea `Content-Security-Policy` de `public/_headers` por la alternativa comentada ahí mismo | sin analítica |

## Limitaciones conocidas

- **Los datos son por dispositivo, por navegador y por dominio.** El celular y la computadora no comparten datos; tampoco `localhost` y el sitio publicado, ni `algo.pages.dev` y un dominio propio. Para mover datos: Ajustes → Exportar / Importar.
- **Sin sincronización ni cuentas**: es a propósito (privacidad), pero implica que si pierdes el dispositivo y no tienes respaldo, pierdes los datos.
- **Safari en iOS puede borrar los datos** de un sitio que no visitas en varias semanas si no está instalado. Instálalo en la pantalla de inicio (la app lo explica) y exporta respaldos.
- **iOS no tiene vibración** en el navegador: el fin del descanso se avisa con sonido y con un destello de pantalla y cambio de color.
- **El sonido** depende de que el teléfono no esté en silencio (iOS) y de haber tocado la pantalla al menos una vez en la sesión.
- El modo incógnito de algunos navegadores bloquea IndexedDB; la app lo detecta y lo explica.

## Estructura

```
src/
├─ db/            esquema, Dexie + migraciones, validación de respaldos, seeds, demo, hooks
├─ domain/        lógica pura con pruebas (1RM, progresión, récords, recomendación, unidades…)
├─ features/      pantallas: today, onboarding, programs, session, history, progress, library, settings
├─ pwa/           instalación, aviso de actualización
├─ ui/            primitivos: hoja/diálogo, avisos, error boundary, íconos
├─ hooks/         media queries, reloj, wake lock, audio
└─ styles/        tokens (temas), base, componentes, layout, fuentes
docs/DATOS.md     modelo de datos y cómo agregar migraciones
scripts/          íconos/Open Graph y verificación de contraste
```

Más detalle del modelo de datos en [`docs/DATOS.md`](docs/DATOS.md). Historial de versiones en [`CHANGELOG.md`](CHANGELOG.md). Pruebas en dispositivos reales en [`PRUEBAS-MANUALES.md`](PRUEBAS-MANUALES.md).

## Stack

Vite + React 18 + TypeScript, Dexie 4 (IndexedDB), React Router 7, @dnd-kit, vite-plugin-pwa (Workbox). Gráficas en SVG propio. Fuentes Space Grotesk y JetBrains Mono autoalojadas (subset latino, woff2).
