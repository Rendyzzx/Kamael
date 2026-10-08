import { NextRequest, NextResponse } from "next/server";
import { getAnimeEpisode } from "@/lib/api/anime";
import { validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/anime/episode/[episode] — detail episode anime (JSON) untuk
 * client Android: kualitas/server (serverId di-resolve lazy lewat
 * /api/anime/server/[serverId], sama seperti Web), daftar episode,
 * navigasi prev/next, download link.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ episode: string }> }) {
  const limited = await enforceRateLimit(req, { bucket: "anime-episode", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { episode } = await params;
  const id = validateSlug(episode);
  if (!id) {
    return NextResponse.json({ error: "Episode id tidak valid" }, { status: 400 });
  }

  try {
    const ep = await getAnimeEpisode(id);
    return NextResponse.json(
      { episode: ep },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[api/anime/episode]", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Episode tidak ditemukan" }, { status: 404 });
  }
}
