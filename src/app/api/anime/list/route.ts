import { NextRequest, NextResponse } from "next/server";
import { getAnimeByGenre, getCompletedAnime, getOngoingAnime, getPopularAnime } from "@/lib/api/anime";
import { validatePage, validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Endpoint internal untuk infinite scroll listing Anime.
 * Dipakai oleh <InfiniteGrid> di /anime — mengembalikan item mentah
 * (AnimeListItem[]) yang sama dengan yang dipakai render awal (SSR),
 * jadi tidak ada data yang dibuat-buat di sisi client.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, { bucket: "anime-list", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const rawTab = searchParams.get("tab");
  // "popular" dipakai klien Android untuk ranking Terpopuler yang sama
  // dengan Home web (getPopularAnime) — tab web lain tidak berubah.
  const tab =
    rawTab === "completed" ? "completed" : rawTab === "popular" ? "popular" : "ongoing";
  const page = validatePage(searchParams.get("page") ?? undefined);
  const genreRaw = searchParams.get("genre");
  const genre = genreRaw ? validateSlug(genreRaw) : null;

  try {
    const result = genre
      ? await getAnimeByGenre(genre, page)
      : tab === "completed"
        ? await getCompletedAnime(page)
        : tab === "popular"
          ? await getPopularAnime(page)
          : await getOngoingAnime(page);

    return NextResponse.json(
      {
        items: result.items,
        hasNextPage: result.pagination.hasNextPage,
      },
      // Data listing publik (sama untuk semua user) — cache edge singkat.
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ items: [], hasNextPage: false }, { status: 200 });
  }
}
