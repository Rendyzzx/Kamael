import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAppVersion } from "@/lib/system/settings";

/**
 * GET /api/app/version
 *
 * Info versi aplikasi Android — dicek app saat startup:
 *   currentVersion < minimumVersion -> "Versi tidak didukung" + Update Sekarang
 *   currentVersion < latestVersion  -> "Update tersedia" (opsional)
 * `forceUpdate` = true memaksa flag update tanpa melihat minimumVersion
 * (untuk keadaan darurat; jangan dipakai untuk update biasa).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, { bucket: "app-version", limit: 60, windowSec: 60 });
  if (limited) return limited;

  const version = await getAppVersion();
  return NextResponse.json(
    {
      latestVersion: version.latestVersion,
      minimumVersion: version.minimumVersion,
      downloadUrl: version.downloadUrl,
      forceUpdate: process.env.APP_FORCE_UPDATE === "true",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
