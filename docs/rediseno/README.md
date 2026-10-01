# Rediseño minimal (1.2.0) · antes y después

Mismos colores, menos ruido. Cada pantalla responde una sola pregunta: **Hoy** → ¿qué entreno?, **Sesión** → ¿cuánto levanté?, **Progreso** → ¿estoy avanzando?

Capturas reales a 390 × 844 con los datos de ejemplo (Ajustes → Datos y respaldo), tomadas con `scripts/capturas.mjs` y convertidas con `scripts/rediseno-docs.mjs`. El detalle de cada cambio está en el [CHANGELOG](../../CHANGELOG.md).

## Lo que cambió en todas las pantallas

| | Antes | Después |
| --- | --- | --- |
| Esquinas | 2 px | 12 px controles · 20 px tarjetas · 24 px hojas |
| Agrupar | Reglas de 1–2 px en tinta | Superficies y aire |
| Etiquetas | MAYÚSCULAS espaciadas | Sentence case, 15–17 px |
| Títulos | 88 px | 34 px |
| Cifras | Mono en todo | Mono solo en cifras vivas |
| Navegación | Hoy · Programas · Progreso · Más | Hoy · Rutinas · Progreso, con ícono; Ajustes en el engrane |

## Hoy

¿Qué entreno? Una sola acción, fija sobre las pestañas; la semana en puntos y tres ejercicios.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-02-hoy.webp" width="200" alt="Hoy, antes, tema oscuro"> | <img src="despues/oscuro-02-hoy.webp" width="200" alt="Hoy, después, tema oscuro"> | <img src="antes/claro-02-hoy.webp" width="200" alt="Hoy, antes, tema claro"> | <img src="despues/claro-02-hoy.webp" width="200" alt="Hoy, después, tema claro"> |

## Sesión recién empezada

La primera serie pasa de ~61 % a ~23 % de la altura de la pantalla.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-03a-sesion.webp" width="200" alt="Sesión recién empezada, antes, tema oscuro"> | <img src="despues/oscuro-03a-sesion.webp" width="200" alt="Sesión recién empezada, después, tema oscuro"> | <img src="antes/claro-03a-sesion.webp" width="200" alt="Sesión recién empezada, antes, tema claro"> | <img src="despues/claro-03a-sesion.webp" width="200" alt="Sesión recién empezada, después, tema claro"> |

## Sesión a media

Series hechas en una línea; la activa en tarjeta con la vez pasada y la sugerencia en píldora; descanso compacto.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-03-sesion.webp" width="200" alt="Sesión a media, antes, tema oscuro"> | <img src="despues/oscuro-03-sesion.webp" width="200" alt="Sesión a media, después, tema oscuro"> | <img src="antes/claro-03-sesion.webp" width="200" alt="Sesión a media, antes, tema claro"> | <img src="despues/claro-03-sesion.webp" width="200" alt="Sesión a media, después, tema claro"> |

## Resumen de sesión

Las notas de la sesión se escriben aquí.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-04-resumen.webp" width="200" alt="Resumen de sesión, antes, tema oscuro"> | <img src="despues/oscuro-04-resumen.webp" width="200" alt="Resumen de sesión, después, tema oscuro"> | <img src="antes/claro-04-resumen.webp" width="200" alt="Resumen de sesión, antes, tema claro"> | <img src="despues/claro-04-resumen.webp" width="200" alt="Resumen de sesión, después, tema claro"> |

## Programas

Rutinas agrupa Programas | Ejercicios; cada programa es una tarjeta.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-10-programas.webp" width="200" alt="Programas, antes, tema oscuro"> | <img src="despues/oscuro-10-programas.webp" width="200" alt="Programas, después, tema oscuro"> | <img src="antes/claro-10-programas.webp" width="200" alt="Programas, antes, tema claro"> | <img src="despues/claro-10-programas.webp" width="200" alt="Programas, después, tema claro"> |

## Programa

Compartir, Duplicar y Borrar en “···”; días en tarjetas.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-09-programa.webp" width="200" alt="Programa, antes, tema oscuro"> | <img src="despues/oscuro-09-programa.webp" width="200" alt="Programa, después, tema oscuro"> | <img src="antes/claro-09-programa.webp" width="200" alt="Programa, antes, tema claro"> | <img src="despues/claro-09-programa.webp" width="200" alt="Programa, después, tema claro"> |

## Ejercicios (Biblioteca)

Filtros de equipo como chips; sin “Abrir todo”.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-08-biblioteca.webp" width="200" alt="Ejercicios (Biblioteca), antes, tema oscuro"> | <img src="despues/oscuro-08-biblioteca.webp" width="200" alt="Ejercicios (Biblioteca), después, tema oscuro"> | <img src="antes/claro-08-biblioteca.webp" width="200" alt="Ejercicios (Biblioteca), antes, tema claro"> | <img src="despues/claro-08-biblioteca.webp" width="200" alt="Ejercicios (Biblioteca), después, tema claro"> |

## Progreso

Cifra héroe, dos tarjetas y 12 barras en lugar del mapa de calor.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-05-progreso.webp" width="200" alt="Progreso, antes, tema oscuro"> | <img src="despues/oscuro-05-progreso.webp" width="200" alt="Progreso, después, tema oscuro"> | <img src="antes/claro-05-progreso.webp" width="200" alt="Progreso, antes, tema claro"> | <img src="despues/claro-05-progreso.webp" width="200" alt="Progreso, después, tema claro"> |

## Progreso por ejercicio

Una cifra principal, dos pequeñas y una sola gráfica.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-06-ejercicio.webp" width="200" alt="Progreso por ejercicio, antes, tema oscuro"> | <img src="despues/oscuro-06-ejercicio.webp" width="200" alt="Progreso por ejercicio, después, tema oscuro"> | <img src="antes/claro-06-ejercicio.webp" width="200" alt="Progreso por ejercicio, antes, tema claro"> | <img src="despues/claro-06-ejercicio.webp" width="200" alt="Progreso por ejercicio, después, tema claro"> |

## Historial

Tarjetas por sesión; PR como texto de acento.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-07-historial.webp" width="200" alt="Historial, antes, tema oscuro"> | <img src="despues/oscuro-07-historial.webp" width="200" alt="Historial, después, tema oscuro"> | <img src="antes/claro-07-historial.webp" width="200" alt="Historial, antes, tema claro"> | <img src="despues/claro-07-historial.webp" width="200" alt="Historial, después, tema claro"> |

## Ajustes

Grupos en tarjetas; se abre con el engrane de Hoy.

| Antes · oscuro | Después · oscuro | Antes · claro | Después · claro |
| --- | --- | --- | --- |
| <img src="antes/oscuro-11-ajustes.webp" width="200" alt="Ajustes, antes, tema oscuro"> | <img src="despues/oscuro-11-ajustes.webp" width="200" alt="Ajustes, después, tema oscuro"> | <img src="antes/claro-11-ajustes.webp" width="200" alt="Ajustes, antes, tema claro"> | <img src="despues/claro-11-ajustes.webp" width="200" alt="Ajustes, después, tema claro"> |
