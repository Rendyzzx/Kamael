"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Bottom navigation — fixed, 68px, 5 kolom rata, Material Symbols Rounded.
 * Item aktif: pill 64x32 bg --nav-active + ikon putih + label 12px/700 di bawah.
 * Item non-aktif: hanya ikon putih 28px, tanpa label.
 * Rute tetap sama (Home/Anime/Donghua/Search/Profil) — hanya tampilan yang berubah.
 */
const ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/anime", label: "Anime", icon: "live_tv" },
  { href: "/donghua", label: "Donghua", icon: "auto_awesome" },
  { href: "/search", label: "Cari", icon: "search" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Player butuh seluruh layar — sembunyikan bottom nav agar tidak mengganggu.
  if (pathname.includes("/watch/")) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="flex items-center justify-between px-2"
        style={{ height: 68, background: "#1B1C1F" }}
      >
        {ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link href={href} aria-current={active ? "page" : undefined} className="flex flex-col items-center">
                {active ? (
                  <span
                    className="flex items-center justify-center rounded-chip transition-smooth"
                    style={{ width: 64, height: 32, background: "var(--nav-active)" }}
                  >
                    <span className="material-symbols-rounded text-white" style={{ fontSize: 22 }}>
                      {icon}
                    </span>
                  </span>
                ) : (
                  <span className="material-symbols-rounded text-white" style={{ fontSize: 24 }}>
                    {icon}
                  </span>
                )}
                {active ? (
                  <span className="mt-0.5 text-[12px] font-bold text-white">{label}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 justify-center">
          <Link href="/profile" aria-current={profileActive ? "page" : undefined} className="flex flex-col items-center">
            <span
              className="overflow-hidden rounded-full"
              style={{
                width: 36,
                height: 36,
                border: "2px solid #fff",
                background: profileActive ? "var(--nav-active)" : "var(--surface-3)",
              }}
            >
              {session?.user?.image ? (
                <Image src={session.user.image} alt="Profil" width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                  {session?.user?.name?.charAt(0).toUpperCase() ?? (
                    <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
                      person
                    </span>
                  )}
                </span>
              )}
            </span>
            {profileActive ? <span className="mt-0.5 text-[12px] font-bold text-white">Profil</span> : null}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
