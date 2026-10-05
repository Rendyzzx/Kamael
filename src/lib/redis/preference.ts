/**
 * Preferensi portal pembuka (Anime / Donghua) — WAJIB Redis, bukan localStorage.
 * Key: pref:{id} dengan value "anime" | "donghua".
 * id = user ID (login, Google sub) ATAU visitor ID dari cookie httpOnly.
 *
 * Semua operasi lewat safeRedis + timeout singkat: kegagalan/down Redis tidak
 * boleh membuat halaman macet atau error — pengunjung tetap bisa membuka web
 * (portal akan tampil lagi, itu kondisi aman).
 */
import "server-only";
import { getRedis, isRedisConfigured, safeRedis } from "./client";

export type PortalPreference = "anime" | "donghua";

const KEY_PREFIX = "pref:";
/** 1 tahun — sejajar masa berlaku cookie visitor. */
const TTL_SECONDS = 60 * 60 * 24 * 365;
/** Timeout pendek supaya render "/" tidak pernah menggantung lama. */
const REDIS_TIMEOUT_MS = 2_500;

function key(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

/** Batalkan operasi Redis yang lambat — jangan biarkan halaman menunggu lama. */
function withTimeout<T>(op: Promise<T>): Promise<T> {
  return Promise.race([
    op,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("redis-timeout")), REDIS_TIMEOUT_MS).unref?.();
    }),
  ]);
}

function isPreference(value: unknown): value is PortalPreference {
  return value === "anime" || value === "donghua";
}

/** Ambil preferensi portal user/visitor. null = belum pernah memilih (atau Redis down). */
export async function getPreference(id: string): Promise<PortalPreference | null> {
  return safeRedis(async () => {
    const value = await withTimeout(getRedis().get<string>(key(id)));
    return isPreference(value) ? value : null;
  }, null);
}

/**
 * Sama seperti getPreference, tapi membedakan "belum pernah memilih" dari
 * "Redis tidak terjangkau" lewat `redisOk`. Dipakai di gerbang "/" dan
 * "/portal" supaya gangguan Redis TIDAK membuat pengunjung terjebak
 * bolak-balik "/" <-> "/portal" — saat redisOk false, "/" cukup default ke
 * "anime" dan tetap tampil (fail-open), bukan fail-closed ke portal lagi.
 */
export async function getPreferenceStatus(
  id: string
): Promise<{ value: PortalPreference | null; redisOk: boolean }> {
  if (!isRedisConfigured()) {
    return { value: null, redisOk: false };
  }
  try {
    const value = await withTimeout(getRedis().get<string>(key(id)));
    return { value: isPreference(value) ? value : null, redisOk: true };
  } catch (err) {
    console.error("[redis] getPreferenceStatus failed, falling back:", err);
    return { value: null, redisOk: false };
  }
}

/** Simpan preferensi. Return false bila Redis gagal/down (kondisi aman: portal tampil lagi). */
export async function setPreference(id: string, value: PortalPreference): Promise<boolean> {
  return safeRedis(async () => {
    await withTimeout(getRedis().set(key(id), value, { ex: TTL_SECONDS }));
    return true;
  }, false);
}

/** Hapus preferensi (opsi "Tampilkan portal lagi"). Return false bila Redis gagal. */
export async function deletePreference(id: string): Promise<boolean> {
  return safeRedis(async () => {
    await withTimeout(getRedis().del(key(id)));
    return true;
  }, false);
}
