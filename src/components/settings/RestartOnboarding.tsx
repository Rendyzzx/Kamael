"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearMirror } from "@/lib/onboarding-mirror";

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Settings > "Ulangi Onboarding": hapus state onboarding di Redis
 * (onboarding:{id}) lewat DELETE /api/onboarding DAN mirror localStorage,
 * lalu refresh "/" — tanpa state, "/" akan merender onboarding dari
 * splash lagi.
 * Redis gagal -> tampilkan pesan (jangan navigasi dulu, supaya tidak
 * memberi kesan berhasil padahal state lama masih tersimpan).
 */
export default function RestartOnboarding() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function restart() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/onboarding", {
        method: "DELETE",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error("delete-failed");
      // Mirror localStorage WAJIB ikut dihapus: mirror menyimpan
      // completed:true dari onboarding yang lalu. Kalau dibiarkan, saat
      // Redis down, gerbang "/" percaya mirror dan gagal menampilkan
      // ulang alur onboarding -> user "teleport" ke home anime dan
      // nyangkut di sana (bug Okt 2026).
      clearMirror();
      router.push("/");
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={restart}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-chip px-4 py-3 text-sm font-bold transition-smooth active:scale-[.98]"
        style={{ background: "var(--surface)", color: "var(--blue)" }}
      >
        {pending ? (
          <span className="material-symbols-rounded animate-spin" style={{ fontSize: 18 }}>
            progress_activity
          </span>
        ) : (
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
            restart_alt
          </span>
        )}
        Ulangi Onboarding
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: "#FF1744" }}>
          Gagal menghapus progres onboarding. Coba lagi nanti.
        </p>
      ) : null}
    </div>
  );
}
