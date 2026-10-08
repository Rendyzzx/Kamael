import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { clearHistory, listHistory, removeHistoryItem } from "@/lib/redis/history";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET    /api/history?type=anime|donghua -> history user (login wajib)
 * DELETE /api/history                     -> hapus SEMUA history user
 * DELETE /api/history?type=...&contentId=...  -> hapus satu item
 */

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, { bucket: "history-read", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  const type = req.nextUrl.searchParams.get("type");
  const safeType = type === "anime" || type === "donghua" ? type : undefined;
  const history = await listHistory(userId, safeType);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const contentId = req.nextUrl.searchParams.get("contentId");

  const limited = await enforceRateLimit(req, { bucket: "history-write", limit: 30, windowSec: 60 }, userId);
  if (limited) return limited;

  if (type === "anime" || type === "donghua") {
    if (!contentId || contentId.length > 120) {
      return NextResponse.json({ error: "contentId wajib diisi" }, { status: 400 });
    }
    await removeHistoryItem(userId, type, contentId);
    return NextResponse.json({ ok: true });
  }

  // Hapus SEMUA hanya lewat DELETE tanpa filter — destructive tapi memang
  // fungsinya (tombol Clear History), sudah dibatasi rate limit per-user.
  await clearHistory(userId);
  return NextResponse.json({ ok: true });
}
