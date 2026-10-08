/**
 * Continue Watching — satu record progress per content per user.
 * Key: continue_watching:{userId} -> hash field = contentId, value = JSON progress.
 * Menonton ulang episode yang sama = UPDATE, bukan record baru.
 *
 * Catatan jujur soal position/duration: player Cyronime berbasis iframe embed
 * pihak ketiga yang TIDAK mengekspos posisi pemutaran, maka position/duration
 * bersifat opsional (undefined = tidak diketahui; UI tidak menampilkan
 * progress bar palsu). API tetap menerima position/duration penuh agar
 * player native di masa depan bisa langsung memakainya.
 */
import "server-only";
import { getRedis, safeRedis } from "./client";

export type ContentType = "anime" | "donghua";

export interface WatchProgress {
  contentId: string;
  type: ContentType;
  episodeId: string;
  episode: number | null;
  title: string;
  poster: string;
  /** Posisi terakhir dalam detik, bila diketahui player. */
  position?: number;
  /** Durasi total dalam detik, bila diketahui player. */
  duration?: number;
  updatedAt: number;
}

function key(userId: string) {
  return `continue_watching:${userId}`;
}

function validate(p: Partial<WatchProgress>): string | null {
  if (!p.contentId || typeof p.contentId !== "string") return "contentId wajib diisi";
  if (p.type !== "anime" && p.type !== "donghua") return "type harus anime|donghua";
  if (!p.episodeId || typeof p.episodeId !== "string") return "episodeId wajib diisi";
  if (p.position !== undefined) {
    if (typeof p.position !== "number" || p.position < 0) return "position harus >= 0";
  }
  if (p.duration !== undefined) {
    if (typeof p.duration !== "number" || p.duration <= 0) return "duration harus > 0";
  }
  if (
    p.position !== undefined &&
    p.duration !== undefined &&
    p.position > p.duration
  ) {
    return "position tidak boleh melebihi duration";
  }
  return null;
}

/** Simpan/update progress. Mengembalikan pesan error validasi, atau null jika sukses. */
export async function upsertProgress(
  userId: string,
  input: Omit<WatchProgress, "updatedAt">
): Promise<string | null> {
  const err = validate(input);
  if (err) return err;

  await safeRedis(async () => {
    const redis = getRedis();
    const record: WatchProgress = { ...input, updatedAt: Date.now() };
    await redis.hset(key(userId), { [input.contentId]: JSON.stringify(record) });
    return true;
  }, false);

  return null;
}

/** Semua progress milik user, terbaru dulu. */
export async function listProgress(userId: string): Promise<WatchProgress[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    const all = await redis.hgetall<Record<string, string>>(key(userId));
    if (!all) return [];
    const items = Object.values(all)
      .map((raw) => {
        try {
          return typeof raw === "string" ? (JSON.parse(raw) as WatchProgress) : (raw as unknown as WatchProgress);
        } catch {
          return null;
        }
      })
      .filter((v): v is WatchProgress => v !== null);
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);
}

/** Progress satu content tertentu (untuk auto-resume di watch page). */
export async function getProgress(
  userId: string,
  contentId: string
): Promise<WatchProgress | null> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.hget<string>(key(userId), contentId);
    if (!raw) return null;
    try {
      return typeof raw === "string" ? (JSON.parse(raw) as WatchProgress) : (raw as unknown as WatchProgress);
    } catch {
      return null;
    }
  }, null);
}

export async function deleteProgress(userId: string, contentId: string): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.hdel(key(userId), contentId);
    return true;
  }, false);
}

/** Hapus SEMUA progress Continue Watching milik user (Settings > Reset Progress). */
export async function clearAllProgress(userId: string): Promise<boolean> {
  return safeRedis(async () => {
    const redis = getRedis();
    await redis.del(key(userId));
    return true;
  }, false);
}
