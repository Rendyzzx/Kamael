/**
 * Watch History — daftar tontonan, dipisah per tipe agar query efisien.
 * Key: watch_history:{userId}:{type} -> sorted set (score = watchedAt),
 * member = JSON ringkas item. Dibatasi (retention) agar tidak tumbuh tanpa batas.
 */
import "server-only";
import { getRedis, safeRedis } from "./client";
import type { ContentType } from "./watching";

const MAX_ITEMS = 200; // retention: simpan 200 tontonan terakhir per tipe per user

export interface HistoryEntry {
  contentId: string;
  type: ContentType;
  title: string;
  poster: string;
  episode: number | null;
  watchedAt: number;
}

function key(userId: string, type: ContentType) {
  return `watch_history:${userId}:${type}`;
}

/** Catat/perbarui satu entry history (dedup berdasarkan contentId). */
export async function recordHistory(userId: string, entry: Omit<HistoryEntry, "watchedAt">): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    const k = key(userId, entry.type);
    const watchedAt = Date.now();
    // Hapus entry contentId lama (cari lewat scan sederhana karena set kecil per user).
    const existing = await redis.zrange<string[]>(k, 0, -1);
    const stale = existing.find((raw) => {
      try {
        return (JSON.parse(raw) as HistoryEntry).contentId === entry.contentId;
      } catch {
        return false;
      }
    });
    if (stale) await redis.zrem(k, stale);

    const record: HistoryEntry = { ...entry, watchedAt };
    await redis.zadd(k, { score: watchedAt, member: JSON.stringify(record) });
    // Retention: buang entry paling lama bila melebihi batas (sisakan MAX_ITEMS teratas berdasarkan score).
    await redis.zremrangebyrank(k, 0, -(MAX_ITEMS + 1));
    return true;
  }, false);
}

/** History terbaru dulu, gabungan anime+donghua atau per tipe. */
export async function listHistory(
  userId: string,
  type?: ContentType,
  limit = 50
): Promise<HistoryEntry[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    const types: ContentType[] = type ? [type] : ["anime", "donghua"];
    const results = await Promise.all(
      types.map(async (t) => {
        const raws = await redis.zrange<string[]>(key(userId, t), 0, limit - 1, { rev: true });
        return raws
          .map((raw) => {
            try {
              return JSON.parse(raw) as HistoryEntry;
            } catch {
              return null;
            }
          })
          .filter((v): v is HistoryEntry => v !== null);
      })
    );
    return results
      .flat()
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, limit);
  }, []);
}

/** Hapus satu item dari history. */
export async function removeHistoryItem(userId: string, type: ContentType, contentId: string): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    const k = key(userId, type);
    const existing = await redis.zrange<string[]>(k, 0, -1);
    const stale = existing.find((raw) => {
      try {
        return (JSON.parse(raw) as HistoryEntry).contentId === contentId;
      } catch {
        return false;
      }
    });
    if (stale) await redis.zrem(k, stale);
    return true;
  }, false);
}

/** Hapus semua history user (kedua tipe). */
export async function clearHistory(userId: string): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.del(key(userId, "anime"), key(userId, "donghua"));
    return true;
  }, false);
}
