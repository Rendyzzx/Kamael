"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Portal } from "@/components/portal/portal-events";
import OnboardingFlow, { type OnboardingInitialState } from "./OnboardingFlow";
import { readMirror, writeMirror, type OnboardingMirror } from "@/lib/onboarding-mirror";

/**
 * GERBANG KHUSUS jalur "server bilang onboarding sudah selesai" pada "/".
 *
 * Latar (bug Okt 2026): saat Redis down (redisOk=false), page.tsx
 * fail-open menganggap onboarding selesai -> user yang BELUM selesai
 * (mis. menekan back/reload di tengah alur) "teleport" ke dashboard
 * dan nyangkut di sana tanpa bisa kembali ke onboarding. Gerbang ini
 * memeriksa mirror localStorage SEBELUM menampilkan dashboard:
 *
 * - Redis OK + selesai  -> tampilkan dashboard (children), sinkronkan
 *   mirror supaya gangguan Redis berikutnya tidak memaksa ulang
 *   onboarding bagi user yang sudah selesai.
 * - Redis GAGAL         -> percaya mirror di perangkat: mirror belum
 *   completed/type -> paksa tampil OnboardingFlow (resume dari
 *   checkpoint mirror), bukan dashboard.
 *
 * Cabang "server bilang belum selesai" TIDAK lewat gerbang ini —
 * page.tsx merender OnboardingFlow langsung.
 */
export default function OnboardingGate({
  redisOk,
  initial,
  authed,
  animePoster,
  donghuaPoster,
  children,
}: {
  redisOk: boolean;
  initial: OnboardingInitialState;
  authed: boolean;
  animePoster: string | null;
  donghuaPoster: string | null;
  children: ReactNode;
}) {
  // Render awal WAJIB mengikuti keputusan server (hindari hydration
  // mismatch); koreksi lewat mirror terjadi setelah mount.
  const [mode, setMode] = useState<"dashboard" | "onboarding">("dashboard");
  const [mirrorState, setMirrorState] = useState<OnboardingMirror | null>(null);

  useEffect(() => {
    if (redisOk) {
      // Server sehat dan bilang selesai — sinkronkan mirror perangkat.
      writeMirror({ accepted: true, completed: true, type: initial.type as Portal | null });
      return;
    }
    // Redis tidak terjangkau: keputusan server tidak bisa dipercaya.
    // Mirror belum completed/type -> user ini belum selesai onboarding.
    const m = readMirror();
    if (!m || !m.completed || !m.type) {
      setMirrorState(m);
      setMode("onboarding");
    }
    // Mirror completed -> tampilkan dashboard (children) seperti biasa.
  }, [redisOk, initial.type]);

  if (mode === "onboarding") {
    return (
      <OnboardingFlow
        initial={{
          accepted: mirrorState?.accepted ?? false,
          completed: mirrorState?.completed ?? false,
          type: (mirrorState?.type as Portal | null) ?? null,
        }}
        authed={authed}
        animePoster={animePoster}
        donghuaPoster={donghuaPoster}
      />
    );
  }

  return <>{children}</>;
}
