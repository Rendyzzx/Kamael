import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/session";
import { getMaintenanceCached, isWebMaintenance } from "@/lib/system/settings";

/**
 * Dua gerbang server-side:
 *
 * 1. Gerbang auth ala aplikasi native: SEMUA halaman app (anime, donghua,
 *    favorites, history, profile, settings, search) hanya bisa diakses setelah
 *    login. Belum login -> redirect ke "/" (alur onboarding).
 *
 * 2. Gerbang maintenance (WEB): jika maintenance Web/global aktif, halaman
 *    app + "/" di-redirect ke /maintenance — dijalankan di SERVER, bukan
 *    disembunyikan lewat JavaScript. /api sengaja TIDAK diblokir karena
 *    masih melayani Android (maintenance per-platform). Bypass HANYA untuk
 *    akun admin (email di env ADMIN_EMAILS, dicek dari session server-side) —
 *    tidak ada bypass via query parameter.
 *
 * "/" ada di matcher untuk gerbang maintenance; gerbang auth untuk "/" tetap
 * ditangani page.tsx (render OnboardingFlow, bukan redirect, tanpa loop).
 */

/**
 * Lapisan CSRF untuk semua mutasi /api/*: jika Origin/Referer ada dan
 * menyebut origin LAIN, tolak 403 sebelum handler jalan. (Lapisan utama
 * tetap cookie SameSite=Lax milik Auth.js; ini defense-in-depth.)
 * /api/auth/* DILEWATI — Auth.js punya proteksi CSRF token sendiri dan
 * flow OAuth-nya memang lintas origin.
 */
function originGuard(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) return null;

  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return null; // klien non-browser — handler/auth yang menilai.

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== req.nextUrl.host) {
      console.warn(`[csrf] origin mismatch: ${originUrl.host} != ${req.nextUrl.host} (${method} ${pathname})`);
      return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origin tidak valid" }, { status: 403 });
  }
  return null;
}

/** Email admin (env ADMIN_EMAILS, koma-separated) — bypass maintenance. */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export default auth(async (req) => {
  const blocked = originGuard(req as NextRequest);
  if (blocked) return blocked;

  // Untuk request API: middleware TIDAK menegakkan auth maupun maintenance —
  // tiap route API memvalidasi session sendiri via getAuthenticatedUserId(),
  // dan Android harus tetap bisa membaca /api/system/status saat Web maintenance.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ---- Gerbang maintenance Web (server-side, fail-open saat Redis error) ----
  // "/maintenance" sendiri tidak pernah di-redirect (halaman status).
  if (req.nextUrl.pathname !== "/maintenance") {
    const maintenance = await getMaintenanceCached();
    if (isWebMaintenance(maintenance) && !isAdminEmail(req.auth?.user?.email)) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  // "/" menangani gerbangnya sendiri (render OnboardingFlow) — tidak di-
  // redirect supaya tidak ada loop.
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/",
    "/anime/:path*",
    "/donghua/:path*",
    "/favorites/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/search/:path*",
    // Origin guard untuk mutasi API (matcher auth tidak memblokir /api,
    // guard origin berjalan di atas request API yang cocok pola ini).
    "/api/:path*",
  ],
};
