"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PORTAL_COOKIE, PORTAL_SWITCH_EVENT, type Portal } from "./portal-events";

const SESSION_SEEN = "cyronime_portal_seen";

function hasPortalCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${PORTAL_COOKIE}=`));
}

function setPortalCookie(value: Portal) {
  document.cookie = `${PORTAL_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Portal pemilih kategori: Anime (khusus anime) atau Donghua (khusus donghua).
 * - Tampil saat pengunjung belum pernah memilih (belum ada cookie).
 * - Pilihan disimpan di cookie 1 tahun → home (server) menampilkan konten
 *   sesuai portal; memilih ulang memakai tombol ganti portal di header home.
 * - "Lewati" hanya menutup untuk sesi ini; portal default = anime.
 */
export default function EntryPortal({ portal }: { portal: Portal }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_SEEN);
    if (!hasPortalCookie() && !seen) {
      setVisible(true);
    }

    const onSwitch = () => {
      setClosing(false);
      setVisible(true);
    };
    window.addEventListener(PORTAL_SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(PORTAL_SWITCH_EVENT, onSwitch);
  }, []);

  function close() {
    setClosing(true);
    setTimeout(() => setVisible(false), 260);
  }

  function skip() {
    sessionStorage.setItem(SESSION_SEEN, "1");
    close();
  }

  function choose(next: Portal) {
    setPortalCookie(next);
    close();
    // Server home membaca cookie; refresh agar konten berganti portal.
    if (next !== portal) router.refresh();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Pilih portal"
      className="z-[90] flex flex-col transition-smooth"
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 480,
        minWidth: 360,
        marginInline: "auto",
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
          <button
            type="button"
            onClick={() => choose("anime")}
            className="relative flex w-full items-center gap-4 overflow-hidden rounded-card p-5 text-left transition-smooth active:scale-[.98]"
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
          </button>

          <button
            type="button"
            onClick={() => choose("donghua")}
            className="relative flex w-full items-center gap-4 overflow-hidden rounded-card p-5 text-left transition-smooth active:scale-[.98]"
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
          </button>
        </div>

        <button
          type="button"
          onClick={skip}
          className="mx-auto block rounded-chip px-4 py-2 text-[13px] font-semibold transition-smooth"
          style={{ background: "transparent", color: "var(--text-2)" }}
        >
          Lewati
        </button>
      </div>
    </div>
  );
}
