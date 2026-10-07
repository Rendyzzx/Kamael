import "server-only";
import { cookies } from "next/headers";

/**
 * COOKIE PENANDA ONBOARDING (`onb`) — performa navigasi (revisi Okt 2026).
 *
 * Tanpa cookie ini, "/" dan root layout membaca Redis di SETIAP navigasi
 * (getOnboardingStatus per request) -> lag di HP kelas menengah saat
 * jaringan Redis lambat. Alur baru:
 *
 * 1. Cookie `onb` ada (nilai "anime"/"donghua") -> onboarding pasti
 *    selesai, portal = nilai cookie. TIDAK ada round-trip Redis/session.
 * 2. Cookie belum ada (kunjungan pertama, atau setelah logout/restart
 *    onboarding yang menghapusnya) -> baca Redis seperti biasa.
 *
 * Cookie disetel oleh POST /api/onboarding setiap kali `type` tersimpan
 * (pilihan tontonan / ganti portal), dihapus oleh DELETE /api/onboarding
 * ("Ulangi Onboarding") dan logout.
 */
export const ONB_COOKIE = "onb";
export const ONB_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 tahun

export type OnbCookieValue = "anime" | "donghua";

export async function readOnbCookie(): Promise<OnbCookieValue | null> {
  const value = (await cookies()).get(ONB_COOKIE)?.value;
  return value === "anime" || value === "donghua" ? value : null;
}
