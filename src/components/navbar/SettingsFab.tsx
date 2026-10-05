"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * FAB gear — pintas ke Settings. Konstrain lebar 480px (sama seperti app-shell)
 * agar tetap pas di pojok kanan-bawah "frame" di layar lebar, bukan menempel
 * tepi viewport browser.
 */
export default function SettingsFab({ onboardingDone }: { onboardingDone: boolean }) {
  const pathname = usePathname();

  if (
    pathname.includes("/watch/") ||
    pathname === "/settings" ||
    (pathname === "/" && !onboardingDone)
  )
    return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-[480px]" style={{ bottom: "calc(92px + env(safe-area-inset-bottom))" }}>
      <div className="relative">
        <Link
          href="/settings"
          aria-label="Settings"
          className="pointer-events-auto absolute flex items-center justify-center rounded-full bg-white transition-smooth active:scale-95"
          style={{
            width: 56,
            height: 56,
            // WAJIB bottom: 0 — tanpa ini Link menggantung dari atas container
            // (tinggi 0) dan turun 56px MENIMPA bottom nav (bug "mepet profile").
            bottom: 0,
            right: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,.4)",
          }}
        >
          <span className="material-symbols-rounded text-black" style={{ fontSize: 24 }}>
            settings
          </span>
        </Link>
      </div>
    </div>
  );
}
