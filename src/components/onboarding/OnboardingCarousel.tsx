"use client";

import Image from "next/image";

/*
 * Carousel onboarding (revisi Okt 2026): kembali ke konsep lama —
 * maskot Airin yang menjelaskan fitur, tapi digambar ulang dengan
 * palet senja (plum, violet, mawar, emas lembut). Ilustrasi webp
 * kecil (±560px) supaya decode ringan di HP kelas menengah.
 */

interface Slide {
  key: string;
  title: string;
  description: string;
  art: string;
}

/* Copy konkret: sebut apa yang bisa DILAKUKAN user — tanpa klaim generik
   ("terlengkap", "cepat, ringan dan rapi") dan tanpa pisah panjang. */
const SLIDES: Slide[] = [
  {
    key: "resume",
    title: "Lanjut dari terakhir kali",
    description: "Episode yang kamu tonton tercatat otomatis. Buka lagi kapan saja dan lanjut dari detik terakhir.",
    art: "/onboarding/feature-resume.webp",
  },
  {
    key: "subscribe",
    title: "Simpan serial favorit",
    description: "Subscribe Series menyimpan serial yang kamu ikuti, episode barunya terkumpul di satu daftar.",
    art: "/onboarding/feature-subscribe.webp",
  },
  {
    key: "portals",
    title: "Anime dan donghua, satu tempat",
    description: "Pilih tontonan utama kamu di langkah berikutnya. Bisa diganti kapan saja dari tombol portal.",
    art: "/onboarding/feature-portals.webp",
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
          style={{ color: "var(--text-2)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 24 }}>
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

      <div key={slide.key} className="onboard-step flex flex-1 flex-col items-center justify-center gap-8 px-7 text-center">
        {/* Tanpa kotak/bingkai: webp transparan, Airin melayang langsung di latar.
            Wadah tinggi tetap supaya judul tidak loncat antar slide. */}
        <div className="relative h-[280px] w-full max-w-[320px]">
          <Image
            src={slide.art}
            alt={`Airin menjelaskan: ${slide.title}`}
            fill
            sizes="320px"
            priority
            className="object-contain object-bottom drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          />
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-[24px] font-bold tracking-tight text-[var(--text)]">{slide.title}</h1>
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
          style={{ background: "var(--amber)", color: "var(--ink-warm)", boxShadow: "var(--shadow-warm)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 26 }}>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

export const ONBOARDING_SLIDE_COUNT = SLIDES.length;
