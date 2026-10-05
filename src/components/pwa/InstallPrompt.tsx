"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Banner "Tambahkan ke layar utama" (PWA install prompt):
 * - Android/Chrome: menangkap event beforeinstallprompt, tampilkan banner
 *   bawah; tombol Install memanggil prompt() asli browser.
 * - iOS/Safari: tidak ada beforeinstallprompt -> tampilkan sheet panduan
 *   manual (Share -> "Tambahkan ke Layar Utama").
 * - Tidak pernah tampil bila sudah standalone (display-mode) atau sudah
 *   ditolak hari ini (sessionStorage, agar tidak menyebalkan).
 * - Hanya muncul di halaman non-watch, setelah 3 detik.
 */

const DISMISS_KEY = "cyronime:install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<
    (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null
  >(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [visible, setVisible] = useState(false);
  const [unsupported, setUnsupported] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    setUnsupported(false);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Parameters<typeof setDeferred>[0]);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS: tidak ada beforeinstallprompt — sediakan panduan manual.
    const ios = isIOS();
    const t = setTimeout(() => {
      if (ios) setShowIOSGuide(true);
      setVisible(true);
    }, 3_000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      clearTimeout(t);
    };
  }, []);

  // Jangan tampil di player (halaman watch) atau settings.
  const hideOn = pathname.includes("/watch/") || pathname === "/settings";
  if (unsupported || !visible || hideOn) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome !== "accepted") return;
    setVisible(false);
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  }

  if (isIOS() && showIOSGuide) {
    return (
      <div
        className="fixed inset-x-0 z-50 mx-auto max-w-[480px]"
        style={{ bottom: "calc(84px + env(safe-area-inset-bottom))", paddingInline: 12 }}
      >
        <div
          className="flex items-center gap-3 rounded-card p-3.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--surface-3)", backdropFilter: "blur(12px)" }}
          role="dialog"
          aria-label="Pasang Cyronime di layar utama"
        >
          <span className="material-symbols-rounded shrink-0" style={{ fontSize: 26, color: "var(--blue)" }}>
            ios_share
          </span>
          <p className="flex-1 text-[12.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Pasang <strong className="text-white">Cyronime</strong> ke layar utama: buka menu Share di Safari, lalu
            pilih <strong className="text-white">Tambahkan ke Layar Utama</strong>.
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--surface-3)" }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--text-2)" }}>
              close
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 mx-auto max-w-[480px]"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom))", paddingInline: 12 }}
    >
      <div
        className="flex items-center gap-3 rounded-card p-3.5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--surface-3)", backdropFilter: "blur(12px)" }}
        role="dialog"
        aria-label="Pasang Cyronime"
      >
        <Image src="/icons/icon-96.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} priority={false} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white">Pasang Cyronime</p>
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            Akses cepat dari layar utama, tanpa browser.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-chip px-4 py-2 text-[13px] font-bold text-white transition-smooth active:scale-[.97]"
          style={{ background: "var(--blue-grad)" }}
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--surface-3)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--text-2)" }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
}
