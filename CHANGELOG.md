# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). La versión actual se ve en **Ajustes**.

## [1.2.0] — 2026-10-01

Rediseño minimal: mismos colores, menos ruido. Cada pantalla responde una sola pregunta (Hoy: ¿qué entreno?, Sesión: ¿cuánto levanté?, Progreso: ¿estoy avanzando?). Los datos guardados y los respaldos siguen siendo compatibles: el cambio es solo de interfaz.

### Sesión
- La serie que sigue va en una tarjeta con “la vez pasada” de esa misma serie, campos con sufijo kg/reps y ✓ de 56 px. La primera serie queda en el tercio superior de la pantalla.
- Las series hechas se encogen a una línea (“62.5 kg × 9 ✓”); tocarla la abre para editar.
- La sugerencia es una píldora de un toque (“Sugerido · 62.5 × 9”); la explicación vive en el “?” y en el lector de pantalla.
- Arriba, el reloj de la sesión y una barra con “2 de 18 series”. El volumen se ve en el resumen.
- Descanso en una tarjeta compacta con reloj y Saltar; tocar el reloj abre −15 s y +15 s.
- Calentamiento, nota del ejercicio, discos por lado, historial, cambiar, mover y quitar pasan al menú “···” de cada ejercicio.
- Las notas de la sesión se escriben en el resumen final (mismo campo de siempre).

### Hoy y navegación
- Tres pestañas con ícono: Hoy, Rutinas (Programas | Ejercicios) y Progreso (Resumen | Historial). La pestaña Más desaparece; `/mas` lleva a Ajustes y `/biblioteca` y `/historial` siguen funcionando.
- Ajustes se abre con el engrane de Hoy y desde la barra lateral en escritorio.
- Hoy: qué toca, la semana en siete puntos, los tres primeros ejercicios y “Empezar” fijo sobre las pestañas. “Cambiar de día” junta Otro día y Sesión libre.
- Sin fecha ni regla graduada en el encabezado; la regla y el número en contorno quedan solo en la bienvenida.

### Progreso, Historial y Rutinas
- Progreso: una cifra héroe (sesiones en 30 días), frecuencia y racha, y 12 barras semanales en lugar del mapa de calor. Los récords recientes se mudan aquí desde Hoy; volumen y series por grupo quedan plegados.
- Progreso por ejercicio: 1RM estimado (o peso máximo en modo básico) como cifra principal y una sola gráfica; la fórmula de Epley pasa a un “?”.
- Historial: sesiones en tarjetas por mes, con los PR como texto de acento. Se quita “Abrir todo”.
- Programas en tarjetas con punto de “Activo”; Compartir, Duplicar y Borrar en el menú “···”. Ejercicios con filtros de equipo como chips.
- Ajustes en tarjetas, con interruptores redondeados.

### Sistema visual
- Esquinas de 8, 12, 20 y 24 px; escala de espacio de 4 a 48 px y 40 px entre bloques.
- Superficies y aire en lugar de reglas en tinta. Encabezados y metadatos en sentence case; las mayúsculas quedan para PR y la bienvenida.
- Títulos de 34 px. JetBrains Mono solo en cifras vivas (peso, reps, relojes, cifras héroe); fechas e índices en Space Grotesk con cifras tabulares.
- Botón primario de 56 px; secundarios en relleno; campos con borde tenue que pasa 3:1. `check:contrast` cubre las combinaciones nuevas.

### Imágenes
- Capturas nuevas en el README, la página de presentación, la ventana de instalación y el kit de lanzamiento. Comparativa antes/después en `docs/rediseno/`.
- `scripts/capturas.mjs` toma todas las capturas con los datos de ejemplo (celular y escritorio, claro y oscuro).

## [1.1.0] — 2026-09-28

Pasar rutinas y datos entre dispositivos sin cuentas, y licencia MIT.

### Compartir entre dispositivos
- **Compartir rutina:** en cada programa, un enlace y un código QR con la rutina (días, ejercicios, series, reps, descansos y supersets). Sirve para verla en la computadora, pasarla a otro celular o dársela a alguien. La rutina viaja comprimida dentro del enlace, en la parte `#`, que no llega a ningún servidor; no incluye historial ni notas.
- **Abrir una rutina compartida** (`/importar`): se revisa antes de guardar, se agrega como rutina nueva sin tocar nada existente y funciona en un dispositivo que nunca ha usado SERIE (salta la bienvenida). Los ejercicios propios de la rutina se crean también.
- **Enviar respaldo:** en Ajustes → Datos y respaldo, abre el menú de compartir del sistema con el archivo (WhatsApp, correo, AirDrop, Drive); si el navegador no puede, lo descarga. Con los pasos para importarlo en el otro dispositivo.
- La bienvenida ofrece “Importar tu respaldo” para quien ya usa SERIE en otro equipo, y un respaldo importado en un dispositivo nuevo salta la bienvenida.

### Licencia
- Código abierto con licencia MIT (`LICENSE`), mencionada en el README y en Ajustes → Acerca de.

## [1.0.2] — 2026-09-28

Nuevo hogar en GitHub Pages (`/SERIE/`), funciones pequeñas para la sesión, orden de la interfaz y material de lanzamiento. Los datos guardados siguen siendo compatibles: los campos nuevos son opcionales.

### Sesión
- **Deshacer** al marcar una serie: regresa la serie, lo que heredaron las siguientes, el ejercicio en foco y el descanso.
- **Discos por lado** en los ejercicios con barra, para la serie que sigue. El peso de la barra se elige en Ajustes → Entrenamiento (20, 15, 10 kg o sin barra; 45, 35, 25 lb).
- **Nota por ejercicio** (“asiento en 4, agarre cerrado”) que aparece cada vez que haces ese ejercicio. Viaja en el respaldo y sobrevive a las actualizaciones del catálogo.

### Modo básico
- Botones “?” con una explicación corta de Volumen, Récords, Sugerencia y Calentamiento.
- La sugerencia de descarga ya no menciona el 1RM estimado.

### Datos de ejemplo
- La progresión de ejemplo avanza a un ritmo realista: varios ejercicios suben de peso en las 10 semanas, así las gráficas del modo básico no salen planas.

### Publicación
- GitHub Pages es el sitio oficial; Cloudflare Pages queda como alternativa documentada.
- `VITE_SITE_URL` se calcula en el workflow con el dominio en minúsculas.
- Capturas nuevas en la página de presentación, en la ventana de instalación y en el README.

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
