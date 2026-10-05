"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Portal } from "./portal-events";

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Toggle portal di header halaman Anime/Donghua: menampilkan portal aktif;
 * saat ditekan, preferensi di Redis (pref:{id}) DIPERBARUI ke portal lawan
 * lewat POST /api/preference, lalu navigasi ke sana. Redis gagal → tetap
 * pindah (fallback aman; preferensi lama dipakai lagi di kunjungan "/").
 */
export default function PortalSwitch({ portal }: { portal: Portal }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const other: Portal = portal === "anime" ? "donghua" : "anime";

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: other }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Fallback aman: tetap pindah portal meski simpan preferensi gagal.
    }
    router.push(`/${other}`);
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
