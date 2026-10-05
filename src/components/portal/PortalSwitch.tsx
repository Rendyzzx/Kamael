"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Portal } from "./portal-events";

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Chip toggle portal di header Home/"/anime"/"/donghua": menampilkan portal
 * aktif; saat ditekan, `type` di state onboarding (Redis onboarding:{id})
 * DIPERBARUI ke portal lawan lewat POST /api/onboarding, lalu navigasi ke
 * "/" (Home) supaya dashboard trending portal baru langsung terlihat.
 * Redis gagal -> tetap pindah (fallback aman).
 */
export default function PortalSwitch({ portal }: { portal: Portal }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const other: Portal = portal === "anime" ? "donghua" : "anime";

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: other }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Fallback aman: tetap pindah portal meski simpan preferensi gagal.
    }
    // Home ("/") = dashboard trending; selalu ke sana setelah ganti portal,
    // dari mana pun toggle ini dipanggil (Home, /anime, /donghua).
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={`Portal ${portal === "anime" ? "Anime" : "Donghua"} aktif. Ganti ke ${other}.`}
      className="flex h-11 items-center gap-1.5 rounded-chip px-3 transition-smooth active:scale-[.97]"
      style={{ background: "var(--surface)" }}
    >
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 20, color: portal === "anime" ? "var(--blue)" : "#D9535E" }}
      >
        {portal === "anime" ? "live_tv" : "auto_awesome"}
      </span>
      <span className="text-[13px] font-semibold text-white">
        {portal === "anime" ? "Anime" : "Donghua"}
      </span>
      {pending ? (
        <span className="material-symbols-rounded animate-spin" style={{ fontSize: 18, color: "var(--text-2)" }}>
          progress_activity
        </span>
      ) : (
        <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--text-2)" }} aria-hidden="true">
          swap_vert
        </span>
      )}
    </button>
  );
}
