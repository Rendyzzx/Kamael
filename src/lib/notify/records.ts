/**
 * Log broadcast notification (audit + tampilan /status admin). Redis list,
 * hanya 200 record terakhir — bukan database baru, hanya riwayat.
 *
 * Key: notifications:log -> LPUSH JSON record (index 0 terbaru).
 */
import "server-only";
import { getRedis, safeRedis } from "@/lib/redis/client";
import type { BroadcastCategory } from "./prefs";

export type TargetPlatform = "all" | "web" | "android";

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: BroadcastCategory;
  targetPlatform: TargetPlatform;
  createdAt: string;
  createdBy: string;
  /** Metadata tambahan (animeId/episodeId/deepLink/image) — string, dari server. */
  data: Record<string, string> | null;
  stats: {
    targets: number;
    sent: number;
    failed: number;
  };
}

const KEY = "notifications:log";
const KEEP = 200;

function parseRecord(raw: unknown): NotificationRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;
  return {
    id: r.id,
    title: r.title,
    body: typeof r.body === "string" ? r.body : "",
    type: typeof r.type === "string" ? (r.type as BroadcastCategory) : "announcement",
    targetPlatform: r.targetPlatform === "web" || r.targetPlatform === "android" ? r.targetPlatform : "all",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    createdBy: typeof r.createdBy === "string" ? r.createdBy : "",
    data:
      typeof r.data === "object" && r.data !== null
        ? (Object.fromEntries(
            Object.entries(r.data as Record<string, unknown>)
              .filter(([, v]) => typeof v === "string")
              .slice(0, 10)
          ) as Record<string, string>)
        : null,
    stats: {
      targets: typeof (r.stats as Record<string, unknown>)?.targets === "number" ? (r.stats as { targets: number }).targets : 0,
      sent: typeof (r.stats as Record<string, unknown>)?.sent === "number" ? (r.stats as { sent: number }).sent : 0,
      failed: typeof (r.stats as Record<string, unknown>)?.failed === "number" ? (r.stats as { failed: number }).failed : 0,
    },
  };
}

export async function logNotification(record: NotificationRecord): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.lpush(KEY, JSON.stringify(record));
    await redis.ltrim(KEY, 0, KEEP - 1);
    return true;
  }, false);
}

export async function listNotifications(limit = 10): Promise<NotificationRecord[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    // Upstash mem-parse JSON otomatis -> baris bisa objek ATAU string.
    const rows = await redis.lrange<unknown>(KEY, 0, Math.max(0, Math.min(limit, 50)) - 1);
    return rows
      .map((raw) => {
        try {
          return parseRecord(typeof raw === "string" ? JSON.parse(raw) : raw);
        } catch {
          return null;
        }
      })
      .filter((r): r is NotificationRecord => r !== null);
  }, []);
}
