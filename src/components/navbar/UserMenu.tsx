"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

/**
 * Area auth di navbar: tombol "Login" (guest) atau avatar + dropdown (logged in).
 * Dropdown: Profile, History, Favorites, Settings, Logout.
 */
export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-surface-800" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-md bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
      >
        Login
      </button>
    );
  }

  const name = session.user.name ?? "Pengguna";
  const image = session.user.image ?? undefined;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu profil"
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-800 ring-1 ring-surface-700 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        {image ? (
          <Image src={image} alt={name} width={32} height={32} className="h-8 w-8 object-cover" />
        ) : (
          <span className="text-xs font-semibold text-zinc-200">{name.charAt(0).toUpperCase()}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-surface-700 bg-surface-850 py-1 shadow-xl"
        >
          <p className="truncate border-b border-surface-800 px-3 py-2 text-xs text-zinc-500">{name}</p>
          <MenuLink href="/profile" onClick={() => setOpen(false)}>
            Profile
          </MenuLink>
          <MenuLink href="/history" onClick={() => setOpen(false)}>
            History
          </MenuLink>
          <MenuLink href="/favorites" onClick={() => setOpen(false)}>
            Favorites
          </MenuLink>
          <MenuLink href="/settings" onClick={() => setOpen(false)}>
            Settings
          </MenuLink>
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-surface-700"
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-surface-700 hover:text-zinc-100"
    >
      {children}
    </Link>
  );
}
