"use client";

import Image from "next/image";

interface Slide {
  key: string;
  image: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    key: "highlights",
    image: "/onboarding/feature-highlights.png",
    title: "Fitur Unggulan",
    description: "Koleksi anime dan donghua terlengkap, update episode cepat, tampilan ringan dan rapi.",
  },
  {
    key: "watch-download",
    image: "/onboarding/feature-watch-download.png",
    title: "Nonton & Unduh",
    description: "Streaming langsung lewat beberapa server pilihan, atau unduh episode untuk ditonton offline.",
  },
  {
    key: "subscribe",
    image: "/onboarding/feature-subscribe.png",
    title: "Subscribe Series",
    description: "Fitur Subscribe Series memungkinkan kamu untuk menerima info dan notifikasi update terbaru berdasarkan episode.",
  },
];

/**
 * Langkah 4 onboarding: carousel 3 slide. Kontrol back(kiri atas)/
 * Skip(kanan atas)/dot indikator/tombol next bulat. Mendukung swipe
 * (touch) selain tombol next. Skip -> langsung ke langkah 5 (pick portal),
 * ditangani oleh parent lewat onSkip.
 */
export default function OnboardingCarousel({
  index,
  onBack,
  onNext,
  onSkip,
  onDotSelect,
}: {
  index: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onDotSelect: (i: number) => void;
}) {
  const slide = SLIDES[index];
  const touchStartX = { current: 0 };
  const touchDeltaX = { current: 0 };
  const SWIPE_THRESHOLD = 48;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }
  function handleTouchEnd() {
    if (touchDeltaX.current <= -SWIPE_THRESHOLD) onNext();
    else if (touchDeltaX.current >= SWIPE_THRESHOLD) onBack();
    touchDeltaX.current = 0;
  }

  return (
    <div
      className="flex h-full flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header: back kiri, Skip kanan */}
      <div className="flex items-center justify-between px-5 pt-6">
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
        <button
          type="button"
          onClick={onSkip}
          className="text-[14px] font-semibold transition-smooth active:scale-95"
          style={{ color: "var(--text-2)" }}
        >
          Skip
        </button>
      </div>

      <div key={slide.key} className="onboard-step flex flex-1 flex-col items-center justify-center gap-10 px-7 text-center">
        <div className="relative" style={{ width: 240, height: 240 }}>
          <Image src={slide.image} alt="" fill sizes="240px" className="object-contain" priority />
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-white">{slide.title}</h1>
          <p className="mx-auto max-w-[320px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {slide.description}
          </p>
        </div>
      </div>

      {/* Dot indikator + tombol next bulat */}
      <div className="flex flex-col items-center gap-7 pb-12">
        <div className="flex items-center gap-2" role="tablist" aria-label="Slide fitur">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${s.title}`}
              onClick={() => onDotSelect(i)}
              className={`onboard-dot ${i === index ? "active" : ""}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label={index === SLIDES.length - 1 ? "Lanjut ke pilih tontonan" : "Slide berikutnya"}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-smooth active:scale-90"
          style={{ background: "var(--blue-grad)" }}
        >
          <span className="material-symbols-rounded text-white" style={{ fontSize: 26 }}>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

export const ONBOARDING_SLIDE_COUNT = SLIDES.length;
