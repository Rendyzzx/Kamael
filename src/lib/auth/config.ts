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

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // Wajib untuk self-host/Vercel tanpa middleware (atau set AUTH_TRUST_HOST=true).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.sub) token.userId = profile.sub;
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
