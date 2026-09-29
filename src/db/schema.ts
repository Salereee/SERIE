// Tipos del modelo de datos. Todo peso se guarda en kg; la unidad solo afecta la presentación.

export const MUSCLES = [
  'pecho',
  'espalda',
  'hombro',
  'biceps',
  'triceps',
  'antebrazo',
  'trapecio',
  'abdomen',
  'lumbar',
  'cuadriceps',
  'femoral',
  'gluteo',
  'aductores',
  'pantorrilla',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombro: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazo: 'Antebrazo',
  trapecio: 'Trapecio',
  abdomen: 'Abdomen',
  lumbar: 'Lumbar',
  cuadriceps: 'Cuádriceps',
  femoral: 'Femoral',
  gluteo: 'Glúteo',
  aductores: 'Aductores',
  pantorrilla: 'Pantorrilla',
};

export const EQUIPMENT = [
  'barra',
  'mancuerna',
  'maquina',
  'polea',
  'peso_corporal',
  'smith',
  'kettlebell',
  'banda',
  'barra_z',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barra: 'Barra',
  mancuerna: 'Mancuerna',
  maquina: 'Máquina',
  polea: 'Polea',
  peso_corporal: 'Peso corporal',
  smith: 'Smith',
  kettlebell: 'Kettlebell',
  banda: 'Banda',
  barra_z: 'Barra Z',
};

export type ExerciseKind = 'compuesto' | 'aislamiento';
export type Region = 'superior' | 'inferior' | 'core';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  kind: ExerciseKind;
  region: Region;
  isCustom: boolean;
  archived?: boolean;
  /** Índice auxiliar (0/1) porque IndexedDB no indexa booleanos. */
  custom?: 0 | 1;
}

export interface ProgramItem {
  id: string;
  exerciseId: string;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** Items consecutivos con el mismo valor forman un superset. */
  supersetGroup?: string;
}

export interface ProgramDay {
  id: string;
  name: string;
  items: ProgramItem[];
}

export interface Program {
  id: string;
  name: string;
  templateKey?: string;
  equipmentProfile?: EquipmentProfile;
  days: ProgramDay[];
  createdAt: number;
  updatedAt: number;
  isDemo?: boolean;
}

export interface SetEntry {
  id: string;
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  rir?: number | null;
  rpe?: number | null;
  done: boolean;
  doneAt?: number;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  targetSets?: number;
  repMin?: number;
  repMax?: number;
  restSec: number;
  supersetGroup?: string;
  sets: SetEntry[];
}

export type PRKind = 'peso' | '1rm' | 'volumen' | 'reps';

export interface PRHit {
  exerciseId: string;
  kind: PRKind;
  value: number;
  /** Para 'reps': el peso (kg) con el que se lograron. */
  atWeightKg?: number;
  previous?: number;
}

export interface Session {
  id: string;
  programId?: string;
  dayId?: string;
  dayName: string;
  startedAt: number;
  endedAt?: number;
  durationSec?: number;
  status: 'activa' | 'terminada';
  notes?: string;
  exercises: SessionExercise[];
  /** Índice del ejercicio en foco (para recuperar la vista). */
  focusIndex?: number;
  restTimer?: { endsAt: number; totalSec: number; exerciseId?: string } | null;
  summary?: { volumeKg: number; setsDone: number; prs: PRHit[] };
  isDemo?: boolean;
}

/** Índice derivado: uno por ejercicio por sesión terminada. */
export interface ExerciseLog {
  id: string;
  exerciseId: string;
  sessionId: string;
  date: number;
  topWeightKg: number;
  best1RM: number;
  volumeKg: number;
  totalReps: number;
  workSets: { w: number; r: number }[];
  repMin?: number;
  repMax?: number;
  targetSets?: number;
  isDemo?: boolean;
}

export type Mode = 'basico' | 'avanzado';
export type Unit = 'kg' | 'lb';
export type Theme = 'sistema' | 'claro' | 'oscuro';
export type EquipmentProfile = 'gimnasio' | 'mancuernas' | 'corporal';
export type Experience = 'principiante' | 'intermedio' | 'avanzado';
export type Goal = 'fuerza' | 'hipertrofia' | 'general';

export interface Questionnaire {
  daysPerWeek: number;
  experience: Experience;
  goal: Goal;
  equipment: EquipmentProfile;
}

export interface Settings {
  id: 'app';
  mode: Mode;
  unit: Unit;
  incrementUpperKg: number;
  incrementLowerKg: number;
  defaultRestSec: number;
  sound: boolean;
  vibration: boolean;
  theme: Theme;
  activeProgramId?: string;
  onboardingDone: boolean;
  questionnaire?: Questionnaire;
  seedVersion: number;
  /** Último respaldo exportado (ms). */
  lastExportAt?: number;
  /** El recordatorio de respaldo no se muestra antes de esta fecha. */
  exportReminderSnoozedUntil?: number;
  /** Ya se mostró la guía de instalación en iOS. */
  installHintSeen?: boolean;
  /** Modo avanzado: anotar RIR/RPE por serie. Sin valor = sí. */
  effortTracking?: boolean;
}

/** RIR y RPE solo se piden en modo avanzado y si el usuario no los apagó. */
export const showsEffort = (s: Pick<Settings, 'mode' | 'effortTracking'>) => s.mode === 'avanzado' && s.effortTracking !== false;
/** 1RM estimado y demás métricas técnicas: solo en modo avanzado. */
export const showsAdvancedMetrics = (s: Pick<Settings, 'mode'>) => s.mode === 'avanzado';

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  mode: 'basico',
  unit: 'kg',
  incrementUpperKg: 2.5,
  incrementLowerKg: 5,
  defaultRestSec: 90,
  sound: true,
  vibration: true,
  theme: 'sistema',
  onboardingDone: false,
  seedVersion: 0,
};
