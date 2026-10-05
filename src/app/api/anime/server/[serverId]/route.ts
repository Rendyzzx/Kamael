import { NextResponse } from "next/server";
import { resolveAnimeServerUrl } from "@/lib/api/anime";
import { validateServerId } from "@/lib/utils/validation";

/**
 * Resolve serverId episode anime → URL embed.
 * serverId divalidasi ketat (bukan open proxy): hanya pola ID server,
 * URL target selalu dibangun oleh adapter, bukan dari input user.
 * Hasil di-cache di layer fetch (revalidate 3600).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const id = validateServerId(serverId);

  if (!id) {
    return NextResponse.json({ error: "Invalid server id" }, { status: 400 });
  }

  try {
    const url = await resolveAnimeServerUrl(id);
    return NextResponse.json({ url });
  } catch (err) {
    console.error(
      "[api/anime/server]",
      err instanceof Error ? err.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Gagal mengambil URL server" },
      { status: 502 }
    );
  }
}
