/** Minúsculas y sin acentos, para búsqueda tolerante ("jalon" encuentra "Jalón"). */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
