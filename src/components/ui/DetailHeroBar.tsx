"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Back button di atas hero. Saat scroll > 300px, berganti jadi app bar
 * sticky dengan blur berisi back + judul.
 */
export default function DetailHeroBar({ title }: { title: string }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {!scrolled ? (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Kembali"
          className="absolute left-3 top-3 z-20 flex items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "rgba(0,0,0,.35)" }}
        >
          <span className="material-symbols-rounded text-white" style={{ fontSize: 32 }}>
            arrow_back
          </span>
        </button>
      ) : null}

      <div
        className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[480px] items-center gap-3 px-3 transition-smooth"
        style={{
          height: scrolled ? 56 : 0,
          opacity: scrolled ? 1 : 0,
          pointerEvents: scrolled ? "auto" : "none",
          background: "rgba(18,19,22,.75)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button type="button" onClick={() => router.back()} aria-label="Kembali" className="flex items-center justify-center">
          <span className="material-symbols-rounded text-white" style={{ fontSize: 24 }}>
            arrow_back
          </span>
        </button>
        <h1 className="line-clamp-1 text-[18px] font-semibold text-white">{title}</h1>
      </div>
    </>
  );
}
