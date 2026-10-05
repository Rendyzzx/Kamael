"use client";

/**
 * Player embed (iframe pihak ketiga: vidhide, ok.ru, dst).
 *
 * Kontrol transport sendiri TIDAK dibuat — player pihak ketiga tidak bisa
 * dikendalikan. Sebagai gantinya, bar tipis 40px di atas iframe (dalam
 * container player): [<-] "Episode N" [->] [⚙].
 *
 * Deteksi gagal: tidak ada event load dalam 12 dtk → pindah otomatis ke
 * server berikutnya di kualitas sama. Setelah 8 dtk tampil tautan "Tidak bisa
 * diputar? Ganti server" agar pengguna bisa memicu perpindahan manual.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSourcesApi } from "@/lib/player/usePlayerSources";

const LOAD_TIMEOUT_MS = 12_000;
const HINT_DELAY_MS = 8_000;

export default function EmbedPlayerV2({
  api,
  url,
  episodeShortLabel,
  prevHref,
  nextHref,
  onOpenSettings,
}: {
  api: PlayerSourcesApi;
  url: string | null;
  episodeShortLabel: string;
  prevHref: string | null;
  nextHref: string | null;
  onOpenSettings: () => void;
}) {
  const [hint, setHint] = useState(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(false);
  }, []);

  // Mulai penghitung tiap kali URL iframe berganti (server/kualitas/episode).
  useEffect(() => {
    if (!url) return;
    clearTimers();
    hintTimerRef.current = setTimeout(() => setHint(true), HINT_DELAY_MS);
    loadTimerRef.current = setTimeout(() => {
      const src = api.activeSource;
      if (src) api.markFailed(src);
    }, LOAD_TIMEOUT_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const barBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-35";
  const barBtnStyle = { color: "var(--frost)" } as const;

  return (
    <div className="absolute inset-0">
      {/* Bar atas iframe: prev / label episode / next / pengaturan — simetris,
          gradient tipis (bukan panel solid) agar tidak terasa "menumpuk"
          dengan kontrol bawaan server pihak ketiga di dalam iframe. */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex shrink-0 items-center"
        style={{
          height: 44,
          background: "linear-gradient(180deg, rgba(13,19,32,.85), transparent)",
        }}
      >
        {prevHref ? (
          <Link href={prevHref} aria-label="Episode sebelumnya" className={barBtn} style={barBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>skip_previous</span>
          </Link>
        ) : (
          <button type="button" disabled aria-disabled="true" aria-label="Episode sebelumnya" className={barBtn} style={barBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>skip_previous</span>
          </button>
        )}
        <p className="flex-1 truncate px-1 text-center text-[13px] font-semibold" style={{ color: "var(--frost)" }}>
          {episodeShortLabel}
        </p>
        {nextHref ? (
          <Link href={nextHref} aria-label="Episode berikutnya" className={barBtn} style={barBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>skip_next</span>
          </Link>
        ) : (
          <button type="button" disabled aria-disabled="true" aria-label="Episode berikutnya" className={barBtn} style={barBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>skip_next</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Pengaturan pemutar"
          className={barBtn}
          style={barBtnStyle}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>settings</span>
        </button>
      </div>

      {/* Iframe embed — mengisi seluruh area 16:9; bar atas melayang di atasnya */}
      <div className="absolute inset-0 bg-black">
        {url ? (
          <iframe
            key={url}
            src={url}
            title={`Pemutar ${episodeShortLabel}`}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={clearTimers}
          />
        ) : null}
      </div>

      {/* Tautan manual bila server terasa macet */}
      {url && hint ? (
        <button
          type="button"
          onClick={() => {
            const src = api.activeSource;
            if (src) api.markFailed(src);
          }}
          className="absolute bottom-3 right-3 z-20 rounded-pill px-3 py-1.5 text-[12px] font-semibold"
          style={{ background: "rgba(13,19,32,.85)", border: "1px solid var(--deep-2)", color: "var(--glacier)" }}
        >
          Tidak bisa diputar? Ganti server
        </button>
      ) : null}
    </div>
  );
}
