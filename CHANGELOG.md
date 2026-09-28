# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones con [SemVer](https://semver.org/lang/es/). La versión actual se ve en **Ajustes**.

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
