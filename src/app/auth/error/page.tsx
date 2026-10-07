import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import BrandLogo from "@/components/ui/BrandLogo";

export const metadata: Metadata = { title: "Login gagal" };

/*
 * Halaman error OAuth Auth.js. Tanpa ini, callback gagal (misal cookie
 * hilang saat login dari browser dalam aplikasi, atau redirect URI
 * tidak cocok) menampilkan halaman default Auth.js yang cuma teks
 * kecil tanpa styling. Di sini error dijelaskan dengan bahasa manusia
 * plus tombol coba lagi.
 */

const MESSAGES: Record<string, string> = {
  OAuthCallbackError:
    "Login Google gagal di langkah terakhir. Biasanya karena cookie sesi hilang (misal kamu login dari browser bawaan aplikasi). Coba lagi dari browser biasa seperti Chrome.",
  AccessDenied: "Akun Google kamu menolak izin akses. Kamu bisa coba lagi dan izinkan aksesnya.",
  Configuration:
    "Ada masalah konfigurasi login di server (client ID atau redirect URI). Tunggu sebentar lalu coba lagi, kalau masih gagal lapor ke admin.",
  Verification: "Login Google tidak bisa diverifikasi. Coba lagi dari browser biasa.",
  DefaultCallbackError: "Terjadi kesalahan saat memproses login. Coba lagi sebentar.",
};

function messageFor(error?: string) {
  if (!error) return "Login gagal diproses. Coba lagi sebentar.";
  return MESSAGES[error] ?? `Login gagal (${error}). Coba lagi, kalau berulang lapor ke admin.`;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center gap-7 px-5 text-center">
      <BrandLogo size={24} />
      <div className="relative h-[130px] w-[130px] opacity-90">
        <Image src="/mascot/airin.webp" alt="" fill sizes="130px" className="object-contain" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-[20px] font-bold text-[var(--text)]">Loginnya belum berhasil</h1>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {messageFor(error)}
        </p>
      </div>
      <div className="flex w-full max-w-[320px] flex-col gap-3">
        <Link
          href="/login"
          className="rounded-chip px-4 py-3 text-sm font-bold transition-smooth"
          style={{ background: "var(--amber)", color: "var(--ink-warm)" }}
        >
          Coba login lagi
        </Link>
        <Link
          href="/"
          className="rounded-chip px-4 py-3 text-sm font-semibold transition-smooth"
          style={{ border: "1px solid var(--chip-border)", color: "var(--text)" }}
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
