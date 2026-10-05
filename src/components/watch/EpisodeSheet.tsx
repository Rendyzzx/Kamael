"use client";

import Link from "next/link";
import { useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import type { StripEpisode } from "@/components/watch/EpisodeStrip";
import { haptic } from "@/lib/haptic";

/**
 * Tombol "Daftar Episode" di halaman watch -> membuka bottom sheet draggable
 * berisi SEMUA episode (grid 5 kolom kartu 56px, ala aplikasi streaming
 * native). Episode aktif ditandai; episode sebelumnya redup (ditonton).
 * Dipakai anime & donghua (href dibuat oleh halaman masing-masing).
 */
export default function EpisodeSheet({
  episodes,
  activeId,
  totalLabel,
}: {
  episodes: StripEpisode[];
  activeId: string;
  totalLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const activeNumber = episodes.find((e) => e.episodeId === activeId)?.number ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic(8);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-chip px-3.5 py-2 text-[13px] font-semibold text-white transition-smooth active:scale-[.97]"
        style={{ height: 36, border: "1.5px solid var(--deep-2)", background: "var(--deep)" }}
        aria-haspopup="dialog"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 17, color: "var(--glacier)" }}>
          list
        </span>
        Daftar Episode
        <span style={{ color: "var(--muted)", fontWeight: 500 }}>{totalLabel}</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Daftar Episode">
        <div className="grid grid-cols-5 gap-2 pt-1">
          {episodes.map((ep) => {
            const active = ep.episodeId === activeId;
            const watched =
              !active && ep.number !== null && activeNumber !== null && ep.number < activeNumber;
            return (
              <Link
                key={ep.episodeId}
                href={ep.href}
                onClick={() => {
                  haptic(6);
                  setOpen(false);
                }}
                aria-current={active ? "true" : undefined}
                className="flex items-center justify-center rounded-xl text-[14px] font-bold transition-smooth active:scale-[.95]"
                style={{
                  height: 52,
                  border: active ? "2px solid var(--glacier)" : "1px solid var(--deep-2)",
                  background: active ? "rgba(143,211,232,.12)" : "var(--deep-2)",
                  color: active ? "var(--glacier)" : watched ? "var(--muted)" : "var(--frost)",
                  opacity: watched ? 0.55 : 1,
                }}
              >
                {ep.label}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
