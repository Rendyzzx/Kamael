import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import {
  deletePreference,
  getPreference,
  setPreference,
  type PortalPreference,
} from "@/lib/redis/preference";
import { newVisitorId, readVisitorId, visitorCookieOptions, VISITOR_COOKIE } from "@/lib/visitor";

/**
 * Preferensi portal pembuka (Anime / Donghua) — tersimpan di Redis (pref:{id}).
 *
 * GET    /api/preference            -> { preference: "anime"|"donghua"|null }
 * POST   /api/preference { value }  -> simpan preferensi (value wajib "anime"|"donghua")
 * DELETE /api/preference            -> hapus preferensi (opsi "Tampilkan portal lagi")
 *
 * Identitas: user ID dari session (login) → prioritas utama; jika belum login,
 * visitor ID dari cookie httpOnly; jika belum ada cookie, POST membuat UUID
 * baru dan menyetel cookie-nya (1 tahun, SameSite=Lax). userId SELALU dari
 * session server-side, tidak pernah dari body client.
 */
function parsePreference(value: unknown): PortalPreference | null {
  return value === "anime" || value === "donghua" ? value : null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());
  if (!id) {
    return NextResponse.json({ preference: null });
  }
  const preference = await getPreference(id);
  return NextResponse.json({ preference });
}

export async function POST(req: NextRequest) {
  let body: { value?: unknown };
  try {
    body = (await req.json()) as { value?: unknown };
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const value = parsePreference(body.value);
  if (!value) {
    return NextResponse.json({ error: 'value harus "anime" atau "donghua"' }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  const existingVisitorId = await readVisitorId();
  const id = userId ?? existingVisitorId ?? newVisitorId();

  // Redis gagal/down → stored:false, tapi request tetap sukses (fallback aman:
  // client lanjut navigasi, portal tampil lagi di kunjungan berikutnya).
  const stored = await setPreference(id, value);

  const res = NextResponse.json({ ok: true, stored });
  if (!userId && !existingVisitorId) {
    res.cookies.set(VISITOR_COOKIE, id, visitorCookieOptions());
  }
  return res;
}

export async function DELETE() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());
  if (!id) {
    return NextResponse.json({ ok: true });
  }
  const deleted = await deletePreference(id);
  return NextResponse.json({ ok: deleted });
}
