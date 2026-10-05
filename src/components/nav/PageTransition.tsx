"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Transisi antarhalaman slide+fade halus ala native. Key = pathname:
 * setiap navigasi me-remount wrapper sehingga animasi .page-enter replay.
 * prefers-reduced-motion -> animasi dimatikan di CSS (globals.css).
 *
 * Catatan: wrapper ini juga me-remount state client di dalamnya, tapi
 * di App Router konten halaman memang selalu baru saat pindah rute —
 * perilakunya konsisten dengan native (setiap layar baru mulai fresh).
 *
 * BUG FIX (layar hitam + halaman terkunci): kelas .page-enter dilepas
 * begitu animasinya selesai. Chromium dengan `animation-fill-mode: both`
 * mempertahankan hasil animasi transform sebagai matrix identitas —
 * wrapper selamanya jadi containing block untuk `position: fixed` di
 * dalamnya. Akibatnya overlay fullscreen (onboarding di "/") kolaps jadi
 * tinggi 0px: layar hitam, tombol tak tersentuh, user "terkunci" tanpa
 * bisa navigasi. Melepas kelas mengembalikan fixed ke viewport.
 * (Lapis pertama: fill-mode `both` sudah dihapus di globals.css.)
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // onAnimationEnd BUBBLE dari animasi anak (mis. .onboard-step) —
  // hanya tangani animasi wrapper ini sendiri.
  const handleAnimationEnd = useCallback((e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove("page-enter");
    }
  }, []);

  return (
    <div key={pathname} className="page-enter" onAnimationEnd={handleAnimationEnd}>
      {children}
    </div>
  );
}
