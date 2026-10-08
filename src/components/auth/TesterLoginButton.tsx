"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Login TESTER sementara (QA): satu kode akses (default "Aomi123", env
 * TESTER_CODE). Tombol membuka input kode; salah kode -> pesan inline
 * (redirect:false, tidak ada navigasi ke halaman error).
 *
 * Prop `afterLoginHref` (dipakai di OnboardingSignIn): sukses login ->
 * window.location.replace(href) — full load. Di tengah onboarding, navigasi
 * router Next (refresh/replace) terbukti TIDAK reliable dari entri history
 * sentinel onboarding: request RSC-nya di-abort dan tree baru tidak pernah
 * diterapkan, user nyangkut di layar login. Full load selalu dihormati
 * browser dan berperilaku sama seperti jalur login Google (yang balik dari
 * OAuth lewat full page load juga). Tanpa prop (mis. di /login), tetap pakai
 * router.refresh() — di halaman biasa entri history milik Next, aman.
 */
export default function TesterLoginButton({
  afterLoginHref,
  variant = "button",
}: {
  afterLoginHref?: string;
  /** "link" = tautan kecil di bawah tombol utama (bukan fitur sejajar). */
  variant?: "button" | "link";
}) {
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
      if (afterLoginHref) {
        window.location.replace(afterLoginHref);
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
              className="w-full rounded-chip px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--chip-border)" }}
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !code.trim()}
              className="shrink-0 rounded-chip px-4 py-3 text-[19px] font-bold transition-smooth active:scale-[.98] disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--text)" }}
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
            <p className="text-xs font-semibold" style={{ color: "var(--peach)" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : variant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-center text-[12px] font-medium underline transition-smooth active:scale-[.98]"
          style={{ color: "var(--text-2)", textUnderlineOffset: 3, textDecorationColor: "var(--line-strong)" }}
        >
          Punya kode tester? Masuk di sini
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-chip px-4 py-3 text-sm font-bold text-[var(--text)] transition-smooth active:scale-[.98]"
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
