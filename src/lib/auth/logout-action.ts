"use server";

/**
 * Logout = kembali ke BOARD AWAL (alur onboarding dari splash).
 *
 * Dipakai tombol Logout di Profile DAN Settings (dulu hanya Settings yang
 * membersihkan state — tombol di Profile hanya signOut, sehingga state
 * onboarding lama (accepted=true di bawah visitor ID) masih ada dan user
 * mendarat di TENGAH alur (intro), bukan dari awal).
 *
 * Langkah: hapus state onboarding Redis untuk user ID DAN visitor ID,
 * hapus cookie visitor, lalu signOut redirect ke "/" — layout/page akan
 * membaca identitas baru (kosong) dan merender OnboardingFlow dari splash.
 *
 * Fail-open: kegagalan hapus Redis tidak menghalangi logout — user tetap
 * signOut; alur onboarding mungkin saja resume dari checkpoint lama bila
 * Redis down, tapi tidak pernah membuat user terkunci di session lama.
 */
import { cookies } from "next/headers";
import { getAuthenticatedUserId, signOut } from "@/lib/auth/session";
import { deleteOnboarding } from "@/lib/redis/onboarding";
import { readVisitorId, VISITOR_COOKIE } from "@/lib/visitor";

export async function logoutToOnboarding(): Promise<void> {
  const uid = await getAuthenticatedUserId();
  const vid = await readVisitorId();

  // Bersihkan kedua kunci — best effort, jangan blok logout.
  await Promise.allSettled([
    uid ? deleteOnboarding(uid) : Promise.resolve(false),
    vid ? deleteOnboarding(vid) : Promise.resolve(false),
  ]);

  // Hapus cookie visitor supaya identitas pra-login (accepted=true) tidak
  // dipakai lagi — POST /api/onboarding akan membuat cookie baru saat
  // disclaimer di-accept kembali.
  try {
    (await cookies()).delete(VISITOR_COOKIE);
  } catch {
    // ignore — cookie opsional
  }

  await signOut({ redirectTo: "/" });
}
