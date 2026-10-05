"use client";

/**
 * Strip episode horizontal di halaman watch.
 * Kartu 72x56 radius 14: aktif = outline glacier 2px; episode lebih awal =
 * redup (sudah ditonton); episode dengan progress tersimpan = garis progres
 * 3px glacier di bawah. Auto-scroll ke episode aktif saat mount.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export interface StripEpisode {
  episodeId: string;
  label: string;
  href: string;
  /** Nomor episode untuk perbandingan "sudah ditonton" (lebih kecil dari aktif). */
  number: number | null;
}

export default function EpisodeStrip({
  episodes,
  activeId,
  activeNumber,
  /** Persen progress episode aktif (dari continue watching Redis), bila ada. */
  progressPct,
  poster,
}: {
  episodes: StripEpisode[];
  activeId: string;
  activeNumber: number | null;
  progressPct: number | null;
  poster: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // Auto-scroll ke episode aktif.
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
  }, [activeId]);

  return (
    <section aria-label="Daftar episode">
      <div
        ref={listRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ paddingLeft: 16, scrollPaddingLeft: 16, scrollbarWidth: "none" }}
      >
        {episodes.map((ep) => {
          const active = ep.episodeId === activeId;
          const watched =
            !active &&
            ep.number !== null &&
            activeNumber !== null &&
            ep.number < activeNumber;
          return (
            <Link
              key={ep.episodeId}
              ref={active ? activeRef : undefined}
              href={ep.href}
              aria-current={active ? "true" : undefined}
              aria-label={`Episode ${ep.label}${active ? " (sedang diputar)" : ""}`}
              className="relative block shrink-0 overflow-hidden"
              style={{
                width: 72,
                height: 56,
                borderRadius: 14,
                outline: active ? "2px solid var(--glacier)" : undefined,
                outlineOffset: -2,
                opacity: watched ? 0.45 : 1,
                background: "var(--surface)",
              }}
            >
              {poster ? (
                <Image
                  src={poster}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                  style={{ opacity: 0.55 }}
                />
              ) : null}
              <span
                className="font-display absolute inset-0 flex items-center justify-center text-[16px] font-bold"
                style={{ color: "var(--frost)", textShadow: "0 1px 4px rgba(0,0,0,.8)" }}
              >
                {ep.label}
              </span>
              {/* Garis progres 3px di bawah untuk episode aktif */}
              {active && progressPct !== null ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0"
                  style={{ height: 3, width: `${Math.min(100, Math.max(2, progressPct))}%`, background: "var(--glacier)" }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
