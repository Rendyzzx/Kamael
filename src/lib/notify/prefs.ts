/**
 * Preferensi notifikasi per USER (bukan per device) — disimpan di Redis agar
 * konsisten antara Web dan Android. Client hanya kirim nilai boolean yang
 * sudah divalidasi; sumber kebenaran tetap backend.
 *
 * Key: notify:prefs:{userId} -> JSON.
 */
import "server-only";
import { getRedis, safeRedis } from "@/lib/redis/client";

export interface NotificationPreferences {
  newEpisode: boolean;
  favorite: boolean;
  announcement: boolean;
  maintenance: boolean;
  appUpdate: boolean;
}

export const DEFAULT_NOTIFY_PREFS: NotificationPreferences = {
  newEpisode: true,
  favorite: true,
  announcement: true,
  maintenance: true,
  appUpdate: true,
};

/** Kategori broadcast (dipakai admin/telegram) -> kunci preferensi user. */
export type BroadcastCategory = "episode" | "favorite" | "announcement" | "maintenance" | "update";

export const BROADCAST_CATEGORIES: BroadcastCategory[] = [
  "episode",
  "favorite",
  "announcement",
  "maintenance",
  "update",
];

function categoryPrefKey(category: BroadcastCategory): keyof NotificationPreferences {
  switch (category) {
    case "episode":
      return "newEpisode";
    case "favorite":
      return "favorite";
    case "update":
      return "appUpdate";
    default:
      return category;
  }
}

const prefsKey = (userId: string) => `notify:prefs:${userId}`;

/** Baca preferensi (default ON semua saat Redis tidak aktif / belum pernah diatur). */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.get<Record<string, unknown>>(prefsKey(userId));
    if (typeof raw !== "object" || raw === null) return DEFAULT_NOTIFY_PREFS;
    const merged: NotificationPreferences = { ...DEFAULT_NOTIFY_PREFS };
    for (const key of Object.keys(DEFAULT_NOTIFY_PREFS) as (keyof NotificationPreferences)[]) {
      if (typeof raw[key] === "boolean") merged[key] = raw[key] as boolean;
    }
    return merged;
  }, DEFAULT_NOTIFY_PREFS);
}

/**
 * Simpan preferensi. Hanya menerima patch boolean yang sudah tervalidasi
 * (route handler memvalidasi; di sini di-sanitize sekali lagi).
 */
export async function setNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferences = { ...current };
  for (const key of Object.keys(DEFAULT_NOTIFY_PREFS) as (keyof NotificationPreferences)[]) {
    if (typeof patch[key] === "boolean") next[key] = patch[key] as boolean;
  }
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.set(prefsKey(userId), JSON.stringify(next));
    return true;
  }, false);
  return next;
}

/** Apakah user mengizinkan kategori broadcast ini? */
export function isCategoryAllowed(prefs: NotificationPreferences, category: BroadcastCategory): boolean {
  return prefs[categoryPrefKey(category)] === true;
}
