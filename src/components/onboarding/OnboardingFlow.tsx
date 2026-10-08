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

  // HANDSHAKE selesai onboarding: handlePick mem-pop sentinel sendiri
  // SEBELUM router.refresh(), lalu popstate handler menjalankan refresh
  // yang tertunda. Tanpa urutan ini, cleanup effect memanggil
  // history.back() SETELAH tree dashboard ke-refresh -> popstate
  // membuat Next.js ME-RESTORE snapshot history lama (tree onboarding)
  // menimpa dashboard -> overlay onboarding tidak pernah hilang, user
  // "terkunci" di layar Pilih Tontonan selamanya (bug Okt 2026).
  const completePopRef = useRef<(() => void) | null>(null);

  // JEBATAN TOMBOL BACK (bugfix): langkah onboarding TIDAK menulis history,
  // jadi tombol back fisik Android / swipe-back iOS dulunya mundur ke entri
  // history lama (bisa "teleport" user ke halaman anime dengan onboarding
  // belum selesai, lalu nyangkut di sana). Solusi: selama onboarding aktif,
  // push sentinel ke stack history dan tafsirkan popstate sebagai "mundur
  // satu langkah onboarding" (perilaku aplikasi native), bukan keluar.
  useEffect(() => {
    const SENTINEL = { cyronimeOnboarding: true };
    // PENTING: push sentinel via pushState MENTAH (prototype), BUKAN
    // window.history.pushState — yang versi Next 15.3+ sudah di-patch
    // dan menandai entri sebagai milik router Next. Entri bertanda Next
    // akan di-RESTORE (tree lama ditimpa balik) saat di-pop, sehingga
    // dashboard hasil refresh completion tertimpa tree onboarding dan
    // user nyangkut di Pilih Tontonan. Dengan pushState mentah, entri
    // sentinel tidak dikenali Next -> pop-nya diabaikan Next sepenuhnya.
    const rawPushState = History.prototype.pushState;
    rawPushState.call(history, SENTINEL, "");

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
      // Pop yang dijadwalkan handlePick saat onboarding selesai: TIDAK
      // di-push ulang, TIDAK mundur satu langkah. Ini adalah GELOMBANG POP:
      // entri saat ini masih bertanda sentinel (bisa lebih dari satu —
      // mis. PWA reload halaman saat first visit lalu mount ulang) -> pop
      // lagi; sudah mencapai entri bersih Next -> jalankan refresh yang
      // tertunda di situ. PENTING: refresh HARIP dijalankan di entri
      // history milik Next, bukan di sentinel kita — navigasi/refresh Next
      // yang berjalan di atas entri sentinel yang state-nya sudah
      // tertimpa replaceState Next selalu di-abort (tree tidak pernah
      // bertukar -> user nyangkut di layar Pilih Tontonan).
      const afterComplete = completePopRef.current;
      if (afterComplete) {
        if ((history.state as { cyronimeOnboarding?: boolean } | null)?.cyronimeOnboarding) {
          history.back();
          return;
        }
        completePopRef.current = null;
        afterComplete();
        return;
      }
      // Back "ditelan": kembalikan sentinel ke puncak stack supaya stack
      // tidak habis (mencegah exit tak sengaja di tengah onboarding),
      // lalu jalankan mundur satu langkah.
      rawPushState.call(history, SENTINEL, "");
      goBackOneStep();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Safety: kalau popstate completion tidak pernah datang (edge case),
      // tetap jalankan refresh yang tertunda supaya user tidak terkunci.
      const afterComplete = completePopRef.current;
      if (afterComplete) {
        completePopRef.current = null;
        afterComplete();
      }
      // Buang sentinel dari stack HANYA bila kita masih duduk di atasnya.
      // history.back() SETELAH tree berubah (mis. dashboard hasil refresh)
      // adalah sumber bug: popstate-nya membuat Next me-restore snapshot
      // onboarding lama dan menimpanya. Kondisi marker memastikan cleanup
      // ini tidak pernah pop "asal" saat stack sudah tidak punya sentinel.
      if ((history.state as { cyronimeOnboarding?: boolean } | null)?.cyronimeOnboarding) {
        history.back();
      }
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
    // Mulai gelombang pop completion. Entri teratas stack DIJAMIN salah
    // satu sentinel kita (didorong saat mount; handler popstate selalu
    // push ulang; reload PWA mempertahankan entri + markernya) — namun
    // KEY pada state entri bisa saja sudah DIHAPUS oleh replaceState Next
    // saat router sinkron (mis. refresh pasca-login tester), jadi
    // JANGAN cek history.state di sini: selalu pop, dan biarkan handler
    // popstate yang menghitung sampai entri bersih.
    //
    // Sampai di entri bersih, JANGAN pakai router.refresh(): entri awal
    // E0 menyimpan snapshot tree ONBOARDING (stale) di internal state
    // Next, dan popstate-nya memicu Next me-restore snapshot itu —
    // refresh kalah balapan dengan restore dan overlay onboarding tidak
    // pernah benar-benar hilang (user nyangkut di Pilih Tontonan).
    // Solusi: router.replace("/") — navigasi nyata yang menimpa entri E0
    // dengan tree dashboard fresh.
    completePopRef.current = () => router.replace("/");
    history.back();
    // Jaring pengaman ganda:
    // 1) popstate tidak pernah datang (edge browser) -> tetap replace.
    // 2) replace tidak mendarat dalam 1.5 detik (overlay masih ada)
    //    -> reload penuh via location.replace (in-place, tanpa menambah
    //    entri history).
    window.setTimeout(() => {
      const pending = completePopRef.current;
      if (pending) {
        completePopRef.current = null;
        pending();
      }
    }, 800);
    window.setTimeout(() => {
      if (document.querySelector(".onboard-step")) {
        window.location.replace("/");
      }
    }, 1500);
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
        <Image src="/mascot/airin.webp" alt="" fill sizes="160px" className="object-contain" priority />
      </div>
      <h1 className="font-display text-[22px] font-bold text-[var(--text)]">Selamat datang di senja</h1>
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
        className="onboard-step relative w-full max-w-[360px] rounded-card p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        <h1 className="font-display text-center text-[20px] font-bold text-[var(--text)]">Disclaimer</h1>
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
        <Image src="/mascot/airin.webp" alt="" fill sizes="150px" className="object-contain" />
      </div>
      <h1 className="font-display text-[20px] font-bold text-[var(--text)]">Belum bisa lanjut</h1>
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
        <Image src="/mascot/airin.webp" alt="Airin, maskot Cyronime" fill sizes="220px" className="object-contain" priority />
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-[var(--text)]">Halo, aku Airin!</h1>
        <p className="mx-auto max-w-[300px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          Aku bakal nemenin kamu jelajahi anime dan donghua subtitle Indonesia di sini.
          Yuk kenalan dulu sama cara pakainya.
        </p>
      </div>
      <button type="button" onClick={onStart} className="btn btn-primary">
        Kenalan dulu
      </button>
    </div>
  );
}
