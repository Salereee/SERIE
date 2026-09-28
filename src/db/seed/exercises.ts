import type { Equipment, Exercise, ExerciseKind, Muscle, Region } from '../schema';

/**
 * Biblioteca predefinida. Los ids son estables: nunca cambies uno existente,
 * porque el historial y los programas los referencian.
 * Si agregas o corriges ejercicios, sube EXERCISE_SEED_VERSION.
 */
export const EXERCISE_SEED_VERSION = 1;

type Row = [id: string, name: string, primary: Muscle, secondary: Muscle[], equipment: Equipment, kind: ExerciseKind, region: Region];

const C = 'compuesto';
const A = 'aislamiento';
const S = 'superior';
const I = 'inferior';
const K = 'core';

const ROWS: Row[] = [
  // Pecho
  ['press-banca-barra', 'Press de banca con barra', 'pecho', ['triceps', 'hombro'], 'barra', C, S],
  ['press-inclinado-barra', 'Press inclinado con barra', 'pecho', ['hombro', 'triceps'], 'barra', C, S],
  ['press-declinado-barra', 'Press declinado con barra', 'pecho', ['triceps'], 'barra', C, S],
  ['press-banca-mancuerna', 'Press de banca con mancuernas', 'pecho', ['triceps', 'hombro'], 'mancuerna', C, S],
  ['press-inclinado-mancuerna', 'Press inclinado con mancuernas', 'pecho', ['hombro', 'triceps'], 'mancuerna', C, S],
  ['press-inclinado-smith', 'Press inclinado en Smith', 'pecho', ['hombro', 'triceps'], 'smith', C, S],
  ['press-pecho-maquina', 'Press de pecho en máquina', 'pecho', ['triceps', 'hombro'], 'maquina', C, S],
  ['aperturas-mancuerna', 'Aperturas con mancuernas', 'pecho', ['hombro'], 'mancuerna', A, S],
  ['cruces-polea', 'Cruces en polea', 'pecho', ['hombro'], 'polea', A, S],
  ['pec-deck', 'Pec deck', 'pecho', ['hombro'], 'maquina', A, S],
  ['fondos-paralelas', 'Fondos en paralelas', 'pecho', ['triceps', 'hombro'], 'peso_corporal', C, S],
  ['lagartijas', 'Lagartijas', 'pecho', ['triceps', 'hombro'], 'peso_corporal', C, S],
  ['lagartijas-declinadas', 'Lagartijas con pies elevados', 'pecho', ['hombro', 'triceps'], 'peso_corporal', C, S],
  ['pullover-mancuerna', 'Pullover con mancuerna', 'pecho', ['espalda', 'triceps'], 'mancuerna', A, S],

  // Espalda
  ['dominadas', 'Dominadas', 'espalda', ['biceps', 'antebrazo'], 'peso_corporal', C, S],
  ['dominadas-supinas', 'Dominadas supinas', 'espalda', ['biceps'], 'peso_corporal', C, S],
  ['jalon-pecho', 'Jalón al pecho', 'espalda', ['biceps'], 'polea', C, S],
  ['jalon-cerrado', 'Jalón con agarre cerrado', 'espalda', ['biceps'], 'polea', C, S],
  ['remo-barra', 'Remo con barra', 'espalda', ['biceps', 'lumbar', 'trapecio'], 'barra', C, S],
  ['remo-mancuerna', 'Remo con mancuerna a una mano', 'espalda', ['biceps'], 'mancuerna', C, S],
  ['remo-inclinado-mancuerna', 'Remo en banco inclinado con mancuernas', 'espalda', ['biceps', 'trapecio'], 'mancuerna', C, S],
  ['remo-polea-baja', 'Remo sentado en polea', 'espalda', ['biceps', 'trapecio'], 'polea', C, S],
  ['remo-t', 'Remo en T', 'espalda', ['biceps', 'trapecio'], 'barra', C, S],
  ['remo-maquina', 'Remo en máquina', 'espalda', ['biceps'], 'maquina', C, S],
  ['remo-invertido', 'Remo invertido', 'espalda', ['biceps'], 'peso_corporal', C, S],
  ['pullover-polea', 'Pullover en polea', 'espalda', ['triceps'], 'polea', A, S],
  ['peso-muerto', 'Peso muerto', 'espalda', ['femoral', 'gluteo', 'lumbar', 'trapecio'], 'barra', C, I],
  ['hiperextensiones', 'Hiperextensiones', 'lumbar', ['gluteo', 'femoral'], 'peso_corporal', A, I],

  // Hombro y trapecio
  ['press-militar', 'Press militar con barra', 'hombro', ['triceps'], 'barra', C, S],
  ['press-hombro-mancuerna', 'Press de hombro con mancuernas', 'hombro', ['triceps'], 'mancuerna', C, S],
  ['press-arnold', 'Press Arnold', 'hombro', ['triceps'], 'mancuerna', C, S],
  ['press-hombro-maquina', 'Press de hombro en máquina', 'hombro', ['triceps'], 'maquina', C, S],
  ['lagartijas-pike', 'Lagartijas pike', 'hombro', ['triceps'], 'peso_corporal', C, S],
  ['elevaciones-laterales', 'Elevaciones laterales con mancuernas', 'hombro', [], 'mancuerna', A, S],
  ['elevaciones-laterales-polea', 'Elevaciones laterales en polea', 'hombro', [], 'polea', A, S],
  ['elevaciones-frontales', 'Elevaciones frontales', 'hombro', ['pecho'], 'mancuerna', A, S],
  ['pajaros', 'Pájaros con mancuernas', 'hombro', ['trapecio', 'espalda'], 'mancuerna', A, S],
  ['pec-deck-inverso', 'Pec deck inverso', 'hombro', ['trapecio'], 'maquina', A, S],
  ['face-pull', 'Face pull', 'hombro', ['trapecio'], 'polea', A, S],
  ['remo-menton', 'Remo al mentón', 'hombro', ['trapecio', 'biceps'], 'barra', C, S],
  ['encogimientos-barra', 'Encogimientos con barra', 'trapecio', ['antebrazo'], 'barra', A, S],
  ['encogimientos-mancuerna', 'Encogimientos con mancuernas', 'trapecio', ['antebrazo'], 'mancuerna', A, S],

  // Bíceps y antebrazo
  ['curl-barra', 'Curl con barra', 'biceps', ['antebrazo'], 'barra', A, S],
  ['curl-barra-z', 'Curl con barra Z', 'biceps', ['antebrazo'], 'barra_z', A, S],
  ['curl-mancuerna', 'Curl alterno con mancuernas', 'biceps', ['antebrazo'], 'mancuerna', A, S],
  ['curl-martillo', 'Curl martillo', 'biceps', ['antebrazo'], 'mancuerna', A, S],
  ['curl-predicador', 'Curl predicador', 'biceps', [], 'barra_z', A, S],
  ['curl-concentrado', 'Curl concentrado', 'biceps', [], 'mancuerna', A, S],
  ['curl-inclinado', 'Curl inclinado con mancuernas', 'biceps', [], 'mancuerna', A, S],
  ['curl-polea', 'Curl en polea', 'biceps', ['antebrazo'], 'polea', A, S],
  ['curl-muneca', 'Curl de muñeca', 'antebrazo', [], 'barra', A, S],

  // Tríceps
  ['extension-triceps-polea', 'Extensión de tríceps en polea', 'triceps', [], 'polea', A, S],
  ['extension-triceps-cuerda', 'Extensión de tríceps con cuerda', 'triceps', [], 'polea', A, S],
  ['press-frances', 'Press francés', 'triceps', [], 'barra_z', A, S],
  ['extension-copa', 'Extensión de tríceps por encima de la cabeza', 'triceps', [], 'mancuerna', A, S],
  ['patada-triceps', 'Patada de tríceps', 'triceps', [], 'mancuerna', A, S],
  ['press-cerrado', 'Press de banca con agarre cerrado', 'triceps', ['pecho', 'hombro'], 'barra', C, S],
  ['fondos-banco', 'Fondos en banco', 'triceps', ['pecho', 'hombro'], 'peso_corporal', C, S],
  ['lagartijas-diamante', 'Lagartijas diamante', 'triceps', ['pecho'], 'peso_corporal', C, S],

  // Cuádriceps
  ['sentadilla', 'Sentadilla con barra', 'cuadriceps', ['gluteo', 'aductores', 'lumbar'], 'barra', C, I],
  ['sentadilla-frontal', 'Sentadilla frontal', 'cuadriceps', ['gluteo', 'abdomen'], 'barra', C, I],
  ['sentadilla-smith', 'Sentadilla en Smith', 'cuadriceps', ['gluteo'], 'smith', C, I],
  ['sentadilla-hack', 'Sentadilla hack', 'cuadriceps', ['gluteo'], 'maquina', C, I],
  ['prensa', 'Prensa de piernas', 'cuadriceps', ['gluteo', 'aductores'], 'maquina', C, I],
  ['sentadilla-goblet', 'Sentadilla goblet', 'cuadriceps', ['gluteo'], 'mancuerna', C, I],
  ['sentadilla-bulgara', 'Sentadilla búlgara', 'cuadriceps', ['gluteo'], 'mancuerna', C, I],
  ['desplantes', 'Desplantes con mancuernas', 'cuadriceps', ['gluteo'], 'mancuerna', C, I],
  ['desplantes-caminando', 'Desplantes caminando', 'cuadriceps', ['gluteo'], 'peso_corporal', C, I],
  ['subidas-cajon', 'Subidas al cajón', 'cuadriceps', ['gluteo'], 'mancuerna', C, I],
  ['sentadilla-libre', 'Sentadilla libre', 'cuadriceps', ['gluteo'], 'peso_corporal', C, I],
  ['extension-cuadriceps', 'Extensión de cuádriceps', 'cuadriceps', [], 'maquina', A, I],

  // Femoral y glúteo
  ['peso-muerto-rumano', 'Peso muerto rumano', 'femoral', ['gluteo', 'lumbar'], 'barra', C, I],
  ['peso-muerto-rumano-mancuerna', 'Peso muerto rumano con mancuernas', 'femoral', ['gluteo', 'lumbar'], 'mancuerna', C, I],
  ['peso-muerto-una-pierna', 'Peso muerto a una pierna', 'femoral', ['gluteo'], 'peso_corporal', C, I],
  ['buenos-dias', 'Buenos días', 'femoral', ['lumbar', 'gluteo'], 'barra', C, I],
  ['curl-femoral-acostado', 'Curl femoral acostado', 'femoral', [], 'maquina', A, I],
  ['curl-femoral-sentado', 'Curl femoral sentado', 'femoral', [], 'maquina', A, I],
  ['curl-nordico', 'Curl nórdico', 'femoral', [], 'peso_corporal', A, I],
  ['hip-thrust', 'Hip thrust con barra', 'gluteo', ['femoral'], 'barra', C, I],
  ['puente-gluteo', 'Puente de glúteo', 'gluteo', ['femoral'], 'peso_corporal', A, I],
  ['patada-gluteo-polea', 'Patada de glúteo en polea', 'gluteo', [], 'polea', A, I],
  ['abduccion-maquina', 'Abducción en máquina', 'gluteo', [], 'maquina', A, I],
  ['aduccion-maquina', 'Aducción en máquina', 'aductores', [], 'maquina', A, I],
  ['peso-muerto-sumo', 'Peso muerto sumo', 'gluteo', ['cuadriceps', 'aductores', 'espalda'], 'barra', C, I],
  ['swing-kettlebell', 'Swing con kettlebell', 'gluteo', ['femoral', 'lumbar'], 'kettlebell', C, I],

  // Pantorrilla
  ['elevacion-talones-pie', 'Elevación de talones de pie', 'pantorrilla', [], 'maquina', A, I],
  ['elevacion-talones-sentado', 'Elevación de talones sentado', 'pantorrilla', [], 'maquina', A, I],
  ['elevacion-talones-prensa', 'Elevación de talones en prensa', 'pantorrilla', [], 'maquina', A, I],
  ['elevacion-talones-mancuerna', 'Elevación de talones con mancuerna', 'pantorrilla', [], 'mancuerna', A, I],
  ['elevacion-talones-una-pierna', 'Elevación de talones a una pierna', 'pantorrilla', [], 'peso_corporal', A, I],

  // Abdomen
  ['crunch', 'Crunch abdominal', 'abdomen', [], 'peso_corporal', A, K],
  ['crunch-polea', 'Crunch en polea', 'abdomen', [], 'polea', A, K],
  ['crunch-maquina', 'Crunch en máquina', 'abdomen', [], 'maquina', A, K],
  ['crunch-bicicleta', 'Crunch bicicleta', 'abdomen', [], 'peso_corporal', A, K],
  ['elevacion-piernas-colgado', 'Elevación de piernas colgado', 'abdomen', ['antebrazo'], 'peso_corporal', A, K],
  ['elevacion-piernas-acostado', 'Elevación de piernas acostado', 'abdomen', [], 'peso_corporal', A, K],
  ['rueda-abdominal', 'Rueda abdominal', 'abdomen', ['lumbar'], 'peso_corporal', A, K],
  ['giros-rusos', 'Giros rusos', 'abdomen', [], 'peso_corporal', A, K],
  ['press-pallof', 'Press Pallof', 'abdomen', [], 'polea', A, K],
];

export const SEED_EXERCISES: Exercise[] = ROWS.map(([id, name, primaryMuscle, secondaryMuscles, equipment, kind, region]) => ({
  id,
  name,
  primaryMuscle,
  secondaryMuscles,
  equipment,
  kind,
  region,
  isCustom: false,
  custom: 0,
}));
