/**
 * Helper franchise (shared antar provider anime).
 * Dipakai untuk menyusun "Anime Terkait" agar hanya berisi karya yang
 * benar-benar nyambung dengan judul yang dibuka: season lain, OVA, film.
 * Sebelumnya related/recommended hanya rekomendasi upstream yang sering
 * tidak ada hubungannya (screenshot owner, Okt 2026).
 */

/**
 * Judul dasar franchise: buang penanda season/part/OVA/film/subtitle di akhir
 * judul supaya "X Season 2", "X 2nd Season", "X OVA" semuanya menghasilkan "X".
 */
export function baseTitle(title: string): string {
  return title
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(subtitle indonesia|sub indo)\b/gi, " ")
    .replace(
      /\b(season|musim|part|cour|bagian)\s*\d+\b|\b\d+(st|nd|rd|th)\s+season\b|\b(final season|the final|ova|oad|ona|special|movie|film|the movie|tv)\b.*$/gi,
      " "
    )
    .replace(/\s+\d+\s*$/, " ")
    .replace(/[:\-–]\s*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kata-kata judul yang bermakna (>=3 huruf) untuk uji kemiripan franchise. */
export function titleTokens(t: string): string[] {
  return baseTitle(t)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/** Anggap satu franchise bila judul dasar sama atau saling memuat (urutan kata awal). */
export function sameFranchise(a: string, b: string): boolean {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const need = Math.max(1, Math.min(short.length, 3));
  return short.slice(0, need).every((w, i) => long[i] === w);
}
