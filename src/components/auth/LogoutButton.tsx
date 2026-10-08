"use client";

/**
 * Tombol Logout (Profile & Settings) — bersihkan mirror onboarding
 * localStorage SEBELUM server action logoutToOnboarding berjalan.
 *
 * Kenapa: logout memang disainnya kembali ke BOARD AWAL (splash) —
 * server action menghapus state Redis + cookie visitor. Tapi saat Redis
 * down, gerbang "/" memakai mirror perangkat sebagai fallback; mirror
 * lama (completed=true) membuat user tetap mendarat di dashboard alih-
 * alih splash. Dengan mirror dibersihkan saat logout, "/" merender
 * onboarding dari awal — konsisten Redis up maupun down.
 */
import { clearMirror } from "@/lib/onboarding-mirror";

export default function LogoutButton() {
  return (
    <button
      type="submit"
      onClick={() => clearMirror()}
      className="w-full rounded-chip px-4 py-3 text-sm font-bold transition-smooth"
      style={{ background: "var(--surface)", color: "var(--peach)" }}
    >
      Logout
    </button>
  );
}
