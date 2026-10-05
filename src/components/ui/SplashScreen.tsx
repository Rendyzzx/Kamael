"use client";

import { useEffect, useState } from "react";

/**
 * Splash singkat — MOMEN GERAK UTAMA satu-satunya: latar bergeser dari
 * dusk ke langit golden hour seperti matahari terbit, lalu memudar.
 * Hanya tampil sekali per session (sessionStorage), ~700ms, tidak pernah
 * menghalangi akses lebih lama. Animasi CSS di .splash-screen (globals.css);
 * prefers-reduced-motion -> tanpa animasi (dusk statis).
 */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("cyronime_splash_seen")) return;
    sessionStorage.setItem("cyronime_splash_seen", "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen grain" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
          {/* Matahari naik di atas horizon — logo yang sama dgn header */}
          <path d="M4.5 17.6h15.2" stroke="#FFF1E0" stroke-width="1.75" stroke-linecap="round"/>
          <path d="M12 4.9c3.9 0 6.7 2.7 6.7 6.4 0 2.5-1.6 4.7-3.9 5.7" stroke="#FFF1E0" stroke-width="1.75" stroke-linecap="round" fill="none"/>
          <path d="M12 4.9c-3.9 0-6.7 2.7-6.7 6.4 0 2.5 1.6 4.7 3.9 5.7" stroke="#FFF1E0" stroke-width="1.75" stroke-linecap="round" fill="none"/>
          <path d="M12 13.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z" fill="#FFF1E0"/>
        </svg>
        <span className="font-display text-2xl font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(31,18,25,.6)]">
          Cyronime
        </span>
        <span className="text-[13px]" style={{ color: "rgba(255,241,224,.85)" }}>
          Selamat menonton di senja
        </span>
      </div>
    </div>
  );
}
