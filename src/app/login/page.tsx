import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import BrandLogo from "@/components/ui/BrandLogo";
import TesterLoginButton from "@/components/auth/TesterLoginButton";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke Cyronime untuk menyimpan progress tontonan, history, dan favorite.",
};

export default async function LoginPage() {
  const userId = await getAuthenticatedUserId();
  if (userId) redirect("/profile");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandLogo size={26} />

      {/* Airin menyapa di layar login — ruang tidak datar. */}
      <div className="relative" style={{ width: 120, height: 120 }} aria-hidden="true">
        <Image src="/mascot/airin.webp" alt="" fill sizes="120px" className="object-contain" priority />
      </div>

      <div className="space-y-1.5">
        <h1 className="font-display text-[18px] font-semibold text-[var(--text)]">Masuk untuk melanjutkan</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Progress tontonan, history, dan favorite kamu tersimpan di akun, bisa dilanjutkan di
          perangkat mana saja.
        </p>
      </div>

      <div className="w-full space-y-3">
        <GoogleLoginButton callbackUrl="/profile" />
        {/* Login tester sementara (QA) — tautan kecil, bukan fitur sejajar. */}
        <TesterLoginButton variant="link" />
        <p className="text-xs" style={{ color: "var(--text-2)" }}>
          Belum punya akun? Masuk dengan Google untuk mulai, tanpa password baru.
        </p>
      </div>
    </div>
  );
}
