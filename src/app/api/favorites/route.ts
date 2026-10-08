import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/redis/favorites";
import type { ContentType } from "@/lib/redis/watching";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET    /api/favorites?type=anime|donghua            -> daftar snapshot favorite (login wajib)
 * POST   /api/favorites { type, contentId, title, poster } -> tambah favorite
 * DELETE /api/favorites?type=...&contentId=...          -> hapus favorite
 */

interface FavoriteBody {
  type?: ContentType;
  contentId?: string;
  title?: string;
  poster?: string;
}

function parseType(value: string | null): ContentType | null {
  return value === "anime" || value === "donghua" ? value : null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, { bucket: "fav-read", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  const type = parseType(req.nextUrl.searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "type harus anime atau donghua" }, { status: 400 });
  }

  const favorites = await listFavorites(userId, type);
  // Data pribadi per-user: JANGAN pernah di-cache edge/CDN bersama.
  return NextResponse.json({ favorites }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: FavoriteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const type = body.type === "anime" || body.type === "donghua" ? body.type : null;
  if (!type || typeof body.contentId !== "string" || body.contentId.length === 0) {
    return NextResponse.json(
      { error: "Field wajib: type, contentId" },
      { status: 400 }
    );
  }

  // Batasi panjang field supaya Redis tidak jadi tempat nyimpan payload besar.
  const MAX_ID = 120, MAX_TITLE = 200, MAX_POSTER = 500;
  const contentId = body.contentId.slice(0, MAX_ID);
  const title = typeof body.title === "string" ? body.title.slice(0, MAX_TITLE) : "";
  const poster = typeof body.poster === "string" ? body.poster.slice(0, MAX_POSTER) : "";
  if (poster && !/^https?:\/\//i.test(poster)) {
    return NextResponse.json({ error: "poster harus URL http(s)" }, { status: 400 });
  }

  const limited = await enforceRateLimit(req, { bucket: "fav-write", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  await addFavorite(userId, type, { contentId, title, poster });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, { bucket: "fav-write", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  const type = parseType(req.nextUrl.searchParams.get("type"));
  const contentId = req.nextUrl.searchParams.get("contentId");
  if (!type || !contentId || contentId.length > 120) {
    return NextResponse.json({ error: "type dan contentId wajib diisi" }, { status: 400 });
  }

  await removeFavorite(userId, type, contentId);
  return NextResponse.json({ ok: true });
}
