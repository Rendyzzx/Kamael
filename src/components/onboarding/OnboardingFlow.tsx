"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Portal } from "@/components/portal/portal-events";
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
 * State machine onboarding first-time experience (6 langkah). Dimount oleh
 * "/" HANYA ketika onboarding belum selesai (completed && type belum
 * terpenuhi) — lihat src/app/page.tsx. Setiap checkpoint penting (accept,
 * pilihan type, selesai) di-POST ke /api/onboarding (Redis); kegagalan
 * jaringan/Redis tidak pernah menghalangi progres LOKAL (fallback aman —
 * state hanya tidak tersimpan, bukan macet).
 *
 * Resume: jika sudah pernah accept/pilih tapi belum selesai (menutup app
 * di tengah jalan), langsung lanjut dari checkpoint terakhir — bukan
 * mengulang dari splash.
 */
export default function OnboardingFlow({
  initial,
  animePoster,
  donghuaPoster,
}: {
  initial: OnboardingInitialState;
  animePoster: string | null;
  donghuaPoster: string | null;
}) {
  const router = useRouter();
  const resumeStep: Step = useMemo(() => {
    if (initial.type) return "signin";
    if (initial.accepted) return "intro";
    return "splash";
  }, [initial]);

  const [step, setStep] = useState<Step>(resumeStep);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [pickPending, setPickPending] = useState<Portal | null>(null);
  const [signinPending, setSigninPending] = useState<"google" | "guest" | null>(null);

  // Langkah 1 Splash: auto-advance 2 detik. Hanya berjalan bila memang
  // start dari splash (resume tidak pernah mendarat di sini).
  useEffect(() => {
    if (step !== "splash") return;
    const t = setTimeout(() => setStep("disclaimer"), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [step]);

  async function patchOnboarding(body: Partial<{ accepted: boolean; type: Portal; completed: boolean }>) {
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
    else setStep("pick");
  }

  function handleCarouselBack() {
    if (carouselIndex > 0) setCarouselIndex((i) => i - 1);
    else setStep("intro");
  }

  async function handlePick(type: Portal) {
    setPickPending(type);
    await patchOnboarding({ type });
    setPickPending(null);
    setStep("signin");
  }

  async function handleGoogle() {
    setSigninPending("google");
    // Simpan completed=true SEBELUM redirect ke Google, supaya saat kembali
    // ke "/" lewat callback, gerbang server langsung melihat onboarding
    // selesai (bukan menampilkan onboarding lagi).
    await patchOnboarding({ completed: true });
    // signIn("google") memicu navigasi penuh ke halaman consent Google;
    // dilakukan di komponen OnboardingSignIn (butuh next-auth/react langsung).
  }

  async function handleGuest() {
    setSigninPending("guest");
    await patchOnboarding({ completed: true });
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
          onSkip={() => setStep("pick")}
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
        <OnboardingSignIn onGoogle={handleGoogle} onGuest={handleGuest} pending={signinPending} />
      ) : null}
    </div>
  );
}

/* ---------- Langkah 1: Splash ---------- */
function OnboardingSplash() {
  return (
    <div className="onboard-step flex h-full flex-col items-center justify-center gap-7 px-8 text-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <Image src="/onboarding/mascot.png" alt="" fill sizes="160px" className="object-contain" priority />
      </div>
      <h1 className="font-display text-[22px] font-bold text-white">Selamat Datang!</h1>
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
      {/* Glow ungu dekoratif di latar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(122,90,248,.35), transparent 70%)", filter: "blur(10px)" }}
      />

      <div
        className="onboard-step relative w-full max-w-[360px] rounded-card p-6"
        style={{
          background: "rgba(255,255,255,.05)",
          border: "1px solid rgba(255,255,255,.1)",
          backdropFilter: "blur(18px)",
        }}
      >
        <h1 className="font-display text-center text-[20px] font-bold text-white">Disclaimer</h1>
        <p className="mt-3 text-center text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Cyronime adalah situs streaming TIDAK RESMI dan tidak berafiliasi dengan studio, penerbit,
          atau pemegang lisensi mana pun. Seluruh hak cipta konten (anime, donghua, gambar, dan
          judul) tetap menjadi milik pemiliknya masing-masing. Lanjutkan hanya jika kamu memahami
          dan menyetujui hal ini.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-chip border px-4 py-3 text-sm font-bold transition-smooth active:scale-[.97]"
            style={{ borderColor: "#FF1744", color: "#FF1744" }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-chip px-4 py-3 text-sm font-bold text-white transition-smooth active:scale-[.97]"
            style={{ background: "var(--blue-grad)" }}
          >
            Accept
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
      <span className="material-symbols-rounded" style={{ fontSize: 48, color: "#FF1744" }} aria-hidden="true">
        block
      </span>
      <h1 className="font-display text-[20px] font-bold text-white">Belum Bisa Melanjutkan</h1>
      <p className="max-w-[300px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
        Cyronime hanya bisa digunakan jika kamu menyetujui disclaimer. Tekan kembali untuk membaca
        dan menyetujuinya.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="rounded-chip px-6 py-3 text-sm font-bold text-white transition-smooth active:scale-[.97]"
        style={{ background: "var(--surface)" }}
      >
        Kembali
      </button>
    </div>
  );
}

/* ---------- Langkah 3: Intro maskot ---------- */
function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="onboard-step flex h-full flex-col items-center justify-center gap-8 px-7 text-center">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <Image src="/onboarding/mascot.png" alt="Maskot Cyronime" fill sizes="220px" className="object-contain" priority />
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-white">Halo, aku Cyro!</h1>
        <p className="mx-auto max-w-[300px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Aku bakal nemenin kamu jelajahi ribuan anime dan donghua subtitle Indonesia di sini —
          yuk kenalan dulu sama beberapa fitur andalan Cyronime.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rounded-chip px-7 py-3 text-sm font-bold text-white transition-smooth active:scale-[.97]"
        style={{ background: "var(--blue-grad)" }}
      >
        Ayo Mulai
      </button>
    </div>
  );
}
