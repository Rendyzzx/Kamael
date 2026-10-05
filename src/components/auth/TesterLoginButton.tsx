"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Login TESTER sementara (QA): satu kode akses (default "Aomi123", env
 * TESTER_CODE). Tombol membuka input kode; salah kode -> pesan inline
 * (redirect:false, tidak ada navigasi ke halaman error). Sukses ->
 * router.refresh() dan gerbang "/" / middleware melanjutkan alur seperti
 * login Google.
 */
export default function TesterLoginButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("tester", { code, redirect: false });
      if (res?.error) {
        setError("Kode tester salah. Coba lagi.");
        return;
      }
      router.refresh();
    } catch {
      setError("Gagal masuk. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {open ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder="Kode tester"
              aria-label="Kode tester"
              autoComplete="off"
              className="w-full rounded-chip px-4 py-3 text-sm font-semibold text-white outline-none"
              style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,.12)" }}
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !code.trim()}
              className="shrink-0 rounded-chip px-4 py-3 text-sm font-bold text-white transition-smooth active:scale-[.98] disabled:opacity-60"
              style={{ background: "var(--blue-grad)" }}
            >
              {busy ? (
                <span className="material-symbols-rounded animate-spin" style={{ fontSize: 18 }}>
                  progress_activity
                </span>
              ) : (
                "Masuk"
              )}
            </button>
          </div>
          {error ? (
            <p className="text-xs font-semibold" style={{ color: "#FF1744" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-chip px-4 py-3 text-sm font-bold text-white transition-smooth active:scale-[.98]"
          style={{ background: "var(--surface)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }} aria-hidden="true">
            key
          </span>
          Masuk dengan kode Tester
        </button>
      )}
    </div>
  );
}
