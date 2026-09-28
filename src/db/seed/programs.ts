import type { EquipmentProfile, Experience, Goal, Program, ProgramDay, ProgramItem } from '../schema';
import { uid } from '../../domain/ids';

/**
 * Plantillas de split. Cada día se define por patrones de movimiento; el ejercicio concreto
 * depende del equipo disponible. Así una misma plantilla sirve para gimnasio, casa o sin equipo.
 */

type Pattern =
  | 'empuje_h'
  | 'empuje_h2'
  | 'apertura'
  | 'empuje_v'
  | 'lateral'
  | 'frontal'
  | 'posterior'
  | 'jalon_v'
  | 'remo'
  | 'remo2'
  | 'trapecio'
  | 'sentadilla'
  | 'sentadilla2'
  | 'ext_cuad'
  | 'bisagra'
  | 'peso_muerto'
  | 'curl_femoral'
  | 'gluteo'
  | 'pantorrilla'
  | 'biceps'
  | 'biceps2'
  | 'triceps'
  | 'triceps2'
  | 'triceps_comp'
  | 'antebrazo'
  | 'abdomen'
  | 'abdomen2';

const BY_EQUIPMENT: Record<Pattern, Record<EquipmentProfile, string | null>> = {
  empuje_h: { gimnasio: 'press-banca-barra', mancuernas: 'press-banca-mancuerna', corporal: 'lagartijas' },
  empuje_h2: { gimnasio: 'press-inclinado-mancuerna', mancuernas: 'press-inclinado-mancuerna', corporal: 'lagartijas-declinadas' },
  apertura: { gimnasio: 'cruces-polea', mancuernas: 'aperturas-mancuerna', corporal: 'fondos-paralelas' },
  empuje_v: { gimnasio: 'press-militar', mancuernas: 'press-hombro-mancuerna', corporal: 'lagartijas-pike' },
  lateral: { gimnasio: 'elevaciones-laterales', mancuernas: 'elevaciones-laterales', corporal: null },
  frontal: { gimnasio: 'elevaciones-frontales', mancuernas: 'elevaciones-frontales', corporal: null },
  posterior: { gimnasio: 'face-pull', mancuernas: 'pajaros', corporal: 'remo-invertido' },
  jalon_v: { gimnasio: 'jalon-pecho', mancuernas: 'pullover-mancuerna', corporal: 'dominadas' },
  remo: { gimnasio: 'remo-barra', mancuernas: 'remo-mancuerna', corporal: 'remo-invertido' },
  remo2: { gimnasio: 'remo-polea-baja', mancuernas: 'remo-inclinado-mancuerna', corporal: 'dominadas-supinas' },
  trapecio: { gimnasio: 'encogimientos-barra', mancuernas: 'encogimientos-mancuerna', corporal: null },
  sentadilla: { gimnasio: 'sentadilla', mancuernas: 'sentadilla-goblet', corporal: 'sentadilla-libre' },
  sentadilla2: { gimnasio: 'prensa', mancuernas: 'sentadilla-bulgara', corporal: 'desplantes-caminando' },
  ext_cuad: { gimnasio: 'extension-cuadriceps', mancuernas: 'subidas-cajon', corporal: 'sentadilla-bulgara' },
  bisagra: { gimnasio: 'peso-muerto-rumano', mancuernas: 'peso-muerto-rumano-mancuerna', corporal: 'peso-muerto-una-pierna' },
  peso_muerto: { gimnasio: 'peso-muerto', mancuernas: 'peso-muerto-rumano-mancuerna', corporal: 'peso-muerto-una-pierna' },
  curl_femoral: { gimnasio: 'curl-femoral-acostado', mancuernas: null, corporal: 'curl-nordico' },
  gluteo: { gimnasio: 'hip-thrust', mancuernas: 'puente-gluteo', corporal: 'puente-gluteo' },
  pantorrilla: { gimnasio: 'elevacion-talones-pie', mancuernas: 'elevacion-talones-mancuerna', corporal: 'elevacion-talones-una-pierna' },
  biceps: { gimnasio: 'curl-barra', mancuernas: 'curl-mancuerna', corporal: 'dominadas-supinas' },
  biceps2: { gimnasio: 'curl-martillo', mancuernas: 'curl-martillo', corporal: null },
  triceps: { gimnasio: 'extension-triceps-cuerda', mancuernas: 'extension-copa', corporal: 'fondos-banco' },
  triceps2: { gimnasio: 'press-frances', mancuernas: 'patada-triceps', corporal: 'lagartijas-diamante' },
  triceps_comp: { gimnasio: 'press-cerrado', mancuernas: 'extension-copa', corporal: 'lagartijas-diamante' },
  antebrazo: { gimnasio: 'curl-muneca', mancuernas: null, corporal: null },
  abdomen: { gimnasio: 'crunch-polea', mancuernas: 'crunch', corporal: 'crunch' },
  abdomen2: { gimnasio: 'elevacion-piernas-colgado', mancuernas: 'elevacion-piernas-acostado', corporal: 'elevacion-piernas-acostado' },
};

/** main = básico pesado, sec = compuesto accesorio, iso = aislamiento, power/hyp = días fijos de PHUL. */
type Role = 'main' | 'sec' | 'iso' | 'power' | 'hyp';
type Slot = [Pattern, sets: number, Role];
type DayDef = { name: string; slots: Slot[] };

export type TemplateKey = 'fullbody' | 'upper-lower' | 'ppl' | 'phul' | 'arnold' | 'bro';

export interface Template {
  key: TemplateKey;
  name: string;
  short: string;
  /** Días por semana en que tiene sentido. */
  daysRange: [number, number];
  idealDays: number;
  summary: string;
  days: DayDef[];
}

export const TEMPLATES: Template[] = [
  {
    key: 'fullbody',
    name: 'Full Body',
    short: 'FB',
    daysRange: [2, 4],
    idealDays: 3,
    summary: 'Todo el cuerpo en cada sesión, rotando tres días A/B/C.',
    days: [
      { name: 'Full Body A', slots: [['sentadilla', 3, 'main'], ['empuje_h', 3, 'main'], ['remo', 3, 'sec'], ['lateral', 2, 'iso'], ['biceps', 2, 'iso'], ['abdomen', 2, 'iso']] },
      { name: 'Full Body B', slots: [['peso_muerto', 3, 'main'], ['empuje_v', 3, 'main'], ['jalon_v', 3, 'sec'], ['sentadilla2', 2, 'sec'], ['triceps', 2, 'iso'], ['pantorrilla', 2, 'iso']] },
      { name: 'Full Body C', slots: [['empuje_h2', 3, 'main'], ['gluteo', 3, 'sec'], ['remo2', 3, 'sec'], ['curl_femoral', 2, 'iso'], ['posterior', 2, 'iso'], ['abdomen2', 2, 'iso']] },
    ],
  },
  {
    key: 'upper-lower',
    name: 'Torso / Pierna',
    short: 'U/L',
    daysRange: [3, 5],
    idealDays: 4,
    summary: 'Upper/Lower: alterna torso y pierna; cada músculo se trabaja dos veces por semana.',
    days: [
      { name: 'Torso A', slots: [['empuje_h', 4, 'main'], ['remo', 4, 'main'], ['empuje_v', 3, 'sec'], ['jalon_v', 3, 'sec'], ['biceps', 2, 'iso'], ['triceps', 2, 'iso']] },
      { name: 'Pierna A', slots: [['sentadilla', 4, 'main'], ['bisagra', 3, 'sec'], ['sentadilla2', 3, 'sec'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 3, 'iso'], ['abdomen', 2, 'iso']] },
      { name: 'Torso B', slots: [['empuje_h2', 4, 'main'], ['jalon_v', 4, 'main'], ['remo2', 3, 'sec'], ['lateral', 3, 'iso'], ['triceps2', 2, 'iso'], ['biceps2', 2, 'iso']] },
      { name: 'Pierna B', slots: [['peso_muerto', 3, 'main'], ['gluteo', 3, 'sec'], ['ext_cuad', 3, 'iso'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 3, 'iso'], ['abdomen2', 2, 'iso']] },
    ],
  },
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    short: 'PPL',
    daysRange: [3, 6],
    idealDays: 6,
    summary: 'Empuje, tirón y pierna. Seis días recorre A y B; con menos días, rota en orden.',
    days: [
      { name: 'Empuje A', slots: [['empuje_h', 4, 'main'], ['empuje_v', 3, 'sec'], ['empuje_h2', 3, 'sec'], ['lateral', 3, 'iso'], ['triceps', 3, 'iso']] },
      { name: 'Tirón A', slots: [['remo', 4, 'main'], ['jalon_v', 3, 'sec'], ['remo2', 3, 'sec'], ['posterior', 3, 'iso'], ['biceps', 3, 'iso'], ['trapecio', 2, 'iso']] },
      { name: 'Pierna A', slots: [['sentadilla', 4, 'main'], ['bisagra', 3, 'sec'], ['sentadilla2', 3, 'sec'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 3, 'iso']] },
      { name: 'Empuje B', slots: [['empuje_v', 4, 'main'], ['empuje_h2', 3, 'sec'], ['apertura', 3, 'iso'], ['lateral', 3, 'iso'], ['triceps2', 3, 'iso']] },
      { name: 'Tirón B', slots: [['jalon_v', 4, 'main'], ['remo', 3, 'sec'], ['posterior', 3, 'iso'], ['biceps2', 3, 'iso'], ['biceps', 2, 'iso']] },
      { name: 'Pierna B', slots: [['peso_muerto', 3, 'main'], ['gluteo', 3, 'sec'], ['ext_cuad', 3, 'iso'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 3, 'iso'], ['abdomen', 3, 'iso']] },
    ],
  },
  {
    key: 'phul',
    name: 'PHUL',
    short: 'PHUL',
    daysRange: [4, 5],
    idealDays: 4,
    summary: 'Power Hypertrophy Upper Lower: dos días pesados de fuerza y dos de volumen.',
    days: [
      { name: 'Torso fuerza', slots: [['empuje_h', 4, 'power'], ['remo', 4, 'power'], ['empuje_v', 3, 'hyp'], ['jalon_v', 3, 'hyp'], ['biceps', 2, 'iso'], ['triceps', 2, 'iso']] },
      { name: 'Pierna fuerza', slots: [['sentadilla', 4, 'power'], ['peso_muerto', 3, 'power'], ['sentadilla2', 3, 'hyp'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 3, 'iso']] },
      { name: 'Torso hipertrofia', slots: [['empuje_h2', 4, 'hyp'], ['apertura', 3, 'iso'], ['remo2', 4, 'hyp'], ['lateral', 3, 'iso'], ['biceps2', 3, 'iso'], ['triceps2', 3, 'iso']] },
      { name: 'Pierna hipertrofia', slots: [['sentadilla2', 4, 'hyp'], ['bisagra', 3, 'hyp'], ['ext_cuad', 3, 'iso'], ['curl_femoral', 3, 'iso'], ['gluteo', 3, 'hyp'], ['pantorrilla', 3, 'iso']] },
    ],
  },
  {
    key: 'arnold',
    name: 'Arnold Split',
    short: 'ARN',
    daysRange: [3, 6],
    idealDays: 6,
    summary: 'Pecho y espalda, hombro y brazos, pierna. Se repite dos veces por semana.',
    days: [
      { name: 'Pecho y espalda', slots: [['empuje_h', 4, 'main'], ['jalon_v', 4, 'main'], ['empuje_h2', 3, 'sec'], ['remo', 3, 'sec'], ['apertura', 3, 'iso'], ['remo2', 3, 'sec']] },
      { name: 'Hombro y brazos', slots: [['empuje_v', 4, 'main'], ['lateral', 3, 'iso'], ['posterior', 3, 'iso'], ['biceps', 3, 'iso'], ['triceps', 3, 'iso'], ['biceps2', 2, 'iso'], ['triceps2', 2, 'iso']] },
      { name: 'Pierna', slots: [['sentadilla', 4, 'main'], ['bisagra', 3, 'sec'], ['sentadilla2', 3, 'sec'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 4, 'iso'], ['abdomen', 3, 'iso']] },
    ],
  },
  {
    key: 'bro',
    name: 'Bro Split',
    short: 'BRO',
    daysRange: [5, 6],
    idealDays: 5,
    summary: 'Un grupo muscular por día. Mucho volumen por sesión, cada músculo una vez por semana.',
    days: [
      { name: 'Pecho', slots: [['empuje_h', 4, 'main'], ['empuje_h2', 3, 'sec'], ['apertura', 3, 'iso'], ['abdomen', 3, 'iso']] },
      { name: 'Espalda', slots: [['jalon_v', 4, 'main'], ['remo', 4, 'main'], ['remo2', 3, 'sec'], ['trapecio', 3, 'iso']] },
      { name: 'Hombro', slots: [['empuje_v', 4, 'main'], ['lateral', 4, 'iso'], ['posterior', 3, 'iso'], ['frontal', 2, 'iso'], ['abdomen2', 3, 'iso']] },
      { name: 'Pierna', slots: [['sentadilla', 4, 'main'], ['sentadilla2', 3, 'sec'], ['bisagra', 3, 'sec'], ['ext_cuad', 3, 'iso'], ['curl_femoral', 3, 'iso'], ['pantorrilla', 4, 'iso']] },
      { name: 'Brazo', slots: [['triceps_comp', 3, 'sec'], ['biceps', 3, 'iso'], ['triceps', 3, 'iso'], ['biceps2', 3, 'iso'], ['triceps2', 3, 'iso'], ['antebrazo', 2, 'iso']] },
    ],
  },
];

export const TEMPLATE_BY_KEY = Object.fromEntries(TEMPLATES.map((t) => [t.key, t])) as Record<TemplateKey, Template>;

type Scheme = { repMin: number; repMax: number; restSec: number };

function scheme(role: Role, goal: Goal, equipment: EquipmentProfile): Scheme {
  if (role === 'power') return equipment === 'corporal' ? { repMin: 5, repMax: 8, restSec: 150 } : { repMin: 3, repMax: 5, restSec: 180 };
  if (role === 'hyp') return equipment === 'corporal' ? { repMin: 10, repMax: 15, restSec: 90 } : { repMin: 8, repMax: 12, restSec: 90 };
  if (equipment === 'corporal') {
    // Sin carga externa la progresión llega por reps: rangos más altos.
    if (role === 'main') return { repMin: 6, repMax: 12, restSec: 120 };
    if (role === 'sec') return { repMin: 8, repMax: 15, restSec: 90 };
    return { repMin: 12, repMax: 20, restSec: 60 };
  }
  const table: Record<Goal, Record<'main' | 'sec' | 'iso', Scheme>> = {
    fuerza: {
      main: { repMin: 3, repMax: 6, restSec: 180 },
      sec: { repMin: 6, repMax: 8, restSec: 150 },
      iso: { repMin: 8, repMax: 12, restSec: 90 },
    },
    hipertrofia: {
      main: { repMin: 6, repMax: 10, restSec: 150 },
      sec: { repMin: 8, repMax: 12, restSec: 120 },
      iso: { repMin: 10, repMax: 15, restSec: 75 },
    },
    general: {
      main: { repMin: 8, repMax: 12, restSec: 120 },
      sec: { repMin: 8, repMax: 12, restSec: 90 },
      iso: { repMin: 12, repMax: 15, restSec: 60 },
    },
  };
  return table[goal][role];
}

export interface BuildOptions {
  equipment: EquipmentProfile;
  goal: Goal;
  experience: Experience;
}

export function buildDays(template: Template, opts: BuildOptions): ProgramDay[] {
  return template.days.map((day) => {
    const used = new Set<string>();
    const items: ProgramItem[] = [];
    for (const [pattern, baseSets, role] of day.slots) {
      const exerciseId = BY_EQUIPMENT[pattern][opts.equipment];
      if (!exerciseId || used.has(exerciseId)) continue;
      used.add(exerciseId);
      let sets = baseSets;
      // Principiantes: menos volumen en accesorios; avanzados: una serie más en los básicos.
      if (opts.experience === 'principiante' && role !== 'main' && role !== 'power') sets = Math.max(2, sets - 1);
      if (opts.experience === 'avanzado' && (role === 'main' || role === 'power')) sets += 1;
      items.push({ id: uid(), exerciseId, targetSets: sets, ...scheme(role, opts.goal, opts.equipment) });
    }
    return { id: uid(), name: day.name, items };
  });
}

export const EQUIPMENT_PROFILE_LABEL: Record<EquipmentProfile, string> = {
  gimnasio: 'Gimnasio completo',
  mancuernas: 'Mancuernas en casa',
  corporal: 'Solo peso corporal',
};

export function buildProgram(key: TemplateKey, opts: BuildOptions): Program {
  const t = TEMPLATE_BY_KEY[key];
  const now = Date.now();
  const suffix = opts.equipment === 'gimnasio' ? '' : ` · ${EQUIPMENT_PROFILE_LABEL[opts.equipment].toLowerCase()}`;
  return {
    id: uid(),
    name: t.name + suffix,
    templateKey: key,
    equipmentProfile: opts.equipment,
    days: buildDays(t, opts),
    createdAt: now,
    updatedAt: now,
  };
}

/** Todos los ids usados por las plantillas (para validar contra la biblioteca). */
export function allTemplateExerciseIds(): string[] {
  return Object.values(BY_EQUIPMENT).flatMap((m) => Object.values(m).filter((x): x is string => !!x));
}
