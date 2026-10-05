"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "cyronime_portal_seen";

/**
 * Portal awal: pilihAnime atau Donghua saat pertama masuk situs.
 * Tampil sekali per sesi browser (sessionStorage); pilihan atau "Lewati"
 * menutup portal. Tidak mengunci akses — semua halaman tetap bisa dibuka.
 */
export default function EntryPortal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(KEY, "1");
    setClosing(true);
    setTimeout(() => setVisible(false), 260);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Pilih kategori"
      className="app-shell fixed inset-0 z-[90] flex flex-col transition-smooth"
      style={{
        background:
          "radial-gradient(120% 40% at 50% 0%, rgba(33,150,243,.16), transparent 70%), var(--bg)",
        opacity: closing ? 0 : 1,
      }}
    >
      <div className="flex flex-1 flex-col justify-center gap-7 px-5 pb-8">
        <div className="text-center">
          <div className="font-display flex items-center justify-center gap-2 text-[24px] font-bold tracking-tight text-white">
            <span className="material-symbols-rounded" style={{ fontSize: 26, color: "var(--blue)" }}>
              movie
            </span>
            Cyro<span style={{ color: "var(--blue)" }}>nime</span>
          </div>
          <p className="mt-2 text-[14px]" style={{ color: "var(--text-2)" }}>
            Mau nonton apa hari ini?
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/anime"
            onClick={dismiss}
            className="relative flex items-center gap-4 overflow-hidden rounded-card p-5 transition-smooth active:scale-[.98]"
            style={{ background: "linear-gradient(135deg, rgba(21,101,192,.35), rgba(33,150,243,.16)), var(--surface)" }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-chip"
              style={{ background: "var(--blue)" }}
            >
              <span className="material-symbols-rounded text-white" style={{ fontSize: 26 }}>
                live_tv
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[17px] font-bold text-white">Anime</span>
              <span className="block text-[12px]" style={{ color: "var(--text-2)" }}>
                Anime Jepang · Sub Indo
              </span>
            </span>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--blue)" }} aria-hidden="true">
              arrow_forward
            </span>
          </Link>

          <Link
            href="/donghua"
            onClick={dismiss}
            className="relative flex items-center gap-4 overflow-hidden rounded-card p-5 transition-smooth active:scale-[.98]"
            style={{ background: "linear-gradient(135deg, rgba(122,26,34,.4), rgba(90,26,32,.2)), var(--surface)" }}
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-chip"
              style={{ background: "var(--maroon)" }}
            >
              <span className="material-symbols-rounded text-white" style={{ fontSize: 26 }}>
                auto_awesome
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-display block text-[17px] font-bold text-white">Donghua</span>
              <span className="block text-[12px]" style={{ color: "var(--text-2)" }}>
                Anime China · Sub Indo
              </span>
            </span>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: "#D9535E" }} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mx-auto block rounded-chip px-4 py-2 text-[13px] font-semibold transition-smooth"
          style={{ background: "transparent", color: "var(--text-2)" }}
        >
          Lewati, langsung ke Home
        </button>
      </div>
    </div>
  );
}
