import { NextRequest, NextResponse } from "next/server";
import { getDonghuaDetail } from "@/lib/api/donghua";
import { validateSlug } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/donghua/[slug] — detail donghua (JSON) untuk client Android.
 * Data sama persis dengan halaman /donghua/[slug]; adapter + cache sama.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await enforceRateLimit(req, { bucket: "donghua-detail", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const { slug } = await params;
  const id = validateSlug(slug);
  if (!id) {
    return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
  }

  try {
    const detail = await getDonghuaDetail(id);
    return NextResponse.json(
      { detail },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[api/donghua/detail]", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Donghua tidak ditemukan" }, { status: 404 });
  }
}
