import { NextRequest, NextResponse } from "next/server";
import { getDonghuaEpisode } from "@/lib/api/donghua";
import { validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/donghua/episode/[slug] — detail episode donghua (JSON) untuk
 * client Android: server streaming (URL langsung, tanpa resolve tambahan),
 * navigasi prev/next, download link.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await enforceRateLimit(req, { bucket: "donghua-episode", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { slug } = await params;
  const id = validateSlug(slug);
  if (!id) {
    return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
  }

  try {
    const ep = await getDonghuaEpisode(id);
    return NextResponse.json(
      { episode: ep },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[api/donghua/episode]", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Episode tidak ditemukan" }, { status: 404 });
  }
}
