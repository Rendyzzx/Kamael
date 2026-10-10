/**
 * Device tokens untuk push notification (FCM Android; web push menempati
 * platform "web" jika suatu saat diaktifkan). Backend yang mengirim push —
 * client hanya mendaftarkan/updating token miliknya.
 *
 * Struktur Redis (TIDAK ada DB baru):
 *   devices:index                hash: token -> JSON record (token = unique
 *                                constraint: HSET menimpa, tidak duplikat)
 *   devices:user:{userId}        hash: deviceId -> JSON {platform, token, ...}
 *
 * Jika token yang sama diregistrasi ulang (user ganti device, reinstall,
 * token pindah akun), field index tertimpa + hash user lama dibersihkan.
 */
import "server-only";
import { getRedis, isRedisConfigured, safeRedis } from "@/lib/redis/client";

export type DevicePlatform = "web" | "android";

export interface DeviceRecord {
  userId: string;
  deviceId: string;
  platform: DevicePlatform;
  token: string;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
}

const INDEX_KEY = "devices:index";
const userKey = (userId: string) => `devices:user:${userId}`;

function isPlatform(v: unknown): v is DevicePlatform {
  return v === "web" || v === "android";
}

/**
 * Upstash mem-parse nilai JSON secara otomatis: hget/hgetall mengembalikan
 * OBJEK, bukan string. Terima keduanya agar record tak terbuang diam-diam
 * (bug sebelumnya: JSON.parse(objek) -> catch -> null -> 0 device).
 */
function coerceRaw(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseRecord(input: unknown): DeviceRecord | null {
  const raw = coerceRaw(input);
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.token !== "string" || typeof r.userId !== "string" || !isPlatform(r.platform)) return null;
  return {
    userId: r.userId,
    deviceId: typeof r.deviceId === "string" ? r.deviceId : "",
    platform: r.platform,
    token: r.token,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
    lastSeenAt: typeof r.lastSeenAt === "number" ? r.lastSeenAt : 0,
  };
}

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  platform: DevicePlatform;
  token: string;
}

/**
 * Upsert token (register + update token berubah). Return false bila Redis
 * tidak aktif (fail-open: fitur notifikasi nonaktif, app tetap jalan).
 */
export async function registerDevice(input: RegisterDeviceInput): Promise<boolean> {
  return safeRedis(async () => {
    const redis = getRedis();
    const now = Date.now();

    // Token sudah terdaftar (mungkin di user lain)? Bersihkan hash user lama
    // supaya tidak ada token "yatim" yang menunjuk ke device index berbeda.
    const existingRaw = await redis.hget<Record<string, unknown>>(INDEX_KEY, input.token);
    const existing = parseRecord(existingRaw);
    if (existing && existing.userId !== input.userId) {
      await redis.hdel(userKey(existing.userId), existing.deviceId);
    }

    const record: DeviceRecord = {
      userId: input.userId,
      deviceId: input.deviceId,
      platform: input.platform,
      token: input.token,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastSeenAt: now,
    };
    await redis.hset(INDEX_KEY, { [input.token]: JSON.stringify(record) });
    await redis.hset(userKey(input.userId), {
      [input.deviceId]: JSON.stringify(record),
    });
    return true;
  }, false);
}

/** Hapus device milik user (logout / unregister). */
export async function unregisterDevice(userId: string, deviceId: string): Promise<boolean> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.hget<Record<string, unknown>>(userKey(userId), deviceId);
    const record = parseRecord(raw);
    if (record) {
      await redis.hdel(INDEX_KEY, record.token);
    }
    await redis.hdel(userKey(userId), deviceId);
    return true;
  }, false);
}

/** Hapus berdasarkan token (dipakai saat FCM bilang token invalid). */
export async function unregisterToken(token: string): Promise<boolean> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.hget<Record<string, unknown>>(INDEX_KEY, token);
    const record = parseRecord(raw);
    await redis.hdel(INDEX_KEY, token);
    if (record) {
      await redis.hdel(userKey(record.userId), record.deviceId);
    }
    return true;
  }, false);
}

/** Refresh lastSeenAt (dipanggil app saat startup/foreground). */
export async function touchDevice(userId: string, deviceId: string): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.hget<Record<string, unknown>>(userKey(userId), deviceId);
    const record = parseRecord(raw);
    if (!record) return false;
    const now = Date.now();
    const next = { ...record, lastSeenAt: now };
    await redis.hset(INDEX_KEY, { [record.token]: JSON.stringify(next) });
    await redis.hset(userKey(userId), { [deviceId]: JSON.stringify(next) });
    return true;
  }, false);
}

/** Semua device terdaftar, difilter per platform bila diminta. */
export async function listDevices(platform?: DevicePlatform): Promise<DeviceRecord[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    const all = await redis.hgetall<Record<string, unknown>>(INDEX_KEY);
    if (!all) return [];
    const records = Object.values(all)
      .map((raw) => parseRecord(raw))
      .filter((r): r is DeviceRecord => r !== null);
    return platform ? records.filter((r) => r.platform === platform) : records;
  }, []);
}

export async function countDevices(platform?: DevicePlatform): Promise<number> {
  const devices = await listDevices(platform);
  return devices.length;
}

/** Ringkasan device milik satu user — TANPA token (tidak pernah diekspos). */
export interface UserDeviceSummary {
  deviceId: string;
  platform: DevicePlatform;
  updatedAt: number;
  lastSeenAt: number;
}

export async function listUserDevices(userId: string): Promise<UserDeviceSummary[]> {
  return safeRedis(async () => {
    const redis = getRedis();
    const all = await redis.hgetall<Record<string, unknown>>(userKey(userId));
    if (!all) return [];
    return Object.entries(all).map(([deviceId, raw]) => {
      const record = parseRecord(raw);
      return {
        deviceId,
        platform: record?.platform ?? "android",
        updatedAt: record?.updatedAt ?? 0,
        lastSeenAt: record?.lastSeenAt ?? 0,
      };
    });
  }, []);
}

/** Info konfigurasi — dipakai endpoint untuk memberi pesan jujur ke client. */
export function isDeviceStoreActive(): boolean {
  return isRedisConfigured();
}
