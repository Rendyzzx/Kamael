"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { haptic } from "@/lib/haptic";

interface Genre {
  id: string;
  title: string;
}

/**
 * Filter genre sebagai bottom sheet draggable ala native (pengganti baris
 * chip yang memakan ruang vertikal). Tombol di halaman list membuka sheet;
 * memilih genre = navigasi URL-driven (basePath?genre=id), sheet tertutup.
 * Mempertahankan query lain (mis. page) yang sedang aktif.
 */
export default function GenreSheet({
  genres,
  basePath,
  activeGenre,
}: {
  genres: Genre[];
  basePath: string;
  activeGenre?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(genreId: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (genreId) {
      params.set("genre", genreId);
    } else {
      params.delete("genre");
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const active = genres.find((g) => g.id === activeGenre);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic(8);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-chip px-3.5 py-2 text-[13px] font-semibold text-white transition-smooth active:scale-[.97]"
        style={{ height: 36, border: "1.5px solid var(--chip-border)", background: "rgba(90,26,32,.15)" }}
        aria-haspopup="dialog"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 17, color: "var(--blue)" }}>
          tune
        </span>
        {active ? active.title : "Semua Genre"}
        <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--text-2)" }}>
          expand_more
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Filter Genre">
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={hrefFor(null)}
            onClick={() => {
              haptic(6);
              setOpen(false);
            }}
            className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-white transition-smooth active:scale-[.97]"
            style={{
              height: 40,
              border: !activeGenre ? "1.5px solid var(--blue)" : "1.5px solid var(--chip-border)",
              background: !activeGenre ? "rgba(33,150,243,.15)" : "rgba(90,26,32,.15)",
            }}
          >
            Semua
          </Link>
          {genres.map((g) => {
            const isActive = activeGenre === g.id;
            return (
              <Link
                key={g.id}
                href={hrefFor(g.id)}
                onClick={() => {
                  haptic(6);
                  setOpen(false);
                }}
                className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-white transition-smooth active:scale-[.97]"
                style={{
                  height: 40,
                  border: isActive ? "1.5px solid var(--blue)" : "1.5px solid var(--chip-border)",
                  background: isActive ? "rgba(33,150,243,.15)" : "rgba(90,26,32,.15)",
                }}
              >
                {g.title}
              </Link>
            );
          })}
        </div>
        <p className="pt-3 text-[12px]" style={{ color: "var(--muted)" }}>
          {pathname.startsWith("/donghua") ? "Portal Donghua" : "Portal Anime"} — filter langsung diterapkan.
        </p>
      </BottomSheet>
    </>
  );
}
