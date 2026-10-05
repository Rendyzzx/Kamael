"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bottom navigation mobile (disembunyikan di desktop lewat `md:hidden`).
 * Fixed, safe-area aware (padding-bottom env(safe-area-inset-bottom)),
 * touch target nyaman (h-14), active state jelas tapi tidak berlebihan.
 */
const ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/anime", label: "Anime", icon: FilmIcon },
  { href: "/donghua", label: "Donghua", icon: SparkIcon },
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/profile", label: "Profil", icon: UserIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  // Watch page: player butuh seluruh layar, sembunyikan bottom nav agar tidak mengganggu.
  if (pathname.includes("/watch/")) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-800 bg-surface-950/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-14 max-w-6xl items-stretch justify-between px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium"
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-accent-500" : "text-zinc-500"
                  }`}
                />
                <span className={active ? "text-zinc-100" : "text-zinc-500"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* Icon set minimal (stroke, bukan icon library random — konsisten 1.75 stroke). */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 11.5 12 4l8.5 7.5M6 10v9.5h5V15h2v4.5h5V10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 4.5v15M16 4.5v15M3.5 9h4.5M16 9H20.5M3.5 15h4.5M16 15H20.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5l1.8 5.3 5.2 1.7-5.2 1.7L12 18l-1.8-5.3-5.2-1.7 5.2-1.7L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M19.5 19.5 15.3 15.3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8.3" r="3.3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 19c0-3.3 3.13-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
