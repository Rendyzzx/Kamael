import { NextRequest, NextResponse } from "next/server";
import { getAnimeByGenre, getCompletedAnime, getOngoingAnime } from "@/lib/api/anime";
import { validatePage, validateSlug } from "@/lib/utils/validation";

/**
 * Endpoint internal untuk infinite scroll listing Anime.
 * Dipakai oleh <InfiniteGrid> di /anime — mengembalikan item mentah
 * (AnimeListItem[]) yang sama dengan yang dipakai render awal (SSR),
 * jadi tidak ada data yang dibuat-buat di sisi client.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") === "completed" ? "completed" : "ongoing";
  const page = validatePage(searchParams.get("page") ?? undefined);
  const genreRaw = searchParams.get("genre");
  const genre = genreRaw ? validateSlug(genreRaw) : null;

  try {
    const result = genre
      ? await getAnimeByGenre(genre, page)
      : tab === "completed"
        ? await getCompletedAnime(page)
        : await getOngoingAnime(page);

    return NextResponse.json({
      items: result.items,
      hasNextPage: result.pagination.hasNextPage,
    });
  } catch {
    return NextResponse.json({ items: [], hasNextPage: false }, { status: 200 });
  }
}
