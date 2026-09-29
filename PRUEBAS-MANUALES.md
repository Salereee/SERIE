# Pruebas manuales

Lo que no se puede verificar desde la computadora de desarrollo: dispositivos reales, iOS, instalación y uso sin señal. Hazlas en el **sitio publicado** (o en `npm run build && npm run preview` abierto desde el celular por la IP de tu red), no en `npm run dev`: en modo desarrollo no hay service worker.

Marca cada casilla al terminar. Si algo no coincide con el resultado esperado, anota el dispositivo, el sistema y el navegador.

## A. iPhone (Safari)

- [ ] **A1. Guía de instalación.** Abre el sitio en Safari (sin instalar), responde el cuestionario y espera unos segundos en Hoy.
  **Esperado:** aparece una sola vez la hoja “Agrega SERIE a tu pantalla de inicio” con 3 pasos. Al cerrarla y recargar, no vuelve a salir. En Ajustes → Instalar la app → “Cómo instalar en iPhone” se ven los mismos pasos.
- [ ] **A2. Instalar.** Compartir → Agregar a inicio → Agregar.
  **Esperado:** ícono negro con la barra naranja y el nombre “SERIE”. Al abrirlo: pantalla completa, sin barra de Safari. Ajustes dice “Ya la estás usando instalada”.
- [ ] **A3. Datos al instalar.** Antes de instalar, registra una sesión corta en Safari. Luego abre la app instalada.
  **Esperado:** en iOS 17 o más reciente la app instalada **no** comparte datos con Safari (es otro almacenamiento). Esto es normal: usa Exportar en Safari e Importar en la app instalada si quieres pasarlos. Anota tu versión de iOS.
- [ ] **A4. Fin del descanso sin vibración.** Empieza una sesión, registra una serie y deja correr el descanso (usa −15 para acortarlo).
  **Esperado:** en los últimos 3 s las cifras cambian a naranja y suenan tics. Al llegar a cero, suenan dos pulsos, la pantalla destella en naranja y la barra se vuelve naranja con “Descanso terminado”. No vibra (iOS no lo permite).
- [ ] **A5. Silencio.** Repite A4 con el interruptor de silencio activado.
  **Esperado:** no suena nada, pero el destello y la barra naranja se ven claramente.
- [ ] **A6. Pantalla bloqueada.** Registra una serie, bloquea el teléfono 1 minuto y desbloquea.
  **Esperado:** el timer muestra el tiempo correcto (no se “detuvo”), la sesión sigue igual.
- [ ] **A7. Pantalla encendida.** Durante una sesión, deja el teléfono sin tocar más tiempo del que normalmente tarda en apagarse.
  **Esperado:** la pantalla no se apaga mientras la sesión está abierta (Wake Lock, iOS 16.4+).
- [ ] **A8. Teclado.** Toca un campo de peso y uno de reps.
  **Esperado:** en peso sale teclado numérico con punto decimal; en reps, numérico sin decimales. La pantalla no hace zoom al tocar un campo.

## B. Android (Chrome)

- [ ] **B1. Instalar.** Ajustes → Instalar la app → “Instalar SERIE” (o el aviso de Chrome).
  **Esperado:** diálogo nativo de instalación; el ícono aparece en el cajón de apps con fondo negro completo (ícono “maskable”, sin recortes raros).
- [ ] **B2. Vibración.** Registra una serie y deja terminar el descanso.
  **Esperado:** vibración corta al registrar; al terminar, dos vibraciones, sonido, destello y barra naranja.
- [ ] **B3. Vibración desactivada.** Ajustes → Vibración apagada; repite B2.
  **Esperado:** no vibra; el resto igual.

## C. Sin conexión (cualquier teléfono, con la app instalada)

- [ ] **C1.** Abre la app con internet una vez y navega por Hoy, Progreso e Historial. Luego activa **modo avión** y cierra la app por completo.
- [ ] **C2.** Abre la app en modo avión.
  **Esperado:** carga normal, con fuentes y estilos correctos.
- [ ] **C3.** En modo avión: empieza una sesión, registra 3 series, termina y revisa el resumen, Historial y Progreso.
  **Esperado:** todo funciona y se guarda. Nada pide conexión.
- [ ] **C4.** Recarga estando en `/progreso` en modo avión.
  **Esperado:** carga la pantalla (no “sin conexión” del navegador).

## D. Actualizaciones

- [ ] **D1.** Con la app abierta (sin sesión activa), publica una versión nueva (cualquier cambio + deploy). Espera o recarga una vez.
  **Esperado:** arriba aparece “Hay una versión nueva de SERIE · Después / Actualizar”. La app **no** recarga sola. “Actualizar” recarga con la versión nueva y los datos intactos.
- [ ] **D2.** Repite con una **sesión activa** abierta.
  **Esperado:** el aviso **no** aparece durante la sesión; aparece al terminarla o descartarla.

## E. Datos y respaldo

- [ ] **E1. Exportar en el celular.** Ajustes → Exportar JSON.
  **Esperado:** se descarga `serie-respaldo-AAAA-MM-DD-HHMM.json` (en iPhone, se ofrece guardar en Archivos). “Último respaldo” muestra la fecha de hoy.
- [ ] **E2. Importar y fusionar.** En otro dispositivo o navegador, importa ese archivo → Fusionar.
  **Esperado:** resumen con cuántas sesiones se agregaron y botón “Descargar copia previa”. Lo que ya había sigue ahí.
- [ ] **E3. Archivo dañado.** Edita el JSON (por ejemplo, cambia un peso a `"abc"`) e intenta importarlo.
  **Esperado:** mensaje “No se importó nada…” con la ruta del error. Tus datos no cambian.
- [ ] **E4. Recordatorio.** Carga datos de ejemplo (10 semanas) y quítalos; registra 10 sesiones reales (o espera 14 días) sin exportar.
  **Esperado:** aviso discreto “Respaldo pendiente” en Hoy y Ajustes, nunca durante una sesión. “Más tarde” lo oculta 3 días.
- [ ] **E5. Incógnito.** Abre el sitio en una ventana privada de Firefox o Safari.
  **Esperado:** o funciona normalmente (y se borra al cerrar), o muestra una pantalla clara “Este navegador no permite guardar datos…”. Nunca una pantalla en blanco.

## F. Dos pestañas (escritorio)

- [ ] **F1.** Empieza una sesión en una pestaña. Abre el sitio en otra pestaña y ve a la sesión.
  **Esperado:** la segunda muestra “Solo lectura…” con controles deshabilitados.
- [ ] **F2.** En la segunda, toca “Editar aquí”.
  **Esperado:** ahora esa edita y la primera pasa a solo lectura.
- [ ] **F3.** Cierra la pestaña que edita.
  **Esperado:** la otra retoma la edición sola en menos de un segundo.

## G. Accesibilidad

- [ ] **G1. Teclado (escritorio).** Recorre Hoy, una sesión y Ajustes solo con Tab, Shift+Tab, Enter, Espacio y Esc.
  **Esperado:** siempre se ve dónde está el foco (contorno de tinta); las hojas atrapan el foco y se cierran con Esc; el primer Tab ofrece “Saltar al contenido”.
- [ ] **G2. Lector de pantalla** (VoiceOver en iPhone o TalkBack en Android). Registra una serie y deja terminar el descanso.
  **Esperado:** anuncia “Descanso de 2:30” al empezar y “Descanso terminado” al acabar, sin leer cada segundo. Un récord se anuncia una vez.
- [ ] **G3. Reducir movimiento.** Activa “Reducir movimiento” en el sistema y usa la app.
  **Esperado:** sin deslizamientos ni barridos; solo fundidos breves. El destello del descanso es un solo tinte que se desvanece, sin parpadeo.

## H. Publicación

- [ ] **H1. Cabeceras.** En el sitio publicado, abre DevTools → Network → documento → Response Headers.
  **Esperado:** `content-security-policy`, `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy`. En Console no hay errores de CSP.
- [ ] **H2. Rutas.** Abre directamente `https://<tu-sitio>/progreso` y recarga.
  **Esperado:** carga la pantalla de Progreso (no un 404).
- [ ] **H3. Compartir.** Pega el enlace en WhatsApp (con `VITE_SITE_URL` configurada).
  **Esperado:** vista previa con la imagen negra “Cada serie, anotada.”
- [ ] **H4. Buscadores.** Con `ALLOW_INDEXING=true` y `VITE_SITE_URL`, abre `https://<tu-sitio>/robots.txt` y `https://<tu-sitio>/sitemap.xml`.
  **Esperado:** `robots.txt` termina en `Sitemap: https://<tu-sitio>/sitemap.xml`; el sitemap lista `/` y `/inicio/` con la fecha del deploy. Sin esas variables: `Disallow: /` y `sitemap.xml` no existe (Pages devuelve la app).
- [ ] **H5. Instalación enriquecida (Android/Chrome o Chrome de escritorio).** Abre el sitio sin instalar y usa “Instalar”.
  **Esperado:** el diálogo muestra las capturas (verticales en celular, horizontales en escritorio). Con la app instalada, mantener presionado el ícono ofrece “Ver progreso” e “Historial”, y cada uno abre esa pantalla.

## I. Página de presentación (`/inicio/`)

- [ ] **I1. Rutas.** Abre `https://<tu-sitio>/inicio/` y `https://<tu-sitio>/inicio` (sin barra).
  **Esperado:** ambas muestran la página de presentación (“Cada serie, anotada.”, botones ES/EN), no la app. Recarga: sigue igual.
- [ ] **I2. CSP y fuentes.** En DevTools → Console y Network, recarga `/inicio/`.
  **Esperado:** ningún error de CSP; las fuentes salen de `/inicio/fonts/` (nada de `fonts.googleapis.com` ni `fonts.gstatic.com`); ninguna respuesta 404.
- [ ] **I3. Idioma.** Toca **EN** y luego **ES**; recarga.
  **Esperado:** cambian textos, título de la pestaña y textos alternativos de las imágenes; al recargar se conserva el último idioma elegido.
- [ ] **I4. Tema.** Cambia el sistema entre claro y oscuro.
  **Esperado:** las capturas cambian a su versión clara u oscura; los textos se leen bien en ambos.
- [ ] **I5. Abrir la app.** Toca “Abrir SERIE” (arriba, en el hero y al final).
  **Esperado:** abre la app en `/` del mismo sitio (con tus datos, si ya la usabas en ese navegador).
- [ ] **I6. Con la app instalada.** En un teléfono con SERIE instalada, abre `https://<tu-sitio>/inicio/` en el navegador.
  **Esperado:** se ve la página de presentación, no la app. Sin conexión no carga (no se guarda para uso offline); es lo esperado.
- [ ] **I7. Enlace desde la app.** Ajustes → Acerca de → “página de presentación”.
  **Esperado:** abre `/inicio/`.
- [ ] **I8. Compartir.** Pega `https://<tu-sitio>/inicio/` en WhatsApp.
  **Esperado:** puede salir sin imagen mientras `og:image` de `public/inicio/index.html` sea relativa (`/og.png`); con URL absoluta, sale la imagen negra “Cada serie, anotada.”

## J. Novedades 1.0.2

- [ ] **J1. Deshacer.** En una sesión, toca ✓ en una serie y luego “Deshacer” en el aviso.
  **Esperado:** la serie vuelve a pendiente, el descanso desaparece (o vuelve al anterior) y el acordeón regresa al mismo ejercicio.
- [ ] **J2. Discos por lado.** En un ejercicio con barra, escribe 102.5 kg en la serie que sigue.
  **Esperado:** “Discos por lado” muestra 25 · 15 · 1.25. Con la unidad en lb y 225 lb: 45 · 45.
- [ ] **J3. Barra.** Ajustes → Entrenamiento → Peso de la barra → 15 kg.
  **Esperado:** los discos se recalculan; con “Sin barra” se reparte todo el peso.
- [ ] **J4. Nota del ejercicio.** En la sesión, toca “Nota”, escribe algo y guarda. Termina la sesión y empieza otra con ese ejercicio.
  **Esperado:** la nota aparece arriba del ejercicio; también en la ficha de la Biblioteca. Exporta e importa un respaldo: la nota sigue ahí.
- [ ] **J5. Ayudas del modo básico.** En modo básico toca los “?” (Sugerencia, Volumen, Récords, Calentamiento).
  **Esperado:** una hoja con la explicación. En modo avanzado los “?” no aparecen.

## K. Entre dispositivos (1.1.0)

- [ ] **K1. Rutina al computador.** En el celular: Programas → una rutina → Compartir → Enviar enlace (a ti mismo por WhatsApp o correo). Ábrelo en la computadora.
  **Esperado:** la computadora muestra la rutina completa; “Guardar rutina” la agrega y, si nunca habías usado SERIE ahí, Hoy ya sugiere su primer día.
- [ ] **K2. QR a otro celular.** Escanea el QR de Compartir con la cámara de otro teléfono.
  **Esperado:** abre SERIE con la misma vista previa.
- [ ] **K3. Enlace cortado.** Borra la mitad del enlace y ábrelo.
  **Esperado:** “El enlace está incompleto o dañado”; no se guarda nada.
- [ ] **K4. Todo con historial.** Ajustes → Datos y respaldo → Enviar respaldo. En el otro dispositivo, bienvenida → “Importar tu respaldo” → Importar JSON → Reemplazar.
  **Esperado:** aparecen sesiones, programas y récords; al volver a Hoy no pide la bienvenida.
