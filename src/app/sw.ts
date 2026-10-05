/// <reference lib="webworker" />
/**
 * Service worker PWA (Serwist v9 + @serwist/next).
 *
 * - Precache aset build Next (manifest dibuat @serwist/webpack-plugin) —
 *   termasuk seluruh file di /public (ikon, splash, offline.html).
 * - Runtime caching: strategi default @serwist/next (defaultCache) —
 *   navigasi network-first, statis cache-first.
 * - Offline fallback: request dokumen/navigasi yang gagal (offline & tidak
 *   ada di cache) -> /offline.html (statis, pasti ter-precache).
 * - Poster API eksternal TIDAK di-cache agresif: network-first default
 *   sudah cukup; halaman tetap terbuka offline dari cache navigasi.
 *
 * next.config membungkus dengan withSerwist({ swSrc: file ini }).
 * JANGAN import modul server-only di sini (SW jalan di browser).
 */
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

// Manifest precache hasil build @serwist/webpack-plugin: array entry
// { url, revision } (PrecacheEntry serwist) atau string URL.
declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: { url: string; revision?: string | null }[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
