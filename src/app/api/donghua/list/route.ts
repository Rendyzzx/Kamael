import { NextRequest, NextResponse } from "next/server";
import {
  getCompletedDonghua,
  getDonghuaByGenre,
  getLatestDonghua,
  getOngoingDonghua,
} from "@/lib/api/donghua";
import { validatePage, validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Endpoint internal untuk infinite scroll listing Donghua.
 * Dipakai oleh <InfiniteGrid> di /donghua. Endpoint donghua tidak
 * mengembalikan hasNextPage asli, jadi dipakai heuristik yang sama
 * dengan render awal (SSR): genre >= 10 item atau tab >= 30 item
 * dianggap mungkin masih ada halaman berikutnya.
 */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, { bucket: "donghua-list", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const tabRaw = searchParams.get("tab");
  const tab = tabRaw === "ongoing" || tabRaw === "completed" ? tabRaw : "latest";
  const page = validatePage(searchParams.get("page") ?? undefined);
  const genreRaw = searchParams.get("genre");
  const genre = genreRaw ? validateSlug(genreRaw) : null;

  try {
    const items = genre
      ? await getDonghuaByGenre(genre, page)
      : tab === "ongoing"
        ? await getOngoingDonghua(page)
        : tab === "completed"
          ? await getCompletedDonghua(page)
          : await getLatestDonghua(page);

    const mayHaveNext = genre ? items.length >= 10 : items.length >= 30;

    return NextResponse.json(
      {
        items,
        hasNextPage: items.length ? mayHaveNext : false,
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ items: [], hasNextPage: false }, { status: 200 });
  }
}
