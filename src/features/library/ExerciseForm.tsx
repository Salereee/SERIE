import { useState } from 'react';
import { db } from '../../db/db';
import { EQUIPMENT, EQUIPMENT_LABEL, MUSCLES, MUSCLE_LABEL, type Equipment, type Exercise, type ExerciseKind, type Muscle, type Region } from '../../db/schema';
import { uid } from '../../domain/ids';
import { Sheet } from '../../ui/Sheet';

const LOWER: Muscle[] = ['cuadriceps', 'femoral', 'gluteo', 'aductores', 'pantorrilla'];
const CORE: Muscle[] = ['abdomen', 'lumbar'];

export function regionFor(m: Muscle): Region {
  if (LOWER.includes(m)) return 'inferior';
  if (CORE.includes(m)) return 'core';
  return 'superior';
}

interface Props {
  initial?: Exercise;
  onClose: () => void;
  onSaved?: (e: Exercise) => void;
}

export function ExerciseForm({ initial, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [primary, setPrimary] = useState<Muscle>(initial?.primaryMuscle ?? 'pecho');
  const [secondary, setSecondary] = useState<Muscle[]>(initial?.secondaryMuscles ?? []);
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'barra');
  const [kind, setKind] = useState<ExerciseKind>(initial?.kind ?? 'compuesto');
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const error = trimmed.length < 2 ? 'Escribe un nombre de al menos 2 letras.' : null;

  const save = async () => {
    setTouched(true);
    if (error) return;
    const e: Exercise = {
      id: initial?.id ?? `custom-${uid()}`,
      name: trimmed,
      primaryMuscle: primary,
      secondaryMuscles: secondary.filter((m) => m !== primary),
      equipment,
      kind,
      region: regionFor(primary),
      isCustom: true,
      custom: 1,
    };
    await db.exercises.put(e);
    onSaved?.(e);
    onClose();
  };

  return (
    <Sheet
      title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      eyebrow="Biblioteca"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <form
        className="stack"
        style={{ '--gap': '20px' } as React.CSSProperties}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="ex-name">
            Nombre
          </label>
          <input
            id="ex-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!error}
            aria-describedby={touched && error ? 'ex-name-err' : undefined}
            autoComplete="off"
            maxLength={80}
          />
          {touched && error && (
            <span id="ex-name-err" className="field__error">
              {error}
            </span>
          )}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ex-primary">
            Grupo muscular principal
          </label>
          <select id="ex-primary" className="select" value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </select>
          <span className="field__hint">
            Define qué incremento de peso se sugiere: {regionFor(primary) === 'inferior' ? 'tren inferior' : 'tren superior'}.
          </span>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>
            Músculos secundarios
          </legend>
          <div className="chips chips--wrap">
            {MUSCLES.filter((m) => m !== primary).map((m) => (
              <button
                type="button"
                key={m}
                className="chip"
                aria-pressed={secondary.includes(m)}
                onClick={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
              >
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label className="field__label" htmlFor="ex-eq">
            Equipo
          </label>
          <select id="ex-eq" className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
            {EQUIPMENT.map((m) => (
              <option key={m} value={m}>
                {EQUIPMENT_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field__label" id="ex-kind">
            Tipo
          </span>
          <div className="seg" role="group" aria-labelledby="ex-kind">
            <button type="button" aria-pressed={kind === 'compuesto'} onClick={() => setKind('compuesto')}>
              Compuesto
            </button>
            <button type="button" aria-pressed={kind === 'aislamiento'} onClick={() => setKind('aislamiento')}>
              Aislamiento
            </button>
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
