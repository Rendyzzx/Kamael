import { NextResponse } from "next/server";

/**
 * POST /api/report — terima laporan "video rusak" dari player.
 * Laporan dicatat di log server (terlihat di Vercel/deploy log); tidak
 * menyentuh data user maupun adapter API sumber. Body dibatasi dan
 * divalidasi supaya tidak jadi tempat spam sembarang.
 */
const MAX_FIELD = 200;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, MAX_FIELD);
  return s.length ? s : null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const report = {
    type: clean(body.type),
    contentId: clean(body.contentId),
    episodeId: clean(body.episodeId),
    quality: clean(body.quality),
    server: clean(body.server),
    at: new Date().toISOString(),
  };

  console.log("[player-report]", JSON.stringify(report));
  return NextResponse.json({ ok: true });
}
