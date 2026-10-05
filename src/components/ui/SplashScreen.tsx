"use client";

import { useEffect, useState } from "react";

/**
 * Splash singkat (brand reveal), bukan AI-slop generic spinner.
 * Hanya tampil sekali per session (sessionStorage), durasi pendek (~650ms),
 * tidak pernah menghalangi user mengakses halaman lebih lama dari itu.
 * Halaman di baliknya tetap render dari posisi scroll teratas.
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("cyronime_splash_seen")) return;
    sessionStorage.setItem("cyronime_splash_seen", "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 650);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950 transition-opacity duration-300"
    >
      <span className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-500 text-base font-black text-white">
          C
        </span>
        Cyro<span className="text-accent-500">nime</span>
      </span>
    </div>
  );
}
