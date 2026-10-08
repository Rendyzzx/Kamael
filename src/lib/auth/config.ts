/**
 * Konfigurasi Auth.js (NextAuth v5). Metode login utama: Google OAuth.
 * Tidak ada password custom, tidak ada penyimpanan credential user sendiri —
 * Auth.js menangani session (JWT) secara stateless, cocok untuk Vercel edge/serverless.
 *
 * `user.id` yang dipakai di seluruh app (Redis key) adalah Google `sub`
 * (subject) — stabil per akun Google, bukan email.
 *
 * Keamanan:
 * - Login tester HANYA aktif di development, atau bila diaktifkan eksplisit
 *   via ENABLE_TESTER_LOGIN=true dengan TESTER_CODE terisi. TIDAK ADA kode
 *   default — kode statis hardcoded adalah pintu masuk di produksi.
 * - Session JWT kedaluwarsa dalam 7 hari (masa wajar untuk app streaming;
 *   user login ulang sekali sepekan, token curian tidak awet selamanya).
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getRedis, safeRedis } from "@/lib/redis/client";
/**
 * CATATAN PENTING: file ini diimpor juga oleh middleware (edge runtime) lewat
 * session.ts — JANGAN mengimpor lib server-only (Redis dsb.) di sini.
 * Rate limit login tester di bawah pakai memori inline yang aman di edge.
 */

/**
 * Login tester untuk QA. Aktif HANYA jika:
 * (NODE_ENV !== "production") ATAU (ENABLE_TESTER_LOGIN=true),
 * DAN TESTER_CODE di-set di env (tidak ada default hardcoded).
 */
export function isTesterLoginEnabled(): boolean {
  if (!process.env.TESTER_CODE) return false;
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_TESTER_LOGIN !== "true") {
    return false;
  }
  return true;
}

const TESTER_CODE = process.env.TESTER_CODE ?? "";
const TESTER_USER = {
  id: "cyro-tester",
  name: "Tester Cyronime",
  email: "tester@cyronime.local",
  image: "/mascot/airin.webp",
} as const;

/**
 * Rate limit in-memory khusus brute-force kode tester: 10 percobaan / 15 menit
 * per IP. Di serverless multi-instance ini best-effort — cukup untuk kode QA,
 * bukan mekanisme keamanan utama (utamanya: provider nonaktif di produksi).
 */
const testerAttempts = new Map<string, number[]>();
const TESTER_LIMIT = 10;
const TESTER_WINDOW_MS = 15 * 60 * 1000;

function testerAllowed(ip: string): boolean {
  const now = Date.now();
  const hits = (testerAttempts.get(ip) ?? []).filter((t) => now - t < TESTER_WINDOW_MS);
  if (hits.length >= TESTER_LIMIT) {
    testerAttempts.set(ip, hits);
    return false;
  }
  hits.push(now);
  testerAttempts.set(ip, hits);
  if (testerAttempts.size > 5000) testerAttempts.clear();
  return true;
}

const google = Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// Login tester dibangun bersyarat — di produksi (tanpa opt-in eksplisit)
// provider bahkan tidak diregistrasi, jangan hanya mengandalkan UI disembunyikan.
const providers: NextAuthConfig["providers"] = [google];
if (isTesterLoginEnabled()) {
  providers.push(
    Credentials({
      id: "tester",
      name: "Tester",
      credentials: { code: { label: "Kode Tester", type: "password" } },
      authorize: async (credentials, request) => {
        const code =
          typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!code) return null;

        const ip =
          (request as unknown as { headers?: Headers })?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ||
          "unknown";
        if (!testerAllowed(ip)) {
          console.warn("[auth] tester login rate-limited");
          return null;
        }

        // Perbandingan konstan-waktu untuk menghindari timing oracle.
        const a = new TextEncoder().encode(code);
        const b = new TextEncoder().encode(TESTER_CODE);
        let diff = a.length === b.length ? 0 : 1;
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
        }
        if (diff !== 0) {
          console.warn("[auth] tester login gagal (kode salah)");
          return null;
        }
        return { ...TESTER_USER };
      },
    })
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  // Wajib untuk self-host/Vercel tanpa middleware (atau set AUTH_TRUST_HOST=true).
  trustHost: true,
  session: {
    strategy: "jwt",
    // 7 hari: refresh terjadi otomatis selama user aktif (rolling).
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    // Callback OAuth gagal (state/redirect mismatch dsb.) default-nya
    // merender halaman error Auth.js yang cuma teks kecil tanpa styling.
    // Arahkan ke halaman error sendiri dengan bahasa manusia + tombol coba lagi.
    error: "/auth/error",
  },
  events: {
    // Registrasi user ke set statistik (SCARD users:known) — untuk /users
    // di bot admin & dashboard. Gagal Redis diabaikan (fail-open, non-blocking).
    async signIn({ user, profile }) {
      const uid =
        (profile as { sub?: string } | undefined)?.sub ?? user?.id ?? null;
      if (!uid) return;
      await safeRedis(async () => {
        const redis = getRedis();
        await redis.sadd("users:known", String(uid));
        return true;
      }, false);
    },
  },
  callbacks: {
    async jwt({ token, profile, user }) {
      // Google: sub stabil per akun. Tester: id pseudo dari authorize.
      if (profile?.sub) token.userId = profile.sub;
      else if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as typeof session.user & { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
};
