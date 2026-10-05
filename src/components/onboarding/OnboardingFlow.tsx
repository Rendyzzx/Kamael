"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Portal } from "@/components/portal/portal-events";
import { writeMirror } from "@/lib/onboarding-mirror";
import OnboardingCarousel, { ONBOARDING_SLIDE_COUNT } from "./OnboardingCarousel";
import OnboardingPick from "./OnboardingPick";
import OnboardingSignIn from "./OnboardingSignIn";

type Step = "splash" | "disclaimer" | "declined" | "intro" | "carousel" | "pick" | "signin";

const SPLASH_DURATION_MS = 2_000;
const API_TIMEOUT_MS = 5_000;

export interface OnboardingInitialState {
  accepted: boolean;
  completed: boolean;
  type: Portal | null;
}

/**
 * State machine onboarding ala aplikasi native: Splash -> Disclaimer ->
 * Intro maskot -> Carousel fitur -> LOGIN (Google, WAJIB — tidak ada tamu)
 * -> Pilih Tontonan -> selesai. Login selalu datang SEBELUM pilihan
 * anime/donghua, seperti onboarding aplikasi pada umumnya.
 *
 * Dimount oleh "/" HANYA ketika onboarding belum selesai (completed && type
 * belum terpenuhi) — lihat src/app/page.tsx. Checkpoint penting (accept,
 * type+completed) di-POST ke /api/onboarding (Redis); kegagalan
 * jaringan/Redis tidak pernah menghalangi progres LOKAL.
 *
 * Resume: user yang SUDAH login (prop `authed`) tidak pernah melihat lagi
 * splash/intro/carousel/signin — langsung mendarat di step yang relevan
 * (disclaimer bila belum accept, atau Pilih Tontonan bila sudah).
 */
export default function OnboardingFlow({
  initial,
  authed,
  animePoster,
  donghuaPoster,
}: {
  initial: OnboardingInitialState;
  authed: boolean;
  animePoster: string | null;
  donghuaPoster: string | null;
}) {
  const router = useRouter();
  const resumeStep: Step = useMemo(() => {
    if (authed) return initial.accepted ? "pick" : "disclaimer";
    return initial.accepted ? "intro" : "splash";
  }, [initial, authed]);

  const [step, setStep] = useState<Step>(resumeStep);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [pickPending, setPickPending] = useState<Portal | null>(null);

  // Step/kondisi terkini untuk handler popstate (stale closure safe).
  const stepRef = useRef(step);
  const carouselRef = useRef(carouselIndex);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    carouselRef.current = carouselIndex;
  }, [carouselIndex]);

  // JEBATAN TOMBOL BACK (bugfix): langkah onboarding TIDAK menulis history,
  // jadi tombol back fisik Android / swipe-back iOS dulunya mundur ke entri
  // history lama (bisa "teleport" user ke halaman anime dengan onboarding
  // belum selesai, lalu nyangkut di sana). Solusi: selama onboarding aktif,
  // push sentinel ke stack history dan tafsirkan popstate sebagai "mundur
  // satu langkah onboarding" (perilaku aplikasi native), bukan keluar.
  useEffect(() => {
    const SENTINEL = { cyronimeOnboarding: true };
    history.pushState(SENTINEL, "");

    function goBackOneStep() {
      const s = stepRef.current;
      if (s === "carousel") {
        if (carouselRef.current > 0) setCarouselIndex((i) => Math.max(0, i - 1));
        else setStep("intro");
      } else if (s === "intro") {
        setStep("disclaimer");
      } else if (s === "pick" || s === "signin") {
        setStep("carousel");
        setCarouselIndex(ONBOARDING_SLIDE_COUNT - 1);
      } else if (s === "declined") {
        setStep("disclaimer");
      }
      // splash & disclaimer: tidak ada langkah sebelumnya -> tetap di tempat.
    }

    function onPopState() {
      // Back "ditelan": kembalikan sentinel ke puncak stack supaya stack
      // tidak habis (mencegah exit tak sengaja di tengah onboarding),
      // lalu jalankan mundur satu langkah.
      history.pushState(SENTINEL, "");
      goBackOneStep();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Buang sentinel dari stack supaya tombol back SETELAH onboarding
      // selesai tidak "nyangkut" sekali. history.back() ke entri "/" yang
      // sama: same-document navigation, tidak ada reload/flash.
      history.back();
    };
  }, []);

  // Langkah 1 Splash: auto-advance 2 detik. Hanya berjalan bila memang
  // start dari splash (resume tidak pernah mendarat di sini).
  useEffect(() => {
    if (step !== "splash") return;
    const t = setTimeout(() => setStep("disclaimer"), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [step]);

  // Sinkronkan mirror localStorage dengan state server saat flow muncul
  // (server adalah sumber kebenaran saat Redis sehat; mirror dipakai
  // hanya sebagai fallback saat Redis down — lihat OnboardingGate).
  useEffect(() => {
    writeMirror({ accepted: initial.accepted, completed: initial.completed, type: initial.type });
  }, [initial.accepted, initial.completed, initial.type]);

  async function patchOnboarding(body: Partial<{ accepted: boolean; type: Portal; completed: boolean }>) {
    // Mirror selalu ditulis DULU: progres perangkat tetap tercatat walau
    // Redis down/fetch gagal (gerbang "/" memakai mirror saat redisOk=false).
    writeMirror(body);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch {
      // Fallback aman: progres lokal tetap lanjut walau gagal tersimpan.
    }
  }

  function handleAccept() {
    void patchOnboarding({ accepted: true });
    setStep("intro");
  }

  function handleCarouselNext() {
    if (carouselIndex < ONBOARDING_SLIDE_COUNT - 1) setCarouselIndex((i) => i + 1);
    else setStep(authed ? "pick" : "signin");
  }

  function handleCarouselBack() {
    if (carouselIndex > 0) setCarouselIndex((i) => i - 1);
    else setStep("intro");
  }

  // Pilih Tontonan adalah LANGKAH TERAKHIR: pilihan = onboarding selesai.
  async function handlePick(type: Portal) {
    setPickPending(type);
    await patchOnboarding({ type, completed: true });
    setPickPending(null);
    // "/" di-refresh -> gerbang server melihat completed && type -> dashboard.
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[95] overflow-y-auto"
      style={{ maxWidth: 480, minWidth: 360, marginInline: "auto", background: "var(--bg)" }}
    >
      {step === "splash" ? <OnboardingSplash /> : null}
      {step === "disclaimer" ? (
        <OnboardingDisclaimer onAccept={handleAccept} onDecline={() => setStep("declined")} />
      ) : null}
      {step === "declined" ? <OnboardingDeclined onBack={() => setStep("disclaimer")} /> : null}
      {step === "intro" ? <OnboardingIntro onStart={() => setStep("carousel")} /> : null}
      {step === "carousel" ? (
        <OnboardingCarousel
          index={carouselIndex}
          onBack={handleCarouselBack}
          onNext={handleCarouselNext}
          onSkip={() => setStep(authed ? "pick" : "signin")}
          onDotSelect={setCarouselIndex}
        />
      ) : null}
      {step === "pick" ? (
        <OnboardingPick
          animePoster={animePoster}
          donghuaPoster={donghuaPoster}
          onBack={() => {
            setStep("carousel");
            setCarouselIndex(ONBOARDING_SLIDE_COUNT - 1);
          }}
          onPick={handlePick}
          pending={pickPending}
        />
      ) : null}
      {step === "signin" ? (
        authed ? (
          // Safety net: state signin + sudah login tidak terjadi pada resume
          // normal — kalau terjadi, lompat langsung ke pilihan tontonan.
          <OnboardingPick
            animePoster={animePoster}
            donghuaPoster={donghuaPoster}
            onBack={() => setStep("carousel")}
            onPick={handlePick}
            pending={pickPending}
          />
        ) : (
          <OnboardingSignIn />
        )
      ) : null}
    </div>
  );
}

/* ---------- Langkah 1: Splash ---------- */
function OnboardingSplash() {
  return (
    <div className="onboard-step flex h-full flex-col items-center justify-center gap-7 px-8 text-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <Image src="/mascot/senja-rimlight.webp" alt="" fill sizes="160px" className="object-contain" priority />
      </div>
      <h1 className="font-display text-[22px] font-bold text-white">Selamat datang di senja</h1>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="onboard-loading-dot" style={{ animationDelay: "0ms" }} />
        <span className="onboard-loading-dot" style={{ animationDelay: "150ms" }} />
        <span className="onboard-loading-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

/* ---------- Langkah 2: Disclaimer ---------- */
function OnboardingDisclaimer({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      <div
        className="onboard-step grain relative w-full max-w-[360px] rounded-card p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid rgba(245,160,46,.16)",
          boxShadow: "var(--shadow-warm)",
        }}
      >
        <h1 className="font-display text-center text-[20px] font-bold text-white">Disclaimer</h1>
        <p className="mt-3 text-center text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Cyronime adalah situs streaming TIDAK RESMI dan tidak berafiliasi dengan studio, penerbit,
          atau pemegang lisensi mana pun. Seluruh hak cipta konten (anime, donghua, gambar, dan
          judul) tetap menjadi milik pemiliknya masing-masing. Lanjutkan hanya jika kamu memahami
          dan menyetujui hal ini.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button type="button" onClick={onAccept} className="btn btn-primary w-full">
            Setuju, lanjut
          </button>
          <button type="button" onClick={onDecline} className="btn btn-decline w-full">
            Nggak dulu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Decline: info layar tidak bisa dipakai ---------- */
function OnboardingDeclined({ onBack }: { onBack: () => void }) {
  return (
    <div className="onboard-step flex h-full flex-col items-center justify-center gap-5 px-7 text-center">
      <div className="relative" style={{ width: 150, height: 170 }}>
        <Image src="/mascot/senja-rimlight.webp" alt="" fill sizes="150px" className="object-contain" />
      </div>
      <h1 className="font-display text-[20px] font-bold text-white">Belum bisa lanjut</h1>
      <p className="max-w-[300px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Cyronime hanya bisa dipakai kalau kamu menyetujui disclaimernya. Baca
        sekali lagi, kamu bisa setuju di bawahnya.
      </p>
      <button type="button" onClick={onBack} className="btn btn-primary">
        Baca lagi disclaimernya
      </button>
    </div>
  );
}

/* ---------- Langkah 3: Intro maskot ---------- */
function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="onboard-step flex h-full flex-col items-center justify-center gap-8 px-7 text-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <Image src="/mascot/senja-rimlight.webp" alt="Senja, maskot Cyronime" fill sizes="220px" className="object-contain" priority />
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Halo, aku Senja!</h1>
        <p className="mx-auto max-w-[300px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Aku bakal nemenin kamu jelajahi ribuan anime dan donghua subtitle Indonesia di sini —
          yuk kenalan dulu sama beberapa fitur andalan Cyronime.
        </p>
      </div>
      <button type="button" onClick={onStart} className="btn btn-primary">
        Kenalan dulu
      </button>
    </div>
  );
}
