/**
 * Cron: cek anime baru & broadcast otomatis.
 * Dipanggil oleh Vercel Cron (vercel.json) atau command admin /newanime.
 *
 * Auth: header `x-cron-secret` harus sama dengan CRON_SECRET, atau (fallback)
 * TELEGRAM_WEBHOOK_SECRET bila CRON_SECRET belum diset.
 */
import { NextRequest, NextResponse } from "next/server";
import { checkNewAnimeNotifications } from "@/lib/notify/newAnime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const provided = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (!provided) return false;
  const expected =
    process.env.CRON_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    "";
  if (!expected) return false;
  if (provided.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await checkNewAnimeNotifications();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[cron/new-anime] gagal:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
