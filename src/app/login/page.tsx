import type { Metadata } from "next";
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
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-8 px-4 text-center">
      <BrandLogo size={26} />

      <div className="space-y-1.5">
        <h1 className="font-display text-[18px] font-semibold text-white">Masuk untuk melanjutkan</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Login untuk menyimpan progress tontonan, history, dan favorite kamu di semua perangkat.
        </p>
      </div>

      <div className="w-full space-y-3">
        <GoogleLoginButton callbackUrl="/profile" />
        <TesterLoginButton />
        <p className="text-xs" style={{ color: "var(--text-2)" }}>
          Belum punya akun? Login dengan Google untuk mulai — tidak ada password yang perlu diingat.
        </p>
      </div>

      <p className="text-xs" style={{ color: "var(--text-2)" }}>
        Cyronime butuh akun untuk menjelajahi Anime dan Donghua — seperti aplikasi pada umumnya.
      </p>
    </div>
  );
}
