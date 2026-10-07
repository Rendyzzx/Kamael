"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Tombol "Clear History" dengan konfirmasi dua langkah (inline, bukan dialog generik). */
export default function ClearHistoryButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function clear() {
    setBusy(true);
    try {
      await fetch("/api/history", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-chip px-3 py-1.5 text-xs font-semibold transition-smooth"
        style={{ border: "1px solid var(--surface-3)", color: "#FF1744" }}
      >
        Clear History
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs" style={{ color: "var(--text-2)" }}>Hapus semua riwayat?</span>
      <button
        type="button"
        onClick={clear}
        disabled={busy}
        className="rounded-chip px-3 py-1.5 text-xs font-bold text-[var(--text)] transition-smooth disabled:opacity-50"
        style={{ background: "#FF1744" }}
      >
        {busy ? "Menghapus…" : "Ya, hapus"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-chip px-3 py-1.5 text-xs font-semibold transition-smooth"
        style={{ border: "1px solid var(--surface-3)", color: "var(--text-2)" }}
      >
        Batal
      </button>
    </span>
  );
}
