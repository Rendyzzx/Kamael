"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Portal } from "@/components/portal/portal-events";
import { haptic } from "@/lib/haptic";

/**
 * Bottom navigation — fixed, 68px, Material Symbols Rounded.
 *
 * SCOPED PER PANEL: hanya SATU tab portal ditampilkan (Anime ATAU Donghua),
 * tidak pernah berdua — setiap portal adalah panel sendiri.
 * - Di dalam /anime* -> tab "Anime" (live_tv). Di dalam /donghua* -> tab
 *   "Donghua" (auto_awesome). Di halaman netral (Search/Profil/Settings/
 *   Favorit/History) -> tab mengikuti preferensi portal tersimpan di Redis
 *   (prop `defaultPortal`, dikirim dari layout server component).
 * - Pindah portal HANYA lewat PortalSwitch di header /anime & /donghua, atau
 *   lewat Settings ("Tampilkan portal lagi") — bukan dari bottom nav.
 *
 * Item aktif: pill 64x32 bg --nav-active + ikon putih + label 12px/700 di bawah.
 * Item non-aktif: hanya ikon putih 28px, tanpa label.
 */
export default function BottomNav({
  defaultPortal,
  onboardingDone,
}: {
  defaultPortal: Portal;
  onboardingDone: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Player butuh seluruh layar; onboarding first-time experience (tampil DI
  // "/" selama belum selesai, lihat src/app/page.tsx) juga fullscreen —
  // tanpa bottom nav & header di sana. Setelah selesai, "/" jadi dashboard
  // trending sungguhan dan TETAP menampilkan bottom nav.
  if (pathname.includes("/watch/") || (pathname === "/" && !onboardingDone)) return null;

  // Portal panel aktif: path /anime*|/donghua* menentukan langsung; di luar
  // itu (halaman netral) ikut preferensi tersimpan.
  const portal: Portal = pathname.startsWith("/donghua")
    ? "donghua"
    : pathname.startsWith("/anime")
      ? "anime"
      : defaultPortal;

  const portalItem =
    portal === "anime"
      ? { href: "/anime", label: "Anime", icon: "live_tv" }
      : { href: "/donghua", label: "Donghua", icon: "auto_awesome" };

  const items = [
    { href: "/", label: "Home", icon: "home" },
    portalItem,
    { href: "/search", label: "Cari", icon: "search" },
  ] as const;

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
        style={{ height: "calc(68px + env(safe-area-inset-bottom))", background: "#1B1C1F" }}
      >
        {items.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center"
                onPointerDown={() => haptic(8)}
              >
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
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className="flex flex-col items-center"
            onPointerDown={() => haptic(8)}
          >
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
