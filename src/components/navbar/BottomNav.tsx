"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Icon, { type IconName } from "@/components/ui/Icon";
import type { Portal } from "@/components/portal/portal-events";
import { haptic } from "@/lib/haptic";

/**
 * Bottom navigation — fixed, 68px, ikon inti custom (Icon.tsx).
 *
 * SCOPED PER PANEL: hanya SATU tab portal ditampilkan (Anime ATAU Donghua).
 * - Di dalam /anime* -> tab "Anime". Di dalam /donghua* -> tab "Donghua".
 *   Di halaman netral -> tab mengikuti preferensi portal (prop defaultPortal).
 *
 * Item aktif: ikon duotone offset amber (misregistration ala cetak) + label.
 * Item non-aktif: ikon garis saja, warna teks lembut.
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

  if (pathname.includes("/watch/") || (pathname === "/" && !onboardingDone)) return null;

  const portal: Portal = pathname.startsWith("/donghua")
    ? "donghua"
    : pathname.startsWith("/anime")
      ? "anime"
      : defaultPortal;

  const portalItem: { href: string; label: string; icon: IconName } =
    portal === "anime"
      ? { href: "/anime", label: "Anime", icon: "anime" }
      : { href: "/donghua", label: "Donghua", icon: "donghua" };

  const items = [
    { href: "/", label: "Home", icon: "home" as IconName },
    portalItem,
    { href: "/search", label: "Cari", icon: "search" as IconName },
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
        style={{
          height: "calc(68px + env(safe-area-inset-bottom))",
          background: "var(--surface)",
          borderTop: "1px solid rgba(245,160,46,.14)",
        }}
      >
        {items.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-1.5"
                onPointerDown={() => haptic(8)}
                style={{ color: active ? "var(--amber)" : "var(--text-2)" }}
              >
                <Icon name={icon} size={24} active={active} />
                <span
                  className="text-[11px]"
                  style={{ fontWeight: active ? 700 : 500, visibility: active ? "visible" : "hidden" }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 justify-center">
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className="flex flex-col items-center gap-1 py-1.5"
            onPointerDown={() => haptic(8)}
            style={{ color: profileActive ? "var(--amber)" : "var(--text-2)" }}
          >
            <span
              className="overflow-hidden"
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-chip)",
                border: profileActive ? "1.5px solid var(--amber)" : "1.5px solid var(--surface-3)",
                background: "var(--surface-2)",
              }}
            >
              {session?.user?.image ? (
                <NavAvatar src={session.user.image} name={session.user.name ?? ""} />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ color: "var(--text)" }}>
                  {session?.user?.name?.charAt(0).toUpperCase() ?? (
                    <Icon name="profile" size={18} />
                  )}
                </span>
              )}
            </span>
            <span
              className="text-[11px]"
              style={{ fontWeight: profileActive ? 700 : 500, visibility: profileActive ? "visible" : "hidden" }}
            >
              Profil
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}


/** Avatar nav 30px: kalau gambar gagal dimuat (URL mati/404), ganti ke
 *  inisial supaya ikon profil tidak pernah tampak "rusak". */
function NavAvatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ color: "var(--text)" }}>
        {name.charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt="Profil"
      width={30}
      height={30}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
