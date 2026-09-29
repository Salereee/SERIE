# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). La versión actual se ve en **Ajustes**.

## [Sin publicar]

Material de lanzamiento, publicación en GitHub Pages y orden de la interfaz. Los datos guardados no cambian de formato.

### Interfaz
- Listas largas recortadas con desvanecido y botón “Ver los N…” (Biblioteca, selector de ejercicios, Historial por mes, Progreso, Hoy, recomendación de programa).
- Sesión activa como acordeón: el ejercicio actual abierto y los demás con su progreso.
- Constructor de programas con filas compactas que se abren al tocarlas.
- Ajustes: Modo, Unidad y Tema siempre visibles; el resto en secciones desplegables con más espacio.
- Hoy: el mapa de 12 semanas queda plegado en celular.

### Modo básico
- Sin RIR/RPE ni 1RM estimado: se muestra el peso máximo y el récord de 1RM se llama “Mejor serie”.
- Modo avanzado: nuevo ajuste “Anotar esfuerzo (RIR y RPE)” para quitar la columna de RIR.

### GitHub Pages
- Workflow que publica en `https://<usuario>.github.io/<repo>/` en cada push a `main`.
- `BASE_PATH` y `GITHUB_PAGES`: la app funciona en una subruta, con CSP en `<meta>` y `404.html` para enlaces directos.
- La página de presentación usa rutas relativas.

### Publicación
- Página de presentación bilingüe (ES/EN) en `/inicio/`: estática, con fuentes autoalojadas y sin estilos ni scripts en línea (cumple la CSP estricta). Enlazada desde Ajustes → Acerca de.
- `sitemap.xml` (`/` y `/inicio/`) y línea `Sitemap:` en `robots.txt`, solo con `ALLOW_INDEXING=true` y `VITE_SITE_URL` definida.
- `index.html`: `canonical`, `og:url`, `og:locale:alternate`, `twitter:title/description/image`, palabras clave y datos estructurados `WebApplication` (JSON-LD).
- `_redirects` sin reglas: las rutas de la app las resuelve el modo SPA de Cloudflare Pages y `/inicio/` se sirve como archivo.

### Instalación
- Manifest con 6 capturas (celular y escritorio) para la ventana de instalación enriquecida y accesos directos a Progreso e Historial.
- `favicon.ico` y favicons PNG de 16, 32 y 48 px; `favicon.svg` con la marca más grande para que se lea en la pestaña.
- Imagen para compartir actualizada (`og.png`) y variante en inglés (`og-en.png`).
- El service worker no precachea capturas, imágenes para compartir, favicons PNG ni `/inicio/`, y no responde `/inicio` con la app.

## [1.0.0] — 2026-09-27

Primera versión pública.

### Entrenamiento
- Biblioteca de 99 ejercicios con nombres de gimnasio mexicano, búsqueda, filtros, recientes y ejercicios propios.
- Modo básico: cuestionario de 4 preguntas y split recomendado (Full Body, Torso/Pierna, PPL, PHUL, Arnold, Bro Split) adaptado a equipo, objetivo y experiencia.
- Modo avanzado: constructor de splits con arrastrar y soltar, supersets, RIR/RPE y calentamientos.
- Sesión activa con valores prellenados, registro en un toque, timer de descanso con ±15 s, récords en vivo y resumen final.
- Progreso: 1RM estimado (Epley), peso máximo, récords, frecuencia semanal y volumen por grupo muscular.
- Sobrecarga progresiva sugerida (doble progresión y descarga), siempre opcional.

### Datos
- Base local IndexedDB con migraciones versionadas (v3: los registros se fechan con el inicio de la sesión, también si cruza la medianoche).
- Respaldo JSON: exportar, importar con validación estricta, fusionar o reemplazar, copia automática previa y recordatorio cada 14 días o 10 sesiones.
- Protección contra dos pestañas editando la misma sesión y aviso si otra pestaña actualiza la base.
- Mensajes claros si el navegador bloquea el almacenamiento o se queda sin espacio.

### App
- Instalable (PWA), funciona sin conexión, aviso de versión nueva que nunca interrumpe una sesión.
- Guía de instalación en iPhone; botón de instalar en Android.
- Aviso visual del fin del descanso para teléfonos sin vibración o en silencio.
- Tema claro y oscuro, contraste AA verificado, navegación con teclado, animaciones que respetan “reducir movimiento”.
- Cabeceras de seguridad (CSP estricta) para Cloudflare Pages.
