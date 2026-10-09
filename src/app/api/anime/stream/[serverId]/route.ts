import { NextRequest, NextResponse } from "next/server";
import { resolveAnimeServerUrl } from "@/lib/api/anime";
import { extractDirectStream } from "@/lib/api/embed-extract";
import { validateServerId } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/anime/stream/[serverId] — ekstraksi direct file (HLS/MP4) dari
 * halaman embed server, untuk client Android (ExoPlayer).
 *
 * Alasan: WebView embed (VidHide/DesuStream/...) di Android sering gagal
 * (layar hitam/putih, iklan, popup). Backend membuka halaman embed, mengurai
 * player-nya, dan menyerahkan URL file langsung. Kalau ekstraksi gagal,
 * respons tetap 200 dengan fallback="embed" + url embed aslinya supaya
 * client jatuh ke WebView dengan mulus.
 *
 * URL hasil ekstraksi berumur pendek (token di query, biasanya beberapa jam)
 * dan per-request unik — cache Next.js TIDAK dipakai di layer ini
 * (resolve serverId tetap di-cache di adapter seperti biasa).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const limited = await enforceRateLimit(req, {
    bucket: "stream-extract",
    limit: 30,
    windowSec: 60,
  });
  if (limited) return limited;

  const { serverId } = await params;
  const id = validateServerId(serverId);
  if (!id) {
    return NextResponse.json({ error: "Invalid server id" }, { status: 400 });
  }

  let embedUrl: string;
  try {
    embedUrl = await resolveAnimeServerUrl(id);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil URL server" }, { status: 502 });
  }

  // Sudah direct file sejak awal (jarang, tapi murah dicek).
  const clean = embedUrl.split("?")[0].toLowerCase();
  if (clean.includes(".m3u8") || clean.endsWith(".mp4") || clean.endsWith(".m4v") || clean.endsWith(".webm")) {
    return NextResponse.json(
      {
        url: embedUrl,
        type: clean.includes(".m3u8") ? "hls" : "mp4",
        host: new URL(embedUrl).hostname,
        method: "direct",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const stream = await extractDirectStream(embedUrl);
  if (!stream) {
    // Ekstraksi gagal — client harus fallback ke WebView embed.
    return NextResponse.json(
      { fallback: "embed", url: embedUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(stream, { headers: { "Cache-Control": "no-store" } });
}
