import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { deleteProgress, getProgress, listProgress, upsertProgress } from "@/lib/redis/watching";
import { recordHistory } from "@/lib/redis/history";

/**
 * POST   /api/watch/progress  -> simpan/update continue-watching + history (login wajib)
 * GET    /api/watch/progress?contentId=... -> ambil progress satu content, atau semua jika tanpa query
 * DELETE /api/watch/progress?contentId=... -> hapus progress satu content
 *
 * userId SELALU berasal dari session server-side, tidak pernah dari body client.
 * position/duration opsional: player embed iframe tidak mengekspos posisi video;
 * bila dikirim, divalidasi (position >= 0, duration > 0, position <= duration).
 */

interface ProgressBody {
  contentId?: string;
  type?: "anime" | "donghua";
  episodeId?: string;
  episode?: number | null;
  title?: string;
  poster?: string;
  position?: number;
  duration?: number;
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProgressBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  if (
    typeof body.contentId !== "string" ||
    (body.type !== "anime" && body.type !== "donghua") ||
    typeof body.episodeId !== "string"
  ) {
    return NextResponse.json(
      { error: "Field wajib: contentId, type, episodeId" },
      { status: 400 }
    );
  }

  const validationError = await upsertProgress(userId, {
    contentId: body.contentId,
    type: body.type,
    episodeId: body.episodeId,
    episode: typeof body.episode === "number" ? body.episode : null,
    title: body.title ?? "",
    poster: body.poster ?? "",
    position: typeof body.position === "number" ? body.position : undefined,
    duration: typeof body.duration === "number" ? body.duration : undefined,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Setiap episode yang dibuka dianggap ditonton -> catat ke history (dedup per content).
  await recordHistory(userId, {
    contentId: body.contentId,
    type: body.type,
    title: body.title ?? "",
    poster: body.poster ?? "",
    episode: typeof body.episode === "number" ? body.episode : null,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentId = req.nextUrl.searchParams.get("contentId");
  if (contentId) {
    const progress = await getProgress(userId, contentId);
    return NextResponse.json({ progress });
  }

  const progress = await listProgress(userId);
  return NextResponse.json({ progress });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentId = req.nextUrl.searchParams.get("contentId");
  if (!contentId) {
    return NextResponse.json({ error: "contentId wajib diisi" }, { status: 400 });
  }

  await deleteProgress(userId, contentId);
  return NextResponse.json({ ok: true });
}
