"use client";

import Image from "next/image";
import { useState } from "react";
import type { Portal } from "@/components/portal/portal-events";

/**
 * Langkah 5 onboarding (BARU): "Pilih Tontonan" — dua kartu besar ANIME
 * (live_tv) dan DONGHUA (auto_awesome), poster blur + gradient overlay,
 * animasi scale saat tap. Pilihan diteruskan ke parent (persist + lanjut
 * ke langkah 6 Masuk).
 */
export default function OnboardingPick({
  animePoster,
  donghuaPoster,
  onBack,
  onPick,
  pending,
}: {
  animePoster: string | null;
  donghuaPoster: string | null;
  onBack: () => void;
  onPick: (type: Portal) => void;
  pending: Portal | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-smooth active:scale-90"
        >
          <span className="material-symbols-rounded text-white" style={{ fontSize: 24 }}>
            arrow_back
          </span>
        </button>
      </div>

      <div className="onboard-step flex flex-1 flex-col justify-center gap-7 px-5 pb-10">
        <div className="text-center">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-white">Pilih Tontonan</h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-2)" }}>
            Kamu bisa mengganti pilihan ini kapan saja lewat tombol di header.
          </p>
        </div>

        <div className="space-y-4">
          <PickCard
            value="anime"
            title="Anime"
            subtitle="Anime Jepang · Sub Indo"
            icon="live_tv"
            poster={animePoster}
            accent="var(--blue)"
            overlay="linear-gradient(180deg, rgba(18,19,22,.35) 0%, rgba(18,19,22,.9) 75%, #121316 100%), linear-gradient(115deg, rgba(33,150,243,.4), rgba(33,150,243,0) 60%)"
            pending={pending}
            onPick={onPick}
          />
          <PickCard
            value="donghua"
            title="Donghua"
            subtitle="Anime China · Sub Indo"
            icon="auto_awesome"
            poster={donghuaPoster}
            accent="#D9535E"
            overlay="linear-gradient(180deg, rgba(18,19,22,.35) 0%, rgba(18,19,22,.9) 75%, #121316 100%), linear-gradient(115deg, rgba(122,26,34,.5), rgba(122,26,34,0) 60%)"
            pending={pending}
            onPick={onPick}
          />
        </div>
      </div>
    </div>
  );
}

function PickCard({
  value,
  title,
  subtitle,
  icon,
  poster,
  accent,
  overlay,
  pending,
  onPick,
}: {
  value: Portal;
  title: string;
  subtitle: string;
  icon: string;
  poster: string | null;
  accent: string;
  overlay: string;
  pending: Portal | null;
  onPick: (value: Portal) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const isPending = pending === value;
  const dimmed = pending !== null && !isPending;

  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      disabled={pending !== null}
      aria-label={`Pilih ${title}`}
      className="relative block w-full overflow-hidden rounded-card text-left transition-smooth"
      style={{
        height: 164,
        transform: isPending || pressed ? "scale(.97)" : undefined,
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
          style={{ filter: "blur(1px)" }}
        />
      ) : null}
      <span aria-hidden="true" className="absolute inset-0" style={{ background: overlay }} />
      <span className="relative flex h-full flex-col justify-end p-5">
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip" style={{ background: accent }}>
            <span className="material-symbols-rounded text-white" style={{ fontSize: 24 }}>
              {icon}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-display block text-[19px] font-bold leading-tight text-white">{title}</span>
            <span className="block text-[12px]" style={{ color: "var(--text-2)" }}>
              {subtitle}
            </span>
          </span>
          {isPending ? (
            <span className="material-symbols-rounded animate-spin text-white" style={{ fontSize: 22 }} aria-label="Memuat">
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: accent }} aria-hidden="true">
              arrow_forward
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
