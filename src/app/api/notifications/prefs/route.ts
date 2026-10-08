import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notify/prefs";

/**
 * Preferensi notifikasi per USER (sinkron Web & Android — bukan localStorage).
 *
 * GET /api/notifications/prefs       -> { prefs }
 * PUT /api/notifications/prefs       -> body { prefs: { newEpisode?, favorite?,
 *        announcement?, maintenance?, appUpdate? } } (partial update boleh)
 */
export const dynamic = "force-dynamic";

const PREF_KEYS = ["newEpisode", "favorite", "announcement", "maintenance", "appUpdate"] as const;
type PrefKey = (typeof PREF_KEYS)[number];

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(req, { bucket: "nprefs-read", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  const prefs = await getNotificationPreferences(userId);
  return NextResponse.json({ prefs }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { prefs?: unknown };
  try {
    body = (await req.json()) as { prefs?: unknown };
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  if (typeof body.prefs !== "object" || body.prefs === null) {
    return NextResponse.json({ error: "Field prefs wajib berupa object" }, { status: 400 });
  }

  const patch: Partial<NotificationPreferences> = {};
  const raw = body.prefs as Record<string, unknown>;
  for (const key of PREF_KEYS) {
    if (key in raw) {
      if (typeof raw[key] !== "boolean") {
        return NextResponse.json({ error: `prefs.${key} harus boolean` }, { status: 400 });
      }
      (patch as Record<PrefKey, boolean>)[key] = raw[key] as boolean;
    }
  }

  const limited = await enforceRateLimit(req, { bucket: "nprefs-write", limit: 30, windowSec: 60 }, userId);
  if (limited) return limited;

  const prefs = await setNotificationPreferences(userId, patch);
  return NextResponse.json({ ok: true, prefs }, { headers: { "Cache-Control": "private, no-store" } });
}
