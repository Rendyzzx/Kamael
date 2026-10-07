/**
 * Konfigurasi Auth.js (NextAuth v5). Satu-satunya metode login: Google OAuth.
 * Tidak ada password custom, tidak ada penyimpanan credential user sendiri —
 * Auth.js menangani session (JWT) secara stateless, cocok untuk Vercel edge/serverless.
 *
 * `user.id` yang dipakai di seluruh app (Redis key) adalah Google `sub`
 * (subject) — stabil per akun Google, bukan email.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/**
 * Kode login tester (SEMENTARA untuk QA — hapus provider ini saat rilis
 * publik). Default "Aomi123", bisa dioverride via env TESTER_CODE.
 */
const TESTER_CODE = process.env.TESTER_CODE ?? "Aomi123";
const TESTER_USER = {
  id: "cyro-tester",
  name: "Tester Cyronime",
  email: "tester@cyronime.local",
  image: "/mascot/airin.webp",
} as const;

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Login tester sementara: satu kode akses statis, akun pseudo di session.
    // Tidak membuat user DB — hanya JWT, sama seperti Google (stateless).
    Credentials({
      id: "tester",
      name: "Tester",
      credentials: { code: { label: "Kode Tester", type: "password" } },
      authorize: async (credentials) => {
        const code =
          typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!code || code !== TESTER_CODE) return null;
        return { ...TESTER_USER };
      },
    }),
  ],
  // Wajib untuk self-host/Vercel tanpa middleware (atau set AUTH_TRUST_HOST=true).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Callback OAuth gagal (state/redirect mismatch dsb.) default-nya
    // merender halaman error Auth.js yang cuma teks kecil tanpa styling.
    // Arahkan ke halaman error sendiri dengan bahasa manusia + tombol coba lagi.
    error: "/auth/error",
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
