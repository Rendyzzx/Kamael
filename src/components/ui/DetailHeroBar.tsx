"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Back button di atas hero. Saat scroll > 300px, berganti jadi app bar
 * sticky dengan blur berisi back + judul.
 */
export default function DetailHeroBar({
  title,
  backHref,
}: {
  title: string;
  /** Bila diisi, tombol back menuju route ini (portal) — bukan history. */
  backHref?: string;
}) {
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
        backHref ? (
          <Link
            href={backHref}
            aria-label="Kembali ke portal"
            className="absolute left-3 top-3 z-20 flex items-center justify-center rounded-full on-media"
            style={{ width: 40, height: 40, background: "var(--overlay-soft)" }}
          >
            <span className="material-symbols-rounded text-[var(--text)]" style={{ fontSize: 32 }}>
              arrow_back
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Kembali"
            className="absolute left-3 top-3 z-20 flex items-center justify-center rounded-full on-media"
            style={{ width: 40, height: 40, background: "var(--overlay-soft)" }}
          >
            <span className="material-symbols-rounded text-[var(--text)]" style={{ fontSize: 32 }}>
              arrow_back
            </span>
          </button>
        )
      ) : null}

      <div
        className="fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[480px] items-center gap-3 px-3 transition-smooth"
        style={{
          height: scrolled ? 56 : 0,
          opacity: scrolled ? 1 : 0,
          pointerEvents: scrolled ? "auto" : "none",
          background: "var(--navy)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {backHref ? (
          <Link href={backHref} aria-label="Kembali ke portal" className="flex items-center justify-center">
            <span className="material-symbols-rounded text-[var(--text)]" style={{ fontSize: 24 }}>
              arrow_back
            </span>
          </Link>
        ) : (
          <button type="button" onClick={() => router.back()} aria-label="Kembali" className="flex items-center justify-center">
            <span className="material-symbols-rounded text-[var(--text)]" style={{ fontSize: 24 }}>
              arrow_back
            </span>
          </button>
        )}
        <h1 className="line-clamp-1 text-[18px] font-semibold text-[var(--text)]">{title}</h1>
      </div>
    </>
  );
}
