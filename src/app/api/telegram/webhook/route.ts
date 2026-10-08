import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/bot";

/**
 * Webhook Bot API Telegram (dipasang via setWebhook dengan secret_token).
 *
 * Verifikasi: header `X-Telegram-Bot-Api-Secret-Token` harus sama persis
 * dengan env TELEGRAM_WEBHOOK_SECRET (perbandingan konstan-waktu) — tanpa
 * itu 403. Authorization admin (numeric user ID) dicek lagi di handler.
 *
 * Selalu balas 200 (kecuali verifikasi gagal) supaya Telegram tidak
 * mengulang update berkali-kali; error internal dicatat di log.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Webhook belum dikonfigurasi — jangan pernah terima update.
    return NextResponse.json({ error: "Webhook tidak dikonfigurasi" }, { status: 503 });
  }

  const header = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(header, secret)) {
    console.warn("[telegram] webhook ditolak: secret token salah");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (typeof update?.update_id !== "number") {
    return NextResponse.json({ ok: true });
  }

  await handleTelegramUpdate(update);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method tidak diizinkan" }, { status: 405 });
}
