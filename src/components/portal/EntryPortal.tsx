"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Portal } from "./portal-events";

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Portal pembuka fullscreen (hanya di "/"): dua kartu besar Anime & Donghua.
 * - Fullscreen: bottom nav + FAB settings disembunyikan layout di route "/".
 * - Pilihan disimpan ke Redis (pref:{id}) lewat POST /api/preference —
 *   identitas diurus server (user login / cookie visitor httpOnly).
 * - Navigasi tetap lanjut WALAU Redis gagal (fallback aman).
 * - Kartu: poster latar + gradient overlay, fade-in saat muncul, scale saat
 *   tap, dan spinner saat preferensi sedang dikirim.
 */
export default function EntryPortal({
  animePoster,
  donghuaPoster,
}: {
  animePoster: string | null;
  donghuaPoster: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Portal | null>(null);

  async function choose(value: Portal) {
    if (pending) return;
    setPending(value);
    try {
      await fetch("/api/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Redis/jaringan gagal → biarkan; tetap navigasi (fallback aman).
    }
    // Home ("/") = dashboard trending sesuai portal yang baru dipilih.
    router.push("/");
  }

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{
        maxWidth: 480,
        minWidth: 360,
        marginInline: "auto",
        background:
          "radial-gradient(120% 40% at 50% 0%, rgba(33,150,243,.16), transparent 70%), var(--bg)",
      }}
    >
      <div className="flex min-h-full flex-col justify-center gap-8 px-5 py-10">
        {/* Logo + ajakan */}
        <div className="portal-fade-in text-center">
          <div className="font-display flex items-center justify-center gap-2 text-[26px] font-bold tracking-tight text-white">
            <span className="material-symbols-rounded" style={{ fontSize: 28, color: "var(--blue)" }}>
              movie
            </span>
            Cyro<span style={{ color: "var(--blue)" }}>nime</span>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: "var(--text-2)" }}>
            Mau nonton apa hari ini?
          </p>
        </div>

        {/* Dua kartu besar, ditumpuk di mobile */}
        <div className="space-y-4">
          <PortalCard
            value="anime"
            title="Anime"
            subtitle="Anime Jepang · Sub Indo"
            icon="live_tv"
            poster={animePoster}
            overlay="linear-gradient(180deg, rgba(18,19,22,.25) 0%, rgba(18,19,22,.82) 72%, #121316 100%), linear-gradient(115deg, rgba(33,150,243,.42), rgba(33,150,243,0) 62%)"
            accent="var(--blue)"
            pending={pending}
            delayMs={80}
            onChoose={choose}
          />
          <PortalCard
            value="donghua"
            title="Donghua"
            subtitle="Anime China · Sub Indo"
            icon="auto_awesome"
            poster={donghuaPoster}
            overlay="linear-gradient(180deg, rgba(18,19,22,.25) 0%, rgba(18,19,22,.82) 72%, #121316 100%), linear-gradient(115deg, rgba(122,26,34,.55), rgba(122,26,34,0) 62%)"
            accent="#D9535E"
            pending={pending}
            delayMs={160}
            onChoose={choose}
          />
        </div>
      </div>
    </div>
  );
}

function PortalCard({
  value,
  title,
  subtitle,
  icon,
  poster,
  overlay,
  accent,
  pending,
  delayMs,
  onChoose,
}: {
  value: Portal;
  title: string;
  subtitle: string;
  icon: string;
  poster: string | null;
  overlay: string;
  accent: string;
  pending: Portal | null;
  delayMs: number;
  onChoose: (value: Portal) => void;
}) {
  const isPending = pending === value;
  const dimmed = pending !== null && !isPending;

  return (
    <div className="portal-fade-in" style={{ animationDelay: `${delayMs}ms` }}>
      <button
        type="button"
        onClick={() => onChoose(value)}
        disabled={pending !== null}
        aria-label={`Masuk ke ${title}`}
        className="relative block w-full overflow-hidden rounded-card text-left transition-smooth active:scale-[.98]"
        style={{
          height: 188,
          transform: isPending ? "scale(.97)" : undefined,
          opacity: dimmed ? 0.55 : 1,
          background: "var(--surface)",
        }}
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover"
            priority={value === "anime"}
          />
        ) : null}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: overlay }} />
        <span className="relative flex h-full flex-col justify-end p-5">
          <span className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip"
              style={{ background: accent }}
            >
              <span className="material-symbols-rounded text-white" style={{ fontSize: 24 }}>
                {icon}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[20px] font-bold leading-tight text-white">
                {title}
              </span>
              <span className="block text-[12px]" style={{ color: "var(--text-2)" }}>
                {subtitle}
              </span>
            </span>
            {isPending ? (
              <span
                className="material-symbols-rounded animate-spin text-white"
                style={{ fontSize: 24 }}
                aria-label="Memuat"
              >
                progress_activity
              </span>
            ) : (
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 24, color: accent }}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}
