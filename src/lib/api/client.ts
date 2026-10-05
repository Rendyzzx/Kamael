/**
 * HTTP client untuk Sanka Vollerei Anime API.
 *
 * Fakta terinspeksi (docs/API-INSPECTION.md):
 * - API menolak request tanpa User-Agent browser (anti-bot "Plana AI Detector").
 * - Rate limit 30 req/menit -> setiap fetch WAJIB di-cache.
 * - Tidak ada API key; API_BASE_URL dibaca dari env server-side.
 *
 * Lapisan cache (prompt Redis #10): User -> Cyronime -> Redis -> API eksternal.
 * Jika Redis (Upstash) dikonfigurasi, response JSON di-cache di Redis dengan TTL
 * per jenis data; jika tidak, fallback ke cache bawaan Next.js (revalidate).
 */

import { getRedis, isRedisConfigured } from "@/lib/redis/client";

const DEFAULT_BASE_URL = "https://www.sankavollerei.web.id";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** TTL Redis cache per jenis data (detik) — sesuai sifat datanya. */
const REDIS_TTL = {
  list: 300, // listing/home/genre/search
  detail: 900, // detail series/episode metadata
  stream: 120, // URL embed server (paling cepat berubah)
} as const;

type CacheKind = keyof typeof REDIS_TTL;

function cacheKindFor(path: string): CacheKind {
  if (/\/(server|episode)\//.test(path)) return "stream";
  if (/\/(detail)\//.test(path)) return "detail";
  return "list";
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOptions {
  /** Timeout request dalam milidetik. */
  timeoutMs?: number;
  /** Cache Next.js (fallback ketika Redis tidak dikonfigurasi), dalam detik. Default 300. */
  revalidate?: number;
}

/** Bangun URL absolut ke API sumber. Tidak pernah menerima URL arbitrary dari luar. */
export function apiUrl(path: string): string {
  const base = process.env.API_BASE_URL || DEFAULT_BASE_URL;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base.replace(/\/+$/, "")}${path}`;
}

/** Fetch langsung ke API sumber (tanpa Redis) dengan timeout + cache Next.js. */
async function fetchFromApi<T>(path: string, timeoutMs: number, revalidate: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new ApiError(
      isTimeout ? "Upstream API timeout" : "Upstream API unreachable",
      isTimeout ? 504 : 502
    );
  }

  if (!res.ok) {
    throw new ApiError(`Upstream API error ${res.status}`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("Upstream API returned invalid JSON", 502);
  }
}

/**
 * Fetch JSON dari API sumber dengan dua lapis cache: Redis (jika dikonfigurasi)
 * lalu cache Next.js. Melempar ApiError saat gagal.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, revalidate = 300 } = options;

  if (!isRedisConfigured()) {
    return fetchFromApi<T>(path, timeoutMs, revalidate);
  }

  const cacheKey = `cyronime:api:${path}`;
  const kind = cacheKindFor(path);

  try {
    const redis = getRedis();
    const hit = await redis.get<T>(cacheKey);
    if (hit !== null && hit !== undefined) return hit;

    const value = await fetchFromApi<T>(path, timeoutMs, revalidate);
    await redis.set(cacheKey, value, { ex: REDIS_TTL[kind] });
    return value;
  } catch (err) {
    // Redis bermasalah tidak boleh membuat website gagal -> langsung ke API
    // sumber dengan cache Next.js.
    console.error("[api-client] redis cache failed, falling back:", err);
    return fetchFromApi<T>(path, timeoutMs, revalidate);
  }
}
