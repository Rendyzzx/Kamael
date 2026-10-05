"use client";

import { usePathname } from "next/navigation";

/**
 * Transisi antarhalaman slide+fade halus ala native. Key = pathname:
 * setiap navigasi me-remount wrapper sehingga animasi .page-enter replay.
 * prefers-reduced-motion -> animasi dimatikan di CSS (globals.css).
 *
 * Catatan: wrapper ini juga me-remount state client di dalamnya, tapi
 * di App Router konten halaman memang selalu baru saat pindah rute —
 * perilakinya konsisten dengan native (setiap layar baru mulai fresh).
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
