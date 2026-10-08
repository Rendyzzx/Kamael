import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/session";

/**
 * Gerbang auth ala aplikasi native: SEMUA halaman app (anime, donghua,
 * favorites, history, profile, settings, search) hanya bisa diakses setelah
 * login. Belum login -> redirect ke "/" yang menampilkan alur onboarding
 * (disclaimer -> info -> login Google -> pilih tontonan).
 *
 * "/" sendiri TIDAK ada di matcher — page.tsx menangani gerbangnya sendiri
 * (render OnboardingFlow, bukan redirect, supaya tidak ada loop).
 * Route publik lain (/_next, /api, /privacy, /login, aset PWA) juga di luar
 * matcher.
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

export default auth((req) => {
  const blocked = originGuard(req as NextRequest);
  if (blocked) return blocked;

  // Untuk request API: middleware TIDAK menegakkan auth (redirect akan merusak
  // kontrak 401 JSON klien) — tiap route API memvalidasi session sendiri
  // via getAuthenticatedUserId(). Middleware hanya menambahkan origin guard.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/anime/:path*",
    "/donghua/:path*",
    "/favorites/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/search/:path*",
    // Origin guard untuk mutasi API (matcher auth tetap tidak mencakup /api,
    // guard origin berjalan di atas request API yang cocok pola ini).
    "/api/:path*",
  ],
};
