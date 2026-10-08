import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getMaintenanceCached,
  isAndroidMaintenance,
  isWebMaintenance,
} from "@/lib/system/settings";

/**
 * GET /api/system/status?platform=web|android
 *
 * Status sistem global — dipakai Web (info) & Android (gerbang maintenance
 * client-side, dicek saat startup / kembali ke foreground, BUKAN polling).
 * Public endpoint: tidak ada data user di respons.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, { bucket: "sys-status", limit: 120, windowSec: 60 });
  if (limited) return limited;

  const platform = req.nextUrl.searchParams.get("platform") === "android" ? "android" : "web";
  const m = await getMaintenanceCached();
  const web = isWebMaintenance(m);
  const android = isAndroidMaintenance(m);

  return NextResponse.json(
    {
      platform,
      maintenance: platform === "web" ? web : android,
      message: m.message,
      estimatedEnd: m.estimatedEnd,
      global: m.global,
      web,
      android,
      updatedAt: m.updatedAt || null,
      time: new Date().toISOString(),
    },
    {
      headers: {
        // Caching wajar: maks. stale 30 detik (bot Telegram mengubah state,
        // client merasakan <= 30-40 detik; cache in-memory middleware 10s).
        "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
