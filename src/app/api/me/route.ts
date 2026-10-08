import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/me — info akun dari session (dipakai profile screen Android;
 * Web memakai Server Component langsung). Tidak ada data lain yang bocor.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, { bucket: "me", limit: 30, windowSec: 60 });
  if (limited) return limited;

  return NextResponse.json(
    {
      user: {
        id: (user as { id?: string }).id ?? null,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
