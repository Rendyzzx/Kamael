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
      className="fixed inset-0 z-[100] flex items-center justify-center #0B0C0E transition-opacity duration-300"
    >
      <span className="font-display flex items-center text-2xl font-bold tracking-tight text-white">
        Cyro<span style={{ color: "var(--blue)" }}>nime</span>
      </span>
    </div>
  );
}
