import { NextRequest, NextResponse } from "next/server";
import { getAnimeGenres } from "@/lib/api/anime";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Daftar genre anime (id numerik AnimeIn + nama) untuk klien Android.
 * Dipakai bersama /api/anime/list?genre=<id> untuk daftar per genre.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, { bucket: "anime-genres", limit: 60, windowSec: 60 });
  if (limited) return limited;

  try {
    const genres = await getAnimeGenres();
    return NextResponse.json(
      { genres },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ genres: [] }, { status: 200 });
  }
}
