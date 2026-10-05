/**
 * Validasi & util kecil. Semua input user (slug, page, query) divalidasi
 * sebelum menyentuh adapter/API.
 */

const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,200}$/i;
const SERVER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;

/** Validasi slug episode/anime/donghua/genre. Return null jika tidak valid. */
export function validateSlug(slug: string): string | null {
  const s = (slug ?? "").toString().trim();
  if (!SLUG_RE.test(s)) return null;
  return s;
}

/** Validasi serverId untuk resolve URL embed. */
export function validateServerId(serverId: string): string | null {
  const s = (serverId ?? "").toString().trim();
  if (!SERVER_ID_RE.test(s)) return null;
  return s;
}

/** Validasi & clamp nomor halaman. Default 1. */
export function validatePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, 500);
}

/** Sanitasi keyword pencarian: buang karakter aneh, batasi panjang. */
export function sanitizeSearchQuery(raw: string | undefined | null): string {
  const s = (raw ?? "").toString().trim().replace(/[\u0000-\u001f<>]/g, "");
  return s.slice(0, 80);
}

/** Ambil nama tampil dari judul episode, mis. "Solo Leveling Episode 05 Subtitle Indonesia". */
export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Potong judul episode "X Episode N Subtitle Indonesia" jadi "Episode N". */
export function episodeLabel(title: string, fallback = "Episode"): string {
  const m = title.match(/episode\s*([\d.]+)/i);
  if (m) return `Episode ${m[1]}`;
  return fallback;
}

/**
 * Validasi URL target untuk pengecekan embeddability (/api/embed-check).
 * Hanya http(s), bukan localhost/IP privat — endpoint ini melakukan fetch
 * server-side ke URL yang diberikan, jadi harus ditutup dari penyalahgunaan
 * sebagai proxy SSRF ke jaringan internal.
 */
export function isSafeEmbedUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return false;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(host)) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  return true;
}
