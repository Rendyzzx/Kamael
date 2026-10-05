import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/redis/favorites";
import type { ContentType } from "@/lib/redis/watching";

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

  const type = parseType(req.nextUrl.searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "type harus anime atau donghua" }, { status: 400 });
  }

  const favorites = await listFavorites(userId, type);
  return NextResponse.json({ favorites });
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

  await addFavorite(userId, type, {
    contentId: body.contentId,
    title: typeof body.title === "string" ? body.title : "",
    poster: typeof body.poster === "string" ? body.poster : "",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = parseType(req.nextUrl.searchParams.get("type"));
  const contentId = req.nextUrl.searchParams.get("contentId");
  if (!type || !contentId) {
    return NextResponse.json({ error: "type dan contentId wajib diisi" }, { status: 400 });
  }

  await removeFavorite(userId, type, contentId);
  return NextResponse.json({ ok: true });
}
