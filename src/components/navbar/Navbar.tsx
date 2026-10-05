"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBox from "./SearchBox";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/anime", label: "Anime" },
  { href: "/donghua", label: "Donghua" },
];

/** Navbar sticky dengan menu mobile dan search global. */
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
            S
          </span>
          <span className="hidden sm:inline">
            Shin<span className="text-accent-500">Stream</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
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

        <div className="ml-auto flex flex-1 items-center justify-end md:ml-4 md:max-w-md">
          <div className="hidden w-full md:block">
            <SearchBox />
          </div>
          <button
            type="button"
            aria-label="Buka menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-md bg-surface-800 text-zinc-300 md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-surface-800 px-4 pb-3 pt-2 md:hidden">
          <div className="mb-2">
            <SearchBox />
          </div>
          <nav className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(l.href)
                    ? "bg-surface-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-surface-800/60 hover:text-zinc-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
