import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth/session";
import { logoutToOnboarding } from "@/lib/auth/logout-action";
import LogoutButton from "@/components/auth/LogoutButton";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

export const metadata: Metadata = {
  title: "Profile",
  description: "Kelola akun, history, dan favorite Cyronime kamu.",
};

const LINKS = [
  { href: "/history", label: "Watch History", desc: "Riwayat episode yang sudah ditonton", icon: "schedule" },
  { href: "/favorites", label: "Favorites", desc: "Anime & donghua yang kamu simpan", icon: "playlist_play" },
  { href: "/settings", label: "Settings", desc: "Tema dan preferensi lainnya", icon: "settings" },
] as const;

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="font-display text-[18px] font-semibold text-white">Kamu belum login</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Login untuk melihat profile, continue watching, history, dan favorite.
        </p>
        <div className="w-full">
          <GoogleLoginButton callbackUrl="/profile" />
        </div>
      </div>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div style={{ padding: "0 var(--page-x)" }} className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-[18px] font-bold text-white">Profile</h1>

      <section className="flex items-center gap-4 rounded-card p-4" style={{ background: "var(--surface)" }}>
        <div className="overflow-hidden rounded-full" style={{ width: 56, height: 56, background: "var(--surface-3)" }}>
          {image ? (
            <Image src={image} alt={name ?? "Avatar"} width={56} height={56} className="h-14 w-14 object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[17px] font-bold text-white">{name}</p>
          <p className="truncate text-sm" style={{ color: "var(--text-2)" }}>
            {email}
          </p>
        </div>
      </section>

      <section className="divide-y overflow-hidden rounded-card" style={{ background: "var(--surface)" }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3.5 transition-smooth hover:bg-app-surface-3">
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--text-2)" }}>
              {l.icon}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{l.label}</p>
              <p className="text-xs" style={{ color: "var(--text-2)" }}>
                {l.desc}
              </p>
            </div>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--text-2)" }} aria-hidden="true">
              chevron_right
            </span>
          </Link>
        ))}
      </section>

      <form action={logoutToOnboarding}>
        <LogoutButton />
      </form>
    </div>
  );
}
