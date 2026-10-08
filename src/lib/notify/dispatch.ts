/**
 * Dispatch broadcast notification — HANYA backend yang memanggil ini
 * (Telegram admin bot / tugas server lain). Client tidak pernah bisa
 * memicu broadcast langsung.
 *
 * Alur: pilih device sesuai platform -> filter preferensi user untuk
 * kategori -> kirim via FCM -> bersihkan token invalid -> log record.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { isFcmConfigured, sendFcmToMany } from "@/lib/fcm";
import { listDevices, unregisterToken, type DevicePlatform } from "./devices";
import {
  BROADCAST_CATEGORIES,
  getNotificationPreferences,
  isCategoryAllowed,
  type BroadcastCategory,
} from "./prefs";
import { logNotification, type NotificationRecord, type TargetPlatform } from "./records";

export interface BroadcastInput {
  title: string;
  body: string;
  category: BroadcastCategory;
  targetPlatform: TargetPlatform;
  createdBy: string;
  data?: Record<string, string>;
}

export interface BroadcastResult {
  targets: number;
  sent: number;
  failed: number;
  fcmConfigured: boolean;
}

function platformFilter(target: TargetPlatform): DevicePlatform | undefined {
  return target === "android" ? "android" : target === "web" ? "web" : undefined;
}

/** Kandidat device: cocok platform + pemiliknya mengizinkan kategori. */
async function collectTargets(input: Pick<BroadcastInput, "category" | "targetPlatform">) {
  const devices = await listDevices(platformFilter(input.targetPlatform));
  const category = BROADCAST_CATEGORIES.includes(input.category) ? input.category : "announcement";

  // Cache preferensi per userId (satu user bisa punya banyak device).
  const prefsCache = new Map<string, boolean>();
  const targets = [];
  for (const device of devices) {
    if (device.platform !== "android" && device.platform !== "web") continue;
    let allowed = prefsCache.get(device.userId);
    if (allowed === undefined) {
      const prefs = await getNotificationPreferences(device.userId);
      allowed = isCategoryAllowed(prefs, category);
      prefsCache.set(device.userId, allowed);
    }
    if (allowed) targets.push(device);
  }
  return { category, targets };
}

/** Hitung kandidat (untuk konfirmasi admin sebelum kirim) — tanpa mengirim. */
export async function countTargetDevices(
  category: BroadcastCategory,
  targetPlatform: TargetPlatform
): Promise<number> {
  const { targets } = await collectTargets({ category, targetPlatform });
  return targets.length;
}

/** Kirim broadcast. Selalu log record (bahkan saat FCM belum dikonfigurasi). */
export async function dispatchBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  const { category, targets } = await collectTargets(input);
  const fcmConfigured = isFcmConfigured();

  let sent = 0;
  let failed = 0;
  if (fcmConfigured && targets.length > 0) {
    const result = await sendFcmToMany(
      targets.map((t) => t.token),
      {
        title: input.title,
        body: input.body,
        data: input.data,
      }
    );
    sent = result.sent;
    failed = result.failed;
    // Bersihkan token yang sudah tidak valid agar tidak menumpuk.
    for (const token of result.invalidTokens) {
      await unregisterToken(token);
    }
    if (result.invalidTokens.length > 0) {
      console.log(`[notify] ${result.invalidTokens.length} token invalid dibersihkan`);
    }
  }

  const record: NotificationRecord = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    type: category,
    targetPlatform: input.targetPlatform,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    data: input.data ?? null,
    stats: { targets: targets.length, sent, failed },
  };
  await logNotification(record);

  return { targets: targets.length, sent, failed, fcmConfigured };
}
