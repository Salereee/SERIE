// Compartir una rutina entre dispositivos sin servidor: la rutina viaja comprimida dentro del enlace,
// en el fragmento (#…). El navegador nunca envía el fragmento al servidor, así que la rutina no pasa
// por GitHub ni por nadie más: va de un dispositivo a otro dentro del propio enlace.
import type { Exercise, Program, ProgramItem } from '../db/schema';
import { validateExercise, validateProgram } from '../db/validate';
import { uid } from './ids';

/** Versión del formato. Si cambia, los enlaces viejos se rechazan con un mensaje claro. */
const FORMAT = 1;
/** Límite del texto del enlace: una rutina real ocupa ~1–3 KB; esto frena enlaces manipulados. */
export const MAX_SHARE_CHARS = 16_000;

/** Ejercicio de la rutina en forma compacta: [id, series, repMin, repMax, descansoSeg, grupoSuperset]. */
type PackedItem = [string, number, number, number, number, number?];
interface Packed {
  v: number;
  n: string;
  d: { n: string; i: PackedItem[] }[];
  /** Ejercicios propios que usa la rutina (el otro dispositivo no los tiene). */
  x?: Omit<Exercise, 'custom' | 'archived' | 'note'>[];
}

export class ShareError extends Error {}

// ——— base64url sobre bytes ———
function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new ShareError('El enlace tiene caracteres que no son de una rutina de SERIE.');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** Convierte una rutina (y sus ejercicios propios) en el texto que va después de `#r=`. */
export async function encodeProgram(program: Program, exercises: Map<string, Exercise>): Promise<string> {
  const groups = new Map<string, number>();
  const pack = (it: ProgramItem): PackedItem => {
    const base: PackedItem = [it.exerciseId, it.targetSets, it.repMin, it.repMax, it.restSec];
    if (it.supersetGroup) {
      if (!groups.has(it.supersetGroup)) groups.set(it.supersetGroup, groups.size + 1);
      base.push(groups.get(it.supersetGroup)!);
    }
    return base;
  };
  const customIds = new Set(program.days.flatMap((d) => d.items.map((i) => i.exerciseId)).filter((id) => exercises.get(id)?.isCustom));
  const packed: Packed = {
    v: FORMAT,
    n: program.name,
    d: program.days.map((d) => ({ n: d.name, i: d.items.map(pack) })),
  };
  if (customIds.size) {
    packed.x = [...customIds].map((id) => {
      const { custom: _c, archived: _a, note: _n, ...e } = exercises.get(id)!;
      return e;
    });
  }
  const json = new TextEncoder().encode(JSON.stringify(packed));
  return toB64url(await pipe(json, new CompressionStream('deflate-raw')));
}

export interface SharedRoutine {
  program: Program;
  /** Ejercicios propios que hay que crear (ya con el id que usará este dispositivo). */
  newExercises: Exercise[];
}

/**
 * Lee el texto del enlace y arma una rutina nueva para este dispositivo, validada igual que un respaldo.
 * - Ids nuevos para la rutina, sus días y ejercicios: nunca pisa nada existente.
 * - Un ejercicio propio que ya existe con el mismo id y nombre se reutiliza; si el id choca con otro, se crea uno nuevo.
 * - Un ejercicio predefinido que este dispositivo no conoce hace que el enlace se rechace.
 */
export async function decodeProgram(text: string, local: Map<string, Exercise>): Promise<SharedRoutine> {
  if (!text) throw new ShareError('El enlace no trae ninguna rutina.');
  if (text.length > MAX_SHARE_CHARS) throw new ShareError('El enlace es demasiado largo para ser una rutina.');
  let packed: Packed;
  try {
    const raw = await pipe(fromB64url(text), new DecompressionStream('deflate-raw'));
    packed = JSON.parse(new TextDecoder().decode(raw));
  } catch (e) {
    if (e instanceof ShareError) throw e;
    throw new ShareError('El enlace está incompleto o dañado. Pide que te lo vuelvan a enviar completo.');
  }
  if (!packed || typeof packed !== 'object' || packed.v !== FORMAT) {
    throw new ShareError('Este enlace es de otra versión de SERIE. Actualiza la app e inténtalo de nuevo.');
  }

  // Ejercicios propios: se validan y, si hace falta, se les asigna un id nuevo.
  const remap = new Map<string, string>();
  const newExercises: Exercise[] = [];
  const rawEx = Array.isArray(packed.x) ? packed.x.slice(0, 100) : [];
  rawEx.forEach((x, i) => {
    const e = validateExercise({ ...x, isCustom: true, custom: 1 }, `rutina.ejercicios[${i}]`);
    const existing = local.get(e.id);
    if (existing && existing.name === e.name) return;
    const id = existing ? `custom-${uid()}` : e.id;
    remap.set(e.id, id);
    newExercises.push({ ...e, id });
  });
  const shared = new Set(rawEx.map((x) => x.id));

  const now = Date.now();
  const program = validateProgram(
    {
      id: uid(),
      name: String(packed.n ?? '').slice(0, 120),
      createdAt: now,
      updatedAt: now,
      days: (Array.isArray(packed.d) ? packed.d : []).map((d) => ({
        id: uid(),
        name: String(d?.n ?? ''),
        items: (Array.isArray(d?.i) ? d.i : []).map((it) => {
          if (!Array.isArray(it)) throw new ShareError('El enlace está incompleto o dañado.');
          const [e, targetSets, repMin, repMax, restSec, g] = it;
          const exerciseId = remap.get(e) ?? e;
          if (!local.has(exerciseId) && !shared.has(e)) {
            throw new ShareError('La rutina usa un ejercicio que esta versión de SERIE no conoce. Actualiza la app e inténtalo de nuevo.');
          }
          return { id: uid(), exerciseId, targetSets, repMin, repMax, restSec, ...(g ? { supersetGroup: `g${g}` } : {}) };
        }),
      })),
    },
    'rutina',
  );
  if (program.days.length === 0) throw new ShareError('La rutina del enlace no tiene días.');
  return { program, newExercises };
}

/** Enlace completo para abrir en otro dispositivo. */
export const shareUrl = (code: string, origin = location.origin, base = import.meta.env.BASE_URL) => `${origin}${base}importar#r=${code}`;
