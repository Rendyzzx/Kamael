/**
 * Favorites — menyimpan snapshot mini (id, judul, poster) per content.
 * Detail penuh tetap diambil dari API/cache; snapshot hanya agar halaman
 * Favorites bisa dirender tanpa memukul API sumber yang rate-limit-nya ketat.
 * Key: favorites:{userId}:{type} -> hash field contentId -> JSON snapshot.
 */
import "server-only";
import { getRedis, safeRedis } from "./client";
import type { ContentType } from "./watching";

export interface FavoriteSnapshot {
  contentId: string;
  title: string;
  poster: string;
  addedAt: number;
}

function key(userId: string, type: ContentType) {
  return `favorites:${userId}:${type}`;
}

export async function addFavorite(
  userId: string,
  type: ContentType,
  snapshot: Omit<FavoriteSnapshot, "addedAt">
): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.hset(key(userId, type), {
      [snapshot.contentId]: JSON.stringify({ ...snapshot, addedAt: Date.now() }),
    });
    return true;
  }, false);
}

export async function removeFavorite(userId: string, type: ContentType, contentId: string): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.hdel(key(userId, type), contentId);
    return true;
  }, false);
}

export async function isFavorite(userId: string, type: ContentType, contentId: string): Promise<boolean> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.hget(key(userId, type), contentId);
    return raw !== null && raw !== undefined;
  }, false);
}

/** Daftar favorite per tipe, terbaru ditambah dulu. */
export async function listFavorites(userId: string, type: ContentType): Promise<FavoriteSnapshot[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    const all = await redis.hgetall<Record<string, string>>(key(userId, type));
    if (!all) return [];
    return Object.values(all)
      .map((raw) => {
        try {
          return typeof raw === "string" ? (JSON.parse(raw) as FavoriteSnapshot) : (raw as unknown as FavoriteSnapshot);
        } catch {
          return null;
        }
      })
      .filter((v): v is FavoriteSnapshot => v !== null)
      .sort((a, b) => b.addedAt - a.addedAt);
  }, []);
}
