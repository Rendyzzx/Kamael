"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * FAB gear — pintas ke Settings. Konstrain lebar 480px (sama seperti app-shell)
 * agar tetap pas di pojok kanan-bawah "frame" di layar lebar, bukan menempel
 * tepi viewport browser.
 */
export default function SettingsFab() {
  const pathname = usePathname();

  if (pathname.includes("/watch/") || pathname === "/settings" || pathname === "/portal") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-[480px]" style={{ bottom: 84 }}>
      <div className="relative">
        <Link
          href="/settings"
          aria-label="Settings"
          className="pointer-events-auto absolute flex items-center justify-center rounded-full bg-white transition-smooth active:scale-95"
          style={{
            width: 56,
            height: 56,
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
