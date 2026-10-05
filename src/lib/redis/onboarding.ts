/**
 * State onboarding first-time experience — WAJIB Redis, bukan
 * localStorage/sessionStorage. Key: onboarding:{id}.
 *
 * id = user ID (login, Google `sub`) ATAU visitor ID dari cookie httpOnly
 * (lihat src/lib/visitor.ts). Satu record per identitas menggantikan
 * sistem pref:{id} yang lama — `type` di sini SAMA FUNGSINYA dengan
 * preferensi portal lama, hanya digabung ke satu state onboarding.
 */
import "server-only";
import { getRedis, isRedisConfigured, safeRedis } from "./client";

export type OnboardingType = "anime" | "donghua";

export interface OnboardingState {
  /** Sudah menekan "Accept" di layar Disclaimer. */
  accepted: boolean;
  /** Sudah menyelesaikan seluruh alur (lewat Google atau "Lanjut sebagai tamu"). */
  completed: boolean;
  /** Pilihan tontonan dari layar "Pilih Tontonan". null = belum memilih. */
  type: OnboardingType | null;
}

const DEFAULT_STATE: OnboardingState = { accepted: false, completed: false, type: null };

const KEY_PREFIX = "onboarding:";
/** 1 tahun — sejajar masa berlaku cookie visitor. */
const TTL_SECONDS = 60 * 60 * 24 * 365;
/** Timeout pendek supaya halaman "/" tidak pernah menggantung lama. */
const REDIS_TIMEOUT_MS = 2_500;

function key(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function withTimeout<T>(op: Promise<T>): Promise<T> {
  return Promise.race([
    op,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("redis-timeout")), REDIS_TIMEOUT_MS).unref?.();
    }),
  ]);
}

function normalize(value: unknown): OnboardingState {
  if (!value || typeof value !== "object") return { ...DEFAULT_STATE };
  const v = value as Partial<OnboardingState>;
  return {
    accepted: v.accepted === true,
    completed: v.completed === true,
    type: v.type === "anime" || v.type === "donghua" ? v.type : null,
  };
}

/** Ambil state onboarding. Fallback ke default bila belum ada record / Redis down. */
export async function getOnboarding(id: string): Promise<OnboardingState> {
  return safeRedis(async () => {
    const raw = await withTimeout(getRedis().get<OnboardingState>(key(id)));
    return normalize(raw);
  }, { ...DEFAULT_STATE });
}

/**
 * Sama seperti getOnboarding, tapi membedakan "belum pernah mulai" dari
 * "Redis tidak terjangkau" lewat `redisOk`. Dipakai di "/" supaya gangguan
 * Redis TIDAK memaksa onboarding tampil lagi (fail-open ke dashboard
 * dengan portal default "anime") — bukan fail-closed ke onboarding.
 */
export async function getOnboardingStatus(
  id: string
): Promise<{ value: OnboardingState; redisOk: boolean }> {
  if (!isRedisConfigured()) {
    return { value: { ...DEFAULT_STATE }, redisOk: false };
  }
  try {
    const raw = await withTimeout(getRedis().get<OnboardingState>(key(id)));
    return { value: normalize(raw), redisOk: true };
  } catch (err) {
    console.error("[redis] getOnboardingStatus failed, falling back:", err);
    return { value: { ...DEFAULT_STATE }, redisOk: false };
  }
}

/**
 * Merge-patch state onboarding (read-modify-write; cukup aman untuk pola
 * akses 1 user/visitor, bukan write konkuren tinggi). Return state hasil
 * merge bila sukses, null bila Redis gagal/down (kondisi aman: progres
 * lokal di client tetap jalan, hanya tidak tersimpan).
 */
export async function patchOnboarding(
  id: string,
  patch: Partial<OnboardingState>
): Promise<OnboardingState | null> {
  return safeRedis(async () => {
    const current = await withTimeout(getRedis().get<OnboardingState>(key(id)));
    const next: OnboardingState = { ...normalize(current), ...patch };
    await withTimeout(getRedis().set(key(id), next, { ex: TTL_SECONDS }));
    return next;
  }, null);
}

/** Hapus state onboarding (opsi "Ulangi Onboarding" di Settings). */
export async function deleteOnboarding(id: string): Promise<boolean> {
  return safeRedis(async () => {
    await withTimeout(getRedis().del(key(id)));
    return true;
  }, false);
}
