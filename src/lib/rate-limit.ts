/**
 * Rate limiting server-side untuk semua API route — kompatibel serverless.
 *
 * Dua lapis:
 *  1. Redis (Upstash REST) bila dikonfigurasi — fixed window (INCR + EXPIRE),
 *     atomik lintas instance Vercel.
 *  2. Fallback in-memory Map — dipakai bila Redis tidak dikonfigurasi/gagal.
 *     CATATAN JUJUR: di serverless multi-instance fallback ini hanya
 *     membatasi per-instance (best effort), bukan global. Untuk proteksi
 *     penuh, set REDIS_URL + REDIS_TOKEN.
 *
 * Kunci limit: `rl:{bucket}:{windowStart}:{id}`. `id` = user ID (login)
 * atau IP klien. Jangan pernah log isi header/IP mentah di tempat publik —
 * log hanya bucket + jumlah.
 */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getRedis, isRedisConfigured, safeRedis } from "@/lib/redis/client";

export interface RateLimitOptions {
  /** Nama bucket, mis. "search", "report". */
  bucket: string;
  /** Jumlah request maksimum per window. */
  limit: number;
  /** Panjang window dalam detik. */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Detik hingga window berikutnya (untuk header Retry-After). */
  retryAfterSec: number;
  /** True bila Redis dipakai (bukan fallback memori). */
  distributed: boolean;
}

/* ---------- fallback in-memory ---------- */

interface MemoryEntry {
  hits: number[];
}

const memory = new Map<string, MemoryEntry>();
/** Batas jumlah kunci di memori supaya fallback tidak bocor memori. */
const MEMORY_MAX_KEYS = 5_000;

function memoryCheck(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = memory.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  const ok = entry.hits.length < limit;
  if (ok) entry.hits.push(now);

  memory.set(key, entry);
  if (memory.size > MEMORY_MAX_KEYS) {
    // Buang entri paling lama (Map menjaga urutan insert).
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }

  const oldestHit = entry.hits[0] ?? now;
  const retryAfterSec = Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000));
  return { ok, retryAfterSec, distributed: false };
}

/* ---------- Redis fixed window ---------- */

async function redisCheck(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / (windowSec * 1000));
  const redisKey = `${key}:${windowStart}`;

  return safeRedis(
    async () => {
      const redis = getRedis();
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec + 1);
      }
      const retryAfterSec = Math.max(1, (windowStart + 1) * windowSec - Math.floor(Date.now() / 1000));
      return { ok: count <= limit, retryAfterSec, distributed: true } satisfies RateLimitResult;
    },
    // Fallback aman bila Redis error TIDAK memblokir user normal (fail-open
    // per-request; memori per-instance tetap membatasi pola paling kasar).
    memoryCheck(key, limit, windowSec)
  );
}

/**
 * Cek limit. `id` harus sudah berupa user ID atau IP klien (bukan data mentah
 * yang tidak divalidasi).
 */
export async function checkRateLimit(id: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const key = `rl:${opts.bucket}:${id}`;
  if (isRedisConfigured()) {
    return redisCheck(key, opts.limit, opts.windowSec);
  }
  return memoryCheck(key, opts.limit, opts.windowSec);
}

/* ---------- helper request ---------- */

/**
 * Ambil IP klien untuk rate limit. Di Vercel: x-forwarded-for (IP asli user
 * adalah entri PERTAMA, bukan terakhir — terakhir bisa berupa proxy internal).
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Enforce rate limit pada Route Handler. Return NextResponse 429 bila kena
 * limit, atau null bila boleh lanjut. Bila `userId` ada, limit per-user;
 * jika tidak, per-IP.
 */
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
  userId?: string | null
): Promise<NextResponse | null> {
  const id = userId ?? clientIp(req);
  const result = await checkRateLimit(id, opts);

  if (!result.ok) {
    // Log keamanan server-side: cukup bucket + id, tanpa data sensitif.
    console.warn(`[rate-limit] 429 bucket=${opts.bucket} id=${id.slice(0, 16)}… window=${opts.windowSec}s`);
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi beberapa saat." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec) },
      }
    );
  }
  return null;
}

/** Wrapper kecil: gabungkan rate limit dengan userId session bila ada. */
export async function enforceRateLimitWithUser(
  req: NextRequest,
  opts: RateLimitOptions,
  userId: string | null
): Promise<NextResponse | null> {
  return enforceRateLimit(req, opts, userId);
}
