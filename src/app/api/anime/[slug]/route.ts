import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetail } from "@/lib/api/anime";
import { validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/anime/[slug] — detail anime (JSON) untuk client Android.
 * Data sama persis dengan halaman /anime/[slug] (Server Component) —
 * adapter + cache Next.js sama, jadi tidak ada request ganda ke API sumber.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await enforceRateLimit(req, { bucket: "anime-detail", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { slug } = await params;
  const id = validateSlug(slug);
  if (!id) {
    return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
  }

  try {
    const detail = await getAnimeDetail(id);
    return NextResponse.json(
      { detail },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[api/anime/detail]", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Anime tidak ditemukan" }, { status: 404 });
  }
}
