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
        className="rounded-md border border-surface-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/60 hover:text-red-400"
      >
        Clear History
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">Hapus semua riwayat?</span>
      <button
        type="button"
        onClick={clear}
        disabled={busy}
        className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {busy ? "Menghapus…" : "Ya, hapus"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md border border-surface-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
      >
        Batal
      </button>
    </span>
  );
}
