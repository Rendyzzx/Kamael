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

/**
 * TTL Redis cache per jenis data (detik) — sesuai sifat datanya.
 *
 * Rate limit upstream 30 req/menit TIDAK dilewati/di-bypass — justru dijaga.
 * Strategi: cache fresh + cadangan stale + single-flight (lock) supaya
 * jumlah request upstream ke API sumber serendah mungkin, sekecil mungkin
 * peluang kena 429, sebesar mungkin throughput efektif ke pengunjung.
 */
const REDIS_TTL = {
  list: 300, // listing/home/genre/search
  detail: 900, // detail series/episode metadata
  stream: 120, // URL embed server (paling cepat berubah)
} as const;

/**
 * Masa cadangan stale (detik) setelah TTL fresh habis: nilai lama tetap
 * disajikan sambil di-refresh di belakang, dan jadi penyelamat saat
 * upstream error/429/timeout. Stream pendek (URL server cepat basi).
 */
const STALE_GRACE = {
  list: 86_400,
  detail: 86_400,
  stream: 900,
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

/* ---------- Single-flight: 1 path = maksimal 1 request upstream ---------- */

/** Promise in-flight per path (per instance Vercel). */
const inflight = new Map<string, Promise<unknown>>();

function takeInflight<T>(path: string, start: () => Promise<T>): Promise<T> {
  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;
  const p = start().finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p as Promise<T>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ambil data fresh dari upstream lalu simpan ke Redis (fresh + stale).
 * Dilindungi lock Redis (SET NX): hanya SATU instance yang boleh memanggil
 * upstream untuk path yang sama — instance lain menunggu hasilnya. Ini
 * yang menjaga 30 req/menit tidak terbakar oleh lonjakan pengunjung.
 */
async function refreshWithLock<T>(
  path: string,
  timeoutMs: number,
  revalidate: number
): Promise<T> {
  const redis = getRedis();
  const cacheKey = `cyronime:api:${path}`;
  const staleKey = `${cacheKey}:stale`;
  const lockKey = `${cacheKey}:lock`;
  const kind = cacheKindFor(path);

  return takeInflight(path, async () => {
    // Lock lintas instance: NX + kedaluwarsa otomatis (anti macet).
    const locked = await redis.set(lockKey, "1", { ex: 20, nx: true }).catch(() => null);
    if (!locked) {
      // Instance lain sedang refresh -> tunggu fresh masuk cache (maks ~3s).
      for (let i = 0; i < 10; i++) {
        await sleep(300);
        const v = await redis.get<T>(cacheKey).catch(() => null);
        if (v !== null && v !== undefined) return v;
      }
      // Masih belum ada (refresh lambat): ambil stale bila ada, else fetch sendiri.
      const stale = await redis.get<T>(staleKey).catch(() => null);
      if (stale !== null && stale !== undefined) return stale;
      return fetchFromApi<T>(path, timeoutMs, revalidate);
    }

    try {
      const value = await fetchFromApi<T>(path, timeoutMs, revalidate);
      await redis.set(cacheKey, value, { ex: REDIS_TTL[kind] }).catch(() => null);
      await redis.set(staleKey, value, { ex: REDIS_TTL[kind] + STALE_GRACE[kind] }).catch(() => null);
      return value;
    } finally {
      await redis.del(lockKey).catch(() => null);
    }
  });
}

/**
 * Fetch JSON dari API sumber dengan dua lapis cache: Redis (jika dikonfigurasi)
 * lalu cache Next.js. Melempar ApiError saat gagal.
 *
 * Urutan: fresh Redis -> (stale + refresh belakang) -> upstream.
 * Data stale juga jadi fallback saat upstream error/429/timeout, jadi
 * pengunjung tetap dilayani data lama ketika limit upstream tersentuh.
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
  const staleKey = `${cacheKey}:stale`;

  try {
    const redis = getRedis();

    const hit = await redis.get<T>(cacheKey);
    if (hit !== null && hit !== undefined) return hit;

    const stale = await redis.get<T>(staleKey);
    if (stale !== null && stale !== undefined) {
      // Ada cadangan: sajikan segera, refresh jalan di belakang (best-effort).
      refreshWithLock<T>(path, timeoutMs, revalidate).catch(() => null);
      return stale;
    }

    // Fresh & stale kosong: refresh blocking (tetap single-flight + lock).
    return await refreshWithLock<T>(path, timeoutMs, revalidate);
  } catch (err) {
    // Upstream gagal (termasuk 429): coba stale sekali lagi sebelum menyerah.
    try {
      const stale = await getRedis().get<T>(staleKey);
      if (stale !== null && stale !== undefined) {
        console.warn("[api-client] upstream gagal, sajikan cache stale:", err);
        return stale;
      }
    } catch {
      /* abaikan */
    }
    // Kegagalan upstream (ApiError, termasuk 429) tetap dilempar;
    // Redis sendiri bermasalah -> langsung ke API sumber dengan cache Next.js.
    if (err instanceof ApiError) throw err;
    console.error("[api-client] redis cache failed, falling back:", err);
    return fetchFromApi<T>(path, timeoutMs, revalidate);
  }
}
