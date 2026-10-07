"use client";

import Image from "next/image";
import { useState } from "react";
import type { Portal } from "@/components/portal/portal-events";

/**
 * Langkah 5 onboarding: "Pilih Tontonan".
 *
 * Komposisi (revisi Okt 2026 — mengganti pola lama "kotak ikon berwarna +
 * judul + subjudul + panah"): poster penuh sebagai latar kartu, tipografi
 * display besar menimpa poster, sudut asimetris, tanpa panah. Kartu tanpa
 * poster memakai gradasi senja (violet ke mawar) supaya kedua kartu selalu
 * terlihat selesai. Maskot Airin mengisi ruang di bagian bawah.
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
      <div className="flex items-center justify-between px-5 pt-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-smooth active:scale-90"
          style={{ color: "var(--text-2)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>
            arrow_back
          </span>
        </button>
      </div>

      <div className="onboard-step flex flex-1 flex-col justify-center gap-6 px-5 pb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-[var(--text)]">
            Pilih tontonan kamu
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "var(--text-2)" }}>
            Bisa diganti kapan saja lewat tombol portal di header.
          </p>
        </div>

        <div className="space-y-4">
          <PickCard
            value="anime"
            title="Anime"
            subtitle="Serial Jepang, sub Indonesia"
            poster={animePoster}
            pending={pending}
            onPick={onPick}
          />
          <PickCard
            value="donghua"
            title="Donghua"
            subtitle="Serial China, sub Indonesia"
            poster={donghuaPoster}
            pending={pending}
            onPick={onPick}
          />
        </div>

        {/* Airin mengisi ruang kosong bawah, sekaligus penanda ramah. */}
        <div className="flex items-center justify-center gap-3 pt-1" aria-hidden="true">
          <div className="relative" style={{ width: 76, height: 76 }}>
            <Image src="/mascot/airin.webp" alt="" fill sizes="76px" className="object-contain object-bottom" />
          </div>
          <p className="text-[12px] leading-snug" style={{ color: "var(--text-2)", maxWidth: 170 }}>
            Nggak pakai lama, kok. Airin tungguin kamu di dalam.
          </p>
        </div>
      </div>
    </div>
  );
}

function PickCard({
  value,
  title,
  subtitle,
  poster,
  pending,
  onPick,
}: {
  value: Portal;
  title: string;
  subtitle: string;
  poster: string | null;
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
      className="relative block w-full overflow-hidden text-left transition-smooth"
      style={{
        height: 168,
        // Sudut tidak seragam (asimetris) — kartu terasa digambar tangan.
        borderRadius: "22px 26px 20px 24px",
        transform: isPending || pressed ? "scale(.97)" : undefined,
        opacity: dimmed ? 0.55 : 1,
        background: poster ? "var(--surface)" : "var(--surface)",
      }}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
          style={{ objectPosition: "right top" }}
        />
      ) : (
        // Fallback tanpa poster: gradasi senja violet -> mawar + bintang kecil.
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, var(--violet) 0%, var(--sunset) 100%)",
          }}
        />
      )}
      {/* Kabut bawah: poster memudar ke nada dusk, teks tetap terbaca. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "72%",
          background: "linear-gradient(180deg, rgba(51,35,45,0) 0%, rgba(51,35,45,.66) 55%, rgba(51,35,45,.96) 100%)",
        }}
      />
      {/* Tipografi display besar menimpa poster; tanpa ikon, tanpa panah. */}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-5">
        <span className="font-display text-[26px] font-bold leading-none tracking-tight text-[var(--text)]">
          {title}
        </span>
        <span className="text-[12.5px]" style={{ color: "var(--peach)" }}>
          {subtitle}
        </span>
        {isPending ? (
          <span
            className="material-symbols-rounded animate-spin"
            style={{ fontSize: 20, color: "var(--amber)", marginTop: 4 }}
            aria-label="Memuat"
          >
            progress_activity
          </span>
        ) : null}
      </span>
    </button>
  );
}
