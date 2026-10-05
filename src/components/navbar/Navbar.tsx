"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBox from "./SearchBox";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/anime", label: "Anime" },
  { href: "/donghua", label: "Donghua" },
] as const;

/**
 * Navbar atas. Di mobile hanya menampilkan logo + search ringkas (navigasi
 * utama ada di BottomNav). Di desktop menampilkan navigasi penuh + search + auth.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-800 bg-surface-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-500 text-sm font-black text-white">
            C
          </span>
          <span className="hidden sm:inline">
            Cyro<span className="text-accent-500">nime</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-surface-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-surface-800/60 hover:text-zinc-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-3 md:ml-4 md:max-w-md">
          <div className="hidden w-full md:block">
            <SearchBox />
          </div>
          <button
            type="button"
            aria-label="Buka pencarian"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 text-zinc-400 hover:bg-surface-800 hover:text-zinc-100 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.75" />
              <path d="M19.5 19.5 15.3 15.3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hidden md:block">
            <UserMenu />
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-surface-800 px-4 py-3 md:hidden">
          <SearchBox />
        </div>
      ) : null}
    </header>
  );
}
