/** 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30). Con 1 rep devuelve el peso. */
export function epley(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
