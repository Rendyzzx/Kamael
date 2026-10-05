/**
 * Cache layer di atas Redis untuk response API Anime/Donghua.
 * Tujuan: User -> Cyronime -> Redis Cache -> API eksternal (bukan API
 * eksternal di setiap request). TTL disesuaikan dengan sifat data:
 * listing lebih lama, detail sedang, sumber streaming paling pendek
 * (URL embed bisa berubah/expire).
 */
import { getRedis, isRedisConfigured } from "./client";

const TTL = {
  list: 300, // 5 menit — listing/home/genre
  detail: 900, // 15 menit — detail series
  stream: 120, // 2 menit — resolve server/streaming url
} as const;

export type CacheKind = keyof typeof TTL;

/** Ambil dari cache; jika miss, jalankan `loader`, simpan, lalu kembalikan. */
export async function cached<T>(
  key: string,
  kind: CacheKind,
  loader: () => Promise<T>
): Promise<T> {
  if (!isRedisConfigured()) return loader();

  try {
    const redis = getRedis();
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch (err) {
    console.error("[redis-cache] read failed:", err);
    return loader();
  }

  const value = await loader();

  try {
    const redis = getRedis();
    await redis.set(key, value, { ex: TTL[kind] });
  } catch (err) {
    console.error("[redis-cache] write failed:", err);
  }

  return value;
}
