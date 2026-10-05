/**
 * Util portal (client-shared): nama event + helper membuka dialog ganti portal.
 * Pilihan portal disimpan di cookie `cyronime_portal` agar terbaca server
 * component home (SSR) tanpa fetch ganda.
 */
export const PORTAL_COOKIE = "cyronime_portal";

/** Event client untuk membuka kembali dialog pilih portal. */
export const PORTAL_SWITCH_EVENT = "cyronime:portal-switch";

export type Portal = "anime" | "donghua";

export function openPortalSwitch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PORTAL_SWITCH_EVENT));
  }
}
