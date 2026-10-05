/**
 * Identitas pengunjung anonim — visitor ID acak (UUID v4) di cookie httpOnly.
 * Dipakai sebagai kunci preferensi portal (pref:{id}) untuk user yang belum
 * login; user login memakai user ID dari session, bukan cookie ini.
 *
 * Cookie: httpOnly (tak bisa dibaca JS client), SameSite=Lax, 1 tahun, path /.
 */
import "server-only";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "cyronime_vid";

/** 1 tahun (detik). */
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Buat visitor ID baru (crypto.randomUUID tersedia di Node & Edge runtime). */
export function newVisitorId(): string {
  return crypto.randomUUID();
}

/** Opsi cookie visitor — dipakai saat menulis cookie dari Route Handler. */
export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

/** Baca visitor ID dari cookie (Server Component / Route Handler). Tidak membuat baru. */
export async function readVisitorId(): Promise<string | null> {
  const value = (await cookies()).get(VISITOR_COOKIE)?.value;
  return value && value.length >= 8 && value.length <= 64 ? value : null;
}
