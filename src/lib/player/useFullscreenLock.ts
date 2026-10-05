"use client";

import { useEffect } from "react";

/**
 * Efek "fullscreen ala native app" untuk halaman watch:
 *
 * Saat elemen mana pun masuk fullscreen (iframe player embed via tombol
 * fullscreen bawaan pihak ketiga, atau <video> native):
 * - Kunci orientasi landscape (screen.orientation.lock) bila tersedia —
 *   Safari iOS tidak mendukung, diam saja di sana.
 * - Aktifkan Screen Wake Lock agar layar tidak mati saat nonton.
 * Saat keluar fullscreen: buka kunci orientasi (unlock) dan lepaskan wake
 * lock — semuanya dibersihkan juga saat unmount halaman watch.
 *
 * Safe-area tidak berlaku di landscape fullscreen; bottom nav sudah
 * disembunyikan di rute /watch/ (BottomNav & SettingsFab).
 */
interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", cb: () => void) => void;
}

export function useFullscreenLock(): void {
  useEffect(() => {
    let wakeLock: WakeLockSentinelLike | null = null;
    let orientationLocked = false;
    // screen.orientation.lock/unlock tidak ada di lib.dom TS — akses longgar.
    const orientation = screen.orientation as unknown as {
      lock?: (o: "landscape") => Promise<void>;
      unlock?: () => void;
    };

    async function onFullscreenChange() {
      if (document.fullscreenElement) {
        // Masuk fullscreen: kunci landscape + wake lock.
        try {
          if (orientation.lock) {
            await orientation.lock("landscape");
            orientationLocked = true;
          }
        } catch {
          // Browser menolak (bukan user gesture / tidak didukung) — abaikan.
        }
        try {
          const nav = navigator as Navigator & {
            wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
          };
          if (nav.wakeLock) {
            const sentinel = await nav.wakeLock.request("screen");
            wakeLock = sentinel;
            sentinel.addEventListener("release", () => {
              wakeLock = null;
            });
          }
        } catch {
          // Wake Lock ditolak (baterai hemat dsb.) — abaikan.
        }
      } else {
        // Keluar fullscreen: kembalikan orientasi & lepaskan wake lock.
        try {
          if (orientationLocked && orientation.unlock) {
            orientation.unlock();
            orientationLocked = false;
          }
        } catch {}
        if (wakeLock) {
          try {
            await wakeLock.release();
          } catch {}
          wakeLock = null;
        }
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      // Cleanup saat unmount halaman watch (mis. keluar halaman saat masih fullscreen).
      if (wakeLock) {
        void wakeLock.release().catch(() => {});
      }
      try {
        if (orientationLocked && orientation.unlock) orientation.unlock();
      } catch {}
    };
  }, []);
}
