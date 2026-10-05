"use client";

import { useEffect } from "react";

/**
 * Menjaga PWA tetap hidup di versi terbaru:
 *
 * 1. controllerchange -> reload SEKALI saat SW baru mengambil alih
 *    (skipWaiting+clientsClaim aktif di src/app/sw.ts). Tanpa ini, halaman
 *    lama bisa terus jalan dengan chunk JS lama yang sudah tidak ada di
 *    server -> tombol "mati" / page beku setelah deploy baru.
 * 2. visibilitychange (kembali ke app dari background) -> registration.update()
 *    supaya PWA standalone (tanpa tab) juga mengecek update, bukan cuma saat
 *    browser kebetulan navigasi.
 *
 * Flag sessionStorage mencegah loop reload bila controllerchange
 * menyala beberapa kali.
 */
export default function SwUpdateReload() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading || sessionStorage.getItem("cyro-sw-reloaded") === "1") return;
      reloading = true;
      sessionStorage.setItem("cyro-sw-reloaded", "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.serviceWorker.getRegistration()?.then((reg) => reg?.update());
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
