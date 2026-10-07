"use client";

import type { ReactNode } from "react";

/*
 * Ilustrasi senja sederhana untuk carousel onboarding (revisi Okt 2026):
 * SVG inline menggantikan gambar webp generik — gaya konsisten (matahari
 * rendah, kabel listrik, siluet gedung), palet violet/mawar/emas lembut,
 * nol request jaringan dan nol decode gambar.
 */

const C = {
  gold: "#E8B66B",
  rose: "#C97B84",
  violet: "#6C5B8F",
  peach: "#F2C9A0",
  ink: "#2A1B25",
};

function Scene({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 160" width="240" height="160" aria-hidden="true">
      {/* langit senja: transisi nada halus */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.violet} stopOpacity={0.5} />
          <stop offset="0.55" stopColor={C.rose} stopOpacity={0.55} />
          <stop offset="1" stopColor={C.gold} stopOpacity={0.75} />
        </linearGradient>
      </defs>
      <rect width="240" height="160" rx="16" fill="#3A2833" />
      <rect width="240" height="160" rx="16" fill="url(#sky)" />
      {children}
      {/* siluet tanah */}
      <path d="M0 132 C40 124 70 128 108 126 C160 123 200 130 240 125 L240 160 L0 160 Z" fill={C.ink} opacity={0.9} />
    </svg>
  );
}

function Sun({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={17} fill={C.gold} opacity={0.9} />
      <circle cx={cx} cy={cy} r={26} fill={C.gold} opacity={0.18} />
    </>
  );
}

function PowerLines() {
  return (
    <g stroke={C.ink} strokeWidth="2" opacity="0.85" fill="none">
      <path d="M-4 60 C 60 74 180 50 244 66" />
      <path d="M-4 76 C 60 90 180 66 244 82" />
      <path d="M30 55 L30 76 M210 52 L210 70" />
      <circle cx="30" cy="67" r="2.6" fill={C.ink} />
      <circle cx="210" cy="63" r="2.6" fill={C.ink} />
    </g>
  );
}

function CitySilhouette() {
  return (
    <g fill={C.ink} opacity={0.95}>
      <rect x="10" y="102" width="26" height="30" rx="2" />
      <rect x="42" y="112" width="18" height="20" rx="2" />
      <rect x="188" y="108" width="24" height="24" rx="2" />
      <rect x="216" y="100" width="20" height="32" rx="2" />
      {/* jendela menyala emas */}
      <g fill={C.gold} opacity={0.7}>
        <rect x="15" y="108" width="4" height="5" rx="1" />
        <rect x="23" y="116" width="4" height="5" rx="1" />
        <rect x="193" y="114" width="4" height="5" rx="1" />
        <rect x="222" y="106" width="4" height="5" rx="1" />
        <rect x="230" y="118" width="4" height="5" rx="1" />
      </g>
    </g>
  );
}

/* Slide 1: lanjut tontonan — matahari + garis progres episode. */
function SceneResume() {
  return (
    <Scene>
      <Sun cx={186} cy={78} />
      <PowerLines />
      {/* kartu episode + garis progres */}
      <g>
        <rect x="34" y="52" width="86" height="52" rx="8" fill={C.ink} opacity={0.9} />
        <circle cx={77} cy={72} r={9} fill="none" stroke={C.gold} strokeWidth="2" />
        <path d="M74 67 L83 72 L74 77 Z" fill={C.gold} />
        <rect x="44" y="90" width="66" height="5" rx="2.5" fill={C.ink} opacity={0.8} />
        <rect x="44" y="90" width="40" height="5" rx="2.5" fill={C.peach} />
      </g>
      <CitySilhouette />
    </Scene>
  );
}

/* Slide 2: simpan serial — lonceng notifikasi di kabel listrik. */
function SceneSubscribe() {
  return (
    <Scene>
      <Sun cx={52} cy={70} />
      <PowerLines />
      {/* bookmark di tengah langit */}
      <g>
        <path
          d="M108 44 h26 a6 6 0 0 1 6 6 v34 c0 4.6-5.2 7-8.6 4.4 L129.6 79 l-8 9.4 c-3.4 2.6-8.6.2-8.6-4.4 v-34 a6 6 0 0 1 6-6 z"
          transform="translate(0,-6)"
          fill={C.ink}
          opacity={0.92}
        />
        <path d="M124 58 v18 M118 62 l6 -6 6 6" stroke={C.peach} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <CitySilhouette />
    </Scene>
  );
}

/* Slide 3: dua portal — dua jendela tv (anime & donghua). */
function ScenePortals() {
  return (
    <Scene>
      <Sun cx={120} cy={44} />
      <CitySilhouette />
      {/* dua layar kecil bersisian */}
      <g>
        <rect x="36" y="66" width="74" height="48" rx="8" fill={C.ink} opacity={0.92} />
        <rect x="130" y="66" width="74" height="48" rx="8" fill={C.ink} opacity={0.92} />
        <rect x="43" y="73" width="60" height="34" rx="5" fill={C.rose} opacity={0.75} />
        <rect x="137" y="73" width="60" height="34" rx="5" fill={C.violet} opacity={0.85} />
        <path d="M62 88 l8 -9 7 6 6 -9 9 12" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M156 84 l6 6 12 -13" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </Scene>
  );
}

interface Slide {
  key: string;
  title: string;
  description: string;
  art: ReactNode;
}

/* Copy konkret: sebut apa yang bisa DILAKUKAN user — tanpa klaim generik
   ("terlengkap", "cepat, ringan dan rapi") dan tanpa pisah panjang. */
const SLIDES: Slide[] = [
  {
    key: "resume",
    title: "Lanjut dari terakhir kali",
    description: "Episode yang kamu tonton tercatat otomatis. Buka lagi kapan saja dan lanjut dari detik terakhir.",
    art: <SceneResume />,
  },
  {
    key: "subscribe",
    title: "Simpan serial favorit",
    description: "Subscribe Series menyimpan serial yang kamu ikuti, episode barunya terkumpul di satu daftar.",
    art: <SceneSubscribe />,
  },
  {
    key: "portals",
    title: "Anime dan donghua, satu tempat",
    description: "Pilih tontonan utama kamu di langkah berikutnya. Bisa diganti kapan saja dari tombol portal.",
    art: <ScenePortals />,
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
        {slide.art}
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
