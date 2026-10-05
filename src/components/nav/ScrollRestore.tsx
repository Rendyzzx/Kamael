"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll restoration per tab ala native: posisi scroll tiap rute dicatat
 * kontinu (listener scroll, throttled rAF) — jadi tidak kalah cepat dari
 * reset-scroll bawaan Next saat navigasi. Saat kembali ke rute itu
 * (bottom nav / back), posisi dipulihkan.
 *
 * In-memory Map (bukan sessionStorage) — cukup untuk "posisi tiap tab
 * tersimpan" selama sesi. Rute watch selalu mulai dari atas (player dulu).
 */
const scrollMap = new Map<string, number>();

export default function ScrollRestore() {
  const pathname = usePathname();
  const rafRef = useRef(0);
  const pathRef = useRef(pathname);

  // Catat posisi scroll rute aktif secara kontinu.
  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        scrollMap.set(pathRef.current, window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Saat pindah rute: pulihkan posisi tersimpan, atau ke atas untuk rute baru.
  useEffect(() => {
    const prev = pathRef.current;
    pathRef.current = pathname;
    if (prev === pathname) return;
    if (pathname.includes("/watch/")) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const saved = scrollMap.get(pathname);
    if (saved) {
      requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "auto" }));
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname]);

  return null;
}
