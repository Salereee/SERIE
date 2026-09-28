# Datos: modelo, tablas y migraciones

SERIE guarda todo en **IndexedDB**, la base de datos del navegador, usando [Dexie 4](https://dexie.org). No hay servidor: cada navegador tiene su propia copia. Base: `serie`. Definición en [`src/db/db.ts`](../src/db/db.ts); tipos en [`src/db/schema.ts`](../src/db/schema.ts).

## Principios

1. **Los pesos se guardan siempre en kg** con precisión completa. La unidad (kg/lb) solo afecta cómo se muestran; cambiarla no modifica ningún dato.
2. **Cada cambio se escribe al instante.** Durante una sesión, cada serie, ajuste o movimiento del timer es una transacción (`mutate()` en `features/session/actions.ts`). Por eso la sesión sobrevive a cerrar la pestaña.
3. **El timer guarda una hora (`endsAt`)**, no un contador; el tiempo restante se calcula al pintar.
4. **Las sesiones son la fuente de verdad.** La tabla `logs` es derivada y siempre se puede reconstruir desde `sessions`.
5. **Fechas**: todo se ubica en el calendario por la fecha de **inicio** de la sesión (`startedAt`), aunque termine después de medianoche.

## Tablas e índices

Solo se declaran los campos por los que se busca; el resto del objeto se guarda igual.

| Tabla | Contenido | Índices |
|---|---|---|
| `exercises` | Biblioteca: predefinidos (id estable, p. ej. `press-banca-barra`) y propios (`custom-<uuid>`). Los propios con historial se archivan (`archived: true`) en vez de borrarse. | `id`, `name`, `primaryMuscle`, `equipment`, `custom` (0/1, porque IndexedDB no indexa booleanos) |
| `programs` | Splits. Cada programa contiene sus días y cada día su lista ordenada de ejercicios (series, rango de reps, descanso, superset). | `id`, `updatedAt` |
| `sessions` | Entrenamientos, activos (`status: 'activa'`, máximo uno) o terminados, con todas sus series. | `id`, `status`, `startedAt`, `programId` |
| `logs` | Derivada: un resumen por ejercicio por sesión terminada (peso máx., 1RM estimado, volumen, series efectivas). Hace rápidas las gráficas y “la última vez”. | `id` (`sesión:ejercicio`), `exerciseId`, `sessionId`, `date`, `[exerciseId+date]` |
| `settings` | Una fila (`id: 'app'`): modo, unidad, incrementos, tema, programa activo, fecha del último respaldo, etc. | `id` |

## Historial de versiones del esquema

| Versión | Cambio | Migración |
|---|---|---|
| 1 | Modelo inicial: `exercises`, `programs`, `sessions`, `settings`. | — |
| 2 | Nueva tabla `logs`; índice `custom` en ejercicios; índice `programId` en sesiones. | Marca `custom` según `isCustom` y genera `logs` desde las sesiones terminadas. |
| 3 | Los `logs` se fechan con el inicio de la sesión (antes con el fin). | Reconstruye `logs` completos. |

La biblioteca predefinida tiene su propio número, `EXERCISE_SEED_VERSION` (`src/db/seed/exercises.ts`). Al subirlo, `ensureSeed()` inserta o actualiza los ejercicios de fábrica y **nunca** toca los propios.

## Cómo agregar una migración sin romper datos

Ejemplo: queremos guardar la **duración de cada serie** (`durationSec`) y poder buscar sesiones por día del programa.

1. **Cambia los tipos** en `src/db/schema.ts`. Los campos nuevos deben ser **opcionales** (`durationSec?: number`): los datos viejos no los tienen.

2. **Agrega una versión nueva al final de `applySchema()`** en `src/db/db.ts`. Nunca edites una versión ya publicada:

   ```ts
   // v4: índice por día del programa; las series viejas quedan sin duración.
   db.version(4)
     .stores({
       sessions: 'id, status, startedAt, programId, dayId', // se repite la lista completa de índices de la tabla
     })
     .upgrade(async (tx) => {
       // Solo si hay que transformar datos existentes. Aquí no hace falta: el campo es opcional.
       // Ejemplo de transformación:
       // await tx.table('sessions').toCollection().modify((s) => { s.algo ??= valorPorDefecto; });
     });
   ```

   Reglas:
   - En `.stores()` pon **solo las tablas que cambian**, con la **lista completa** de sus índices. Las tablas que no mencionas se conservan.
   - Poner una tabla en `null` la **borra**: antes copia sus datos a otra tabla dentro del `upgrade`.
   - El `upgrade` corre dentro de una transacción: si lanza un error, la base se queda en la versión anterior y no se pierde nada.
   - Usa `tx.table('nombre')`, no `db.nombre`, dentro del `upgrade`.

3. **Actualiza la validación de respaldos** en `src/db/validate.ts` para aceptar el campo nuevo (si no, los respaldos nuevos serían rechazados por “campo no reconocido”). Si el formato del respaldo cambia de forma incompatible, sube `BACKUP_FORMAT_VERSION` en `src/db/backup.ts` y conserva la lectura del formato anterior.

4. **Escribe un test de migración** siguiendo `src/db/db.test.ts`: crea una base con la versión anterior (con `new Dexie(nombre)` y sus `.stores()` de entonces), mete datos, ábrela con `SerieDB` y comprueba que los datos siguen ahí y transformados.

5. **Anota la versión** en la tabla de arriba y en `CHANGELOG.md`.

### Varias pestañas durante una actualización

Si alguien tiene la app abierta en dos pestañas y una de ellas carga una versión nueva del esquema, la otra recibe el evento `versionchange`: cierra su conexión y muestra “SERIE se actualizó en otra pestaña · Recargar” (`src/db/storageErrors.ts`). Así la migración no queda bloqueada.

## Respaldo (formato JSON)

```jsonc
{
  "format": "serie-backup",
  "version": 1,
  "exportedAt": "2026-09-27T18:00:00.000Z",
  "exercises": [/* solo propios y predefinidos archivados */],
  "programs": [/* ... */],
  "sessions": [/* activas y terminadas */],
  "settings": { /* ... */ }
}
```

- `logs` no se exporta: se reconstruye al importar.
- La importación valida **todo** antes de escribir (estructura, tipos, rangos, campos desconocidos, ids repetidos, tamaño máximo 20 MB, versión). Si algo falla, no se escribe nada y el mensaje indica la ruta exacta, p. ej. `sessions[3].exercises[0].sets[2].reps: debe ser un número entero`.
- **Fusionar** agrega lo que no existe (por id) sin modificar lo existente. **Reemplazar** borra sesiones, programas y ejercicios propios y carga los del archivo. En ambos casos se genera antes una copia de lo actual para descargar.
