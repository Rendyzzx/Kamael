"use client";

/**
 * Bagian-bagian bersama antara mode player native (<video>) dan mode embed
 * (iframe): pil status non-blokir, overlay error buatan, spinner, toast.
 */
import type { QualityGroup } from "@/types/player";
import { qualityLabel, qualityNumber } from "@/lib/player/sources";

/** Pil status non-blokir di atas player ("Server vidhide gagal. Mencoba mega (720p)…"). */
export function StatusPill({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-pill px-3.5 py-2 text-[13px]"
      style={{ background: "rgba(13,19,32,0.88)", border: "1px solid var(--deep-2)", color: "var(--frost)" }}
    >
      <i
        className="block h-3.5 w-3.5 shrink-0 rounded-full"
        style={{
          border: "2px solid rgba(143,211,232,.3)",
          borderTopColor: "var(--glacier)",
          animation: "player-spin .8s linear infinite",
        }}
        aria-hidden="true"
      />
      <span className="truncate">{message}</span>
    </div>
  );
}

/** Overlay error buatan sendiri: poster buram + frost, tombol Coba lagi / kualitas lain. */
export function ErrorOverlay({
  quality,
  groups,
  poster,
  onRetry,
  onUseQuality,
  onReport,
}: {
  quality: string;
  groups: QualityGroup[];
  poster: string | null;
  onRetry: () => void;
  onUseQuality: (quality: string) => void;
  onReport: () => void;
}) {
  // Kualitas terdekat di bawah yang masih punya server (untuk "Pakai 480p").
  const qn = qualityNumber(quality) ?? 0;
  const lower = groups
    .filter((g) => (qualityNumber(g.quality) ?? 0) < qn && g.sources.length > 0)
    .sort((a, b) => (qualityNumber(b.quality) ?? 0) - (qualityNumber(a.quality) ?? 0))[0];

  return (
    <div
      role="alert"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-5 text-center"
      style={{ background: "rgba(13,19,32,0.72)", backdropFilter: "blur(14px)" }}
    >
      {poster ? (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${poster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(22px) brightness(.35) saturate(.8)",
            transform: "scale(1.1)",
          }}
        />
      ) : null}
      <div className="relative flex flex-col items-center gap-2">
        <h2 className="font-display text-[19px] font-semibold" style={{ color: "var(--frost)" }}>
          Semua server {qualityLabel(quality)} gagal dimuat
        </h2>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Coba lagi, atau pakai kualitas yang masih tersedia.
        </p>
      </div>
      <div className="relative flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill px-5 text-[14px] font-bold"
          style={{ height: 38, background: "var(--frost)", color: "var(--ink)" }}
        >
          Coba lagi
        </button>
        {lower ? (
          <button
            type="button"
            onClick={() => onUseQuality(lower.quality)}
            className="rounded-pill px-5 text-[14px] font-semibold"
            style={{ height: 38, border: "1px solid var(--deep-2)", color: "var(--frost)" }}
          >
            Pakai {qualityLabel(lower.quality)}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onReport}
        className="relative text-[13px] underline underline-offset-2"
        style={{ color: "var(--glacier)" }}
      >
        Lapor video rusak
      </button>
    </div>
  );
}

/** Spinner kecil di tengah player (resolving server / buffering). */
export function CenterSpinner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-label="Memuat"
      className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
    >
      <i
        className="block h-9 w-9 rounded-full"
        style={{
          border: "3px solid rgba(234,246,250,.2)",
          borderTopColor: "var(--glacier)",
          animation: "player-spin .8s linear infinite",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Toast global (fallback kualitas, laporan terkirim, dsb). */
export function PlayerToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-[70] w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl px-4 py-2.5 text-center text-[14px] font-medium"
      style={{ background: "var(--frost)", color: "var(--ink)" }}
    >
      {message}
    </div>
  );
}
