import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import {
  deleteOnboarding,
  getOnboardingStatus,
  patchOnboarding,
  type OnboardingState,
  type OnboardingType,
} from "@/lib/redis/onboarding";
import { newVisitorId, readVisitorId, visitorCookieOptions, VISITOR_COOKIE } from "@/lib/visitor";

/**
 * State onboarding first-time experience — tersimpan di Redis (onboarding:{id}).
 *
 * GET    /api/onboarding                      -> { state, redisOk }
 * POST   /api/onboarding { accepted?, type?, completed? } -> merge-patch state
 * DELETE /api/onboarding                      -> hapus state ("Ulangi Onboarding")
 *
 * Identitas: user ID dari session (login) → prioritas utama; jika belum
 * login, visitor ID dari cookie httpOnly; jika belum ada cookie, POST
 * membuat UUID baru dan menyetel cookie-nya (1 tahun, SameSite=Lax).
 * userId SELALU dari session server-side, tidak pernah dari body client.
 */
function isOnboardingType(value: unknown): value is OnboardingType {
  return value === "anime" || value === "donghua";
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());
  if (!id) {
    return NextResponse.json({ state: { accepted: false, completed: false, type: null }, redisOk: true });
  }
  const status = await getOnboardingStatus(id);
  return NextResponse.json({ state: status.value, redisOk: status.redisOk });
}

export async function POST(req: NextRequest) {
  let body: { accepted?: unknown; type?: unknown; completed?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const patch: Partial<OnboardingState> = {};
  if (body.accepted !== undefined) {
    if (typeof body.accepted !== "boolean") {
      return NextResponse.json({ error: "accepted harus boolean" }, { status: 400 });
    }
    patch.accepted = body.accepted;
  }
  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed harus boolean" }, { status: 400 });
    }
    patch.completed = body.completed;
  }
  if (body.type !== undefined) {
    if (!isOnboardingType(body.type)) {
      return NextResponse.json({ error: 'type harus "anime" atau "donghua"' }, { status: 400 });
    }
    patch.type = body.type;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada field yang valid untuk disimpan" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  const existingVisitorId = await readVisitorId();
  const id = userId ?? existingVisitorId ?? newVisitorId();

  // Redis gagal/down -> result null, tapi request tetap sukses (fallback
  // aman: client lanjut ke langkah berikutnya, onboarding tampil lagi nanti).
  const result = await patchOnboarding(id, patch);

  const res = NextResponse.json({ ok: true, stored: result !== null, state: result });
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
  const deleted = await deleteOnboarding(id);
  return NextResponse.json({ ok: deleted });
}
