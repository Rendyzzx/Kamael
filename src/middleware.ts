import { NextResponse } from "next/server";
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
export default auth((req) => {
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
  ],
};
