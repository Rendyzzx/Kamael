import { NextResponse } from "next/server";
import { searchAnime } from "@/lib/api/anime";
import { searchDonghua } from "@/lib/api/donghua";
import { sanitizeSearchQuery } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Proxy pencarian gabungan untuk search box (client).
 * Alasan proxy: API sumber menolak request tanpa UA browser & ada rate limit,
 * sehingga client tidak boleh memanggil API sumber secara langsung.
 * Fetch di dalam adapter memakai cache Next.js (revalidate) sehingga
 * keyword populer tidak menghujani API sumber.
 */
export async function GET(request: Request) {
  // Proxy publik ke API sumber (rate-limit upstream ketat) -> dibatasi supaya
  // tidak jadi pintu scraping massal. 30x/menit jauh di atas kebutuhan ketik.
  const limited = await enforceRateLimit(request, { bucket: "search", limit: 30, windowSec: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = sanitizeSearchQuery(searchParams.get("q"));

  if (q.length < 2) {
    return NextResponse.json({ anime: [], donghua: [] });
  }

  const [animeRes, donghuaRes] = await Promise.allSettled([
    searchAnime(q),
    searchDonghua(q),
  ]);

  const anime =
    animeRes.status === "fulfilled"
      ? animeRes.value
          .slice(0, 8)
          .map((a) => ({ title: a.title, animeId: a.animeId }))
      : [];
  const donghua =
    donghuaRes.status === "fulfilled"
      ? donghuaRes.value
          .slice(0, 8)
          .map((d) => ({ title: d.title, slug: d.slug }))
      : [];

  return NextResponse.json(
    { anime, donghua },
    // Hasil pencarian publik per keyword — cache edge singkat menghemat
    // bandwidth & melindungi API sumber dari keyword populer yang diulang.
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
