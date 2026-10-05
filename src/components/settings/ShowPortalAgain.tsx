"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Opsi Settings "Tampilkan portal lagi": hapus preferensi portal di Redis
 * (pref:{id}) lewat DELETE /api/preference, lalu buka "/" — tanpa preferensi,
 * gerbang "/" merender portal pilihan lagi. Redis gagal → tampilkan pesan
 * (jangan navigasi, karena "/" akan me-redirect balik ke preferensi lama).
 */
export default function ShowPortalAgain() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function showPortal() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/preference", {
        method: "DELETE",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error("delete-failed");
      router.push("/");
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={showPortal}
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
        Tampilkan portal lagi
      </button>
      {error ? (
        <p className="mt-2 text-xs" style={{ color: "#FF1744" }}>
          Gagal menghapus preferensi. Coba lagi nanti.
        </p>
      ) : null}
    </div>
  );
}
