/**
 * Redis client (Upstash) — satu-satunya titik koneksi Redis di seluruh project.
 * Serverless/HTTP-based agar kompatibel dengan Vercel (tidak ada koneksi TCP
 * persistent). JANGAN pernah import file ini dari Client Component.
 *
 * Credential dibaca dari env server-side saja:
 *   REDIS_URL   -> UPSTASH_REDIS_REST_URL
 *   REDIS_TOKEN -> UPSTASH_REDIS_REST_TOKEN
 */
import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/** True bila env Redis tersedia. Dipakai untuk graceful-degrade jika Redis belum dikonfigurasi. */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL && process.env.REDIS_TOKEN);
}

/** Ambil instance Redis singleton. Melempar hanya jika dipanggil tanpa konfigurasi. */
export function getRedis(): Redis {
  if (!isRedisConfigured()) {
    throw new RedisUnavailableError("Redis belum dikonfigurasi (REDIS_URL/REDIS_TOKEN kosong)");
  }
  if (!client) {
    client = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }
  return client;
}

export class RedisUnavailableError extends Error {
  constructor(message = "Redis unavailable") {
    super(message);
    this.name = "RedisUnavailableError";
  }
}

/**
 * Jalankan operasi Redis dengan fallback aman.
 * Prinsip #16 (Redis error handling): kegagalan Redis TIDAK BOLEH membuat
 * halaman utama/anime/donghua crash — selalu lewat helper ini di luar lib/redis/*.
 */
export async function safeRedis<T>(
  op: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isRedisConfigured()) return fallback;
  try {
    return await op();
  } catch (err) {
    console.error("[redis] operation failed, falling back:", err);
    return fallback;
  }
}
