/**
 * System settings — state global yang dibagi Web & Android:
 * maintenance (per platform) dan versi aplikasi Android.
 *
 * Disimpan di Redis (bukan DB baru — Redis sudah dipakai untuk semua data
 * user). Fail-open: jika Redis tidak terjangkau, maintenance dianggap OFF
 * supaya situs TIDAK pernah mati hanya karena cache/state error.
 *
 * Struktur maintenance (satu key JSON):
 *   system:maintenance = { web, android, global, message, estimatedEnd,
 *                          updatedAt, updatedBy }
 *
 * Efektif per platform:
 *   web     aktif = global || web
 *   android aktif = global || android
 */
import "server-only";
import { getRedis, safeRedis } from "@/lib/redis/client";

export interface MaintenanceState {
  /** Maintenance khusus Web (halaman; /api tetap melayani Android). */
  web: boolean;
  /** Maintenance khusus Android (ditegakkan app via /api/system/status). */
  android: boolean;
  /** Global: kedua platform maintenance. */
  global: boolean;
  message: string;
  /** ISO 8601, opsional. */
  estimatedEnd: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface AppVersionInfo {
  latestVersion: string;
  minimumVersion: string;
  downloadUrl: string | null;
}

const KEY_MAINTENANCE = "system:maintenance";
const KEY_APP_VERSION = "system:appversion";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Website sedang diperbarui atau diperbaiki. Silakan kembali beberapa saat lagi.";

const MAX_MESSAGE = 500;

export function defaultMaintenance(): MaintenanceState {
  return {
    web: false,
    android: false,
    global: false,
    message: DEFAULT_MAINTENANCE_MESSAGE,
    estimatedEnd: null,
    updatedAt: "",
    updatedBy: "system",
  };
}

/** Parse + validasi state dari Redis; field rusak diabaikan (fail ke default). */
function parseMaintenance(raw: unknown): MaintenanceState {
  const base = defaultMaintenance();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  return {
    web: r.web === true,
    android: r.android === true,
    global: r.global === true,
    message:
      typeof r.message === "string" && r.message.trim().length > 0
        ? r.message.trim().slice(0, MAX_MESSAGE)
        : base.message,
    estimatedEnd:
      typeof r.estimatedEnd === "string" && !Number.isNaN(Date.parse(r.estimatedEnd))
        ? r.estimatedEnd
        : null,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
    updatedBy: typeof r.updatedBy === "string" ? r.updatedBy.slice(0, 60) : "system",
  };
}

/** Maintenance aktif untuk Web? */
export function isWebMaintenance(m: MaintenanceState): boolean {
  return m.global || m.web;
}

/** Maintenance aktif untuk Android? */
export function isAndroidMaintenance(m: MaintenanceState): boolean {
  return m.global || m.android;
}

/** Baca state maintenance (fail-open: default OFF saat Redis bermasalah). */
export async function getMaintenance(): Promise<MaintenanceState> {
  const raw = await safeRedis(async () => {
    const redis = getRedis();
    return redis.get<Record<string, unknown>>(KEY_MAINTENANCE);
  }, null);
  return parseMaintenance(raw);
}

export interface MaintenancePatch {
  web?: boolean;
  android?: boolean;
  global?: boolean;
  message?: string;
  estimatedEnd?: string | null;
}

/**
 * Merge patch ke state saat ini lalu simpan. Mengembalikan state baru.
 * `updatedBy` = identitas sumber perubahan (mis. "telegram:12345").
 */
export async function setMaintenance(patch: MaintenancePatch, updatedBy: string): Promise<MaintenanceState> {
  const current = await getMaintenance();
  const next: MaintenanceState = {
    ...current,
    web: patch.web ?? current.web,
    android: patch.android ?? current.android,
    global: patch.global ?? current.global,
    message:
      typeof patch.message === "string" && patch.message.trim().length > 0
        ? patch.message.trim().slice(0, MAX_MESSAGE)
        : current.message,
    estimatedEnd:
      patch.estimatedEnd === null
        ? null
        : typeof patch.estimatedEnd === "string" && !Number.isNaN(Date.parse(patch.estimatedEnd))
          ? patch.estimatedEnd
          : current.estimatedEnd,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy.slice(0, 60),
  };
  invalidateMaintenanceCache();
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.set(KEY_MAINTENANCE, JSON.stringify(next));
    return true;
  }, false);
  return next;
}

/* ---------- cache baca (middleware & status endpoint) ---------- */

let cache: { at: number; value: MaintenanceState } | null = null;
const CACHE_TTL_MS = 10_000;

/**
 * Versi ter-cache (TTL 10 detik per instance) — dipakai middleware supaya
 * tidak memukul Redis di setiap request halaman. Admin bypass & perubahan
 * via Telegram memakai TTL pendek ini agar cepat terasa.
 */
export async function getMaintenanceCached(): Promise<MaintenanceState> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await getMaintenance();
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateMaintenanceCache(): void {
  cache = null;
}

/* ---------- versi aplikasi Android ---------- */

export function defaultAppVersion(): AppVersionInfo {
  return {
    latestVersion: (process.env.APP_LATEST_VERSION || "1.0.0").trim(),
    minimumVersion: (process.env.APP_MINIMUM_VERSION || "1.0.0").trim(),
    downloadUrl: process.env.APP_DOWNLOAD_URL?.trim() || null,
  };
}

/**
 * Info versi Android. Sumber utama: env (diubah admin lewat Vercel tanpa
 * redeploy code); Redis key `system:appversion` bisa dipakai untuk override
 * runtime jika suatu saat perlu.
 */
export async function getAppVersion(): Promise<AppVersionInfo> {
  const raw = await safeRedis(async () => {
    const redis = getRedis();
    return redis.get<Record<string, unknown>>(KEY_APP_VERSION);
  }, null);
  const base = defaultAppVersion();
  if (typeof raw !== "object" || raw === null) return base;
  return {
    latestVersion:
      typeof raw.latestVersion === "string" && /^\d+(\.\d+){0,3}$/.test(raw.latestVersion)
        ? raw.latestVersion
        : base.latestVersion,
    minimumVersion:
      typeof raw.minimumVersion === "string" && /^\d+(\.\d+){0,3}$/.test(raw.minimumVersion)
        ? raw.minimumVersion
        : base.minimumVersion,
    downloadUrl:
      typeof raw.downloadUrl === "string" && /^https?:\/\//i.test(raw.downloadUrl)
        ? raw.downloadUrl
        : base.downloadUrl,
  };
}
