/**
 * HTTP client untuk AnimeIn (animeinweb.com) — provider anime aktif.
 *
 * Fakta terinspeksi (Okt 2026, dari scraper KyuuX444/scraper anime/animein.js
 * dan verifikasi langsung):
 * - Endpoint proxy JSON: https://animeinweb.com/api/proxy
 * - Wajib header x-proxy-secret (nilai publik dari repo scraper) + UA browser.
 * - SEMUA pemanggilan harus dari server; secret tidak pernah bocor ke browser.
 * - Base URL & secret bisa dioverride via env (ANIMEIN_API_BASE,
 *   ANIMEIN_PROXY_SECRET) tanpa mengubah kode.
 *
 * Lapisan cache: Redis (jika dikonfigurasi) → cache Next.js (revalidate).
 * Kunci cache dipisah dari provider legacy (prefix `cyronime:animein:`).
 */

import { getRedis, isRedisConfigured } from "@/lib/redis/client";

const DEFAULT_API_BASE = "https://animeinweb.com/api/proxy";
/** Nilai default = nilai publik di repo scraper (bukan kredensial privat). */
const DEFAULT_PROXY_SECRET = "animein-secure-proxy-key-123";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const SITE_ORIGIN = "https://animeinweb.com";

/** TTL cache per jenis data (detik) — stream paling pendek karena URL cepat berubah. */
const REDIS_TTL = {
  list: 300, // home/explore/search/genre
  genre: 86400, // daftar genre hampir tak pernah berubah
  detail: 900, // metadata anime
  episodes: 900, // daftar episode per anime
  stream: 120, // URL server streaming — JANGAN panjang
  completedFeed: 600, // feed "tamat" hasil filter status
} as const;

type CacheKind = keyof typeof REDIS_TTL;

export class AnimeInError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AnimeInError";
    this.status = status;
  }
}

export function animeInTtl(kind: CacheKind): number {
  return REDIS_TTL[kind];
}

interface FetchOptions {
  timeoutMs?: number;
  revalidate?: number;
  /** Jenis cache Redis (default "list"). */
  kind?: CacheKind;
}

function apiBase(): string {
  return (process.env.ANIMEIN_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
}

/** Bangun URL absolut ke proxy AnimeIn. Tidak menerima URL arbitrary. */
export function animeInUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${apiBase()}${path}`;
}

/** Fetch langsung ke AnimeIn (tanpa Redis) dengan timeout + cache Next.js. */
async function fetchFromAnimeIn<T>(
  path: string,
  timeoutMs: number,
  revalidate: number
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(animeInUrl(path), {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/plain, */*",
        Referer: `${SITE_ORIGIN}/`,
        Origin: SITE_ORIGIN,
        "x-proxy-secret": process.env.ANIMEIN_PROXY_SECRET || DEFAULT_PROXY_SECRET,
      },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new AnimeInError(
      isTimeout ? "AnimeIn timeout" : "AnimeIn unreachable",
      isTimeout ? 504 : 502
    );
  }

  if (!res.ok) {
    throw new AnimeInError(`AnimeIn error ${res.status}`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new AnimeInError("AnimeIn returned invalid JSON", 502);
  }
}

/** Fetch JSON dari AnimeIn dengan cache Redis dua lapis + cache Next.js. */
export async function animeInFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, revalidate = 300, kind = "list" } = options;

  if (!isRedisConfigured()) {
    return fetchFromAnimeIn<T>(path, timeoutMs, revalidate);
  }

  const cacheKey = `cyronime:animein:${path}`;
  try {
    const redis = getRedis();
    const hit = await redis.get<T>(cacheKey);
    if (hit !== null && hit !== undefined) return hit;

    const value = await fetchFromAnimeIn<T>(path, timeoutMs, revalidate);
    await redis.set(cacheKey, value, { ex: REDIS_TTL[kind] });
    return value;
  } catch (err) {
    // Redis bermasalah tidak boleh membuat website gagal -> langsung ke sumber.
    console.error("[animein-client] redis cache failed, falling back:", err);
    return fetchFromAnimeIn<T>(path, timeoutMs, revalidate);
  }
}
