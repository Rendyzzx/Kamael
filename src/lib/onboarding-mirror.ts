/**
 * MIRROR onboarding di localStorage (client-side).
 *
 * Redis (onboarding:{id}) tetap SUMBER KEBENARAN utama. Mirror ini hanya
 * dipakai sebagai fallback saat Redis TIDAK TERJANGKAU (redisOk=false):
 * tanpa mirror, gerbang "/" fail-open ke dashboard dan user yang belum
 * selesai onboarding "teleport" ke home anime dan nyangkut di sana
 * (bug Okt 2026). Dengan mirror, "/" tetap merender alur onboarding
 * walau Redis down, dan progres lokal (accepted/type/completed) yang
 * tersimpan di perangkat dipakai untuk resume.
 *
 * Semua fungsi aman dipanggil di browser apa pun (private mode, cookie
 * diblokir) — kegagalan localStorage selalu diam-diam diabaikan.
 */

const MIRROR_KEY = "cyronime:onboarding-mirror";

export interface OnboardingMirror {
  accepted: boolean;
  completed: boolean;
  type: "anime" | "donghua" | null;
}

const EMPTY: OnboardingMirror = { accepted: false, completed: false, type: null };

function readRaw(): OnboardingMirror | null {
  try {
    const raw = window.localStorage.getItem(MIRROR_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<OnboardingMirror>;
    return {
      accepted: v.accepted === true,
      completed: v.completed === true,
      type: v.type === "anime" || v.type === "donghua" ? v.type : null,
    };
  } catch {
    return null;
  }
}

/** Baca mirror. null bila belum pernah ada checkpoint. */
export function readMirror(): OnboardingMirror | null {
  if (typeof window === "undefined") return null;
  return readRaw();
}

/** Merge-patch mirror (checkpoint accepted/type/completed). */
export function writeMirror(patch: Partial<OnboardingMirror>): void {
  if (typeof window === "undefined") return;
  try {
    const current = readRaw() ?? EMPTY;
    const next: OnboardingMirror = {
      accepted: patch.accepted !== undefined ? patch.accepted : current.accepted,
      completed: patch.completed !== undefined ? patch.completed : current.completed,
      type: patch.type !== undefined ? patch.type : current.type,
    };
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify(next));
  } catch {
    // localStorage penuh/diblokir — abaikan, Redis tetap sumber utama.
  }
}

/** Hapus mirror (dipakai saat server memutuskan onboarding harus ulang). */
export function clearMirror(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MIRROR_KEY);
  } catch {
    // abaikan
  }
}
