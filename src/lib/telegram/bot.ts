/**
 * Telegram Bot Admin — control panel Cyronime (maintenance, status, broadcast).
 *
 * KEAMANAN (aturan keras):
 *  - Hanya numeric Telegram user ID di env ADMIN_TELEGRAM_IDS yang diakui.
 *    Username TIDAK dipakai untuk authorization (bisa dipalsukan/diubah).
 *  - Webhook diverifikasi secret token di route handler; bot ini hanya
 *    menerima update yang sudah lolos verifikasi itu.
 *  - Tidak ada secret/token yang pernah dikirim balik ke chat.
 */
import "server-only";
import { getRedis, safeRedis } from "@/lib/redis/client";
import {
  getAppVersion,
  getMaintenanceCached,
  isAndroidMaintenance,
  isWebMaintenance,
  setMaintenance,
  type MaintenanceState,
} from "@/lib/system/settings";
import { countDevices } from "@/lib/notify/devices";
import {
  BROADCAST_CATEGORIES,
  type BroadcastCategory,
} from "@/lib/notify/prefs";
import type { TargetPlatform } from "@/lib/notify/records";
import { countTargetDevices, dispatchBroadcast } from "@/lib/notify/dispatch";
import { checkRateLimit } from "@/lib/rate-limit";
import pkg from "../../../package.json";
import { answerCallbackQuery, callTelegram, editMessageText, esc, sendMessage } from "./api";

/* ---------- struktur update ---------- */

interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
}

interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: { message_id: number; chat: { id: number } };
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

/* ---------- authorization admin ---------- */

/** Parse ADMIN_TELEGRAM_IDS -> Set numeric ID (string). Koma atau spasi. */
export function parseAdminIds(): Set<string> {
  const raw = process.env.ADMIN_TELEGRAM_IDS ?? "";
  return new Set(
    raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{3,15}$/.test(s))
  );
}

export function isAdminTelegramUser(fromId: number): boolean {
  return parseAdminIds().has(String(fromId));
}

/* ---------- state wizard /notify (Redis, TTL 10 menit) ---------- */

interface PendingBroadcast {
  step: "title" | "body" | "platform" | "category" | "confirm";
  title?: string;
  body?: string;
  platform?: TargetPlatform;
  category?: BroadcastCategory;
}

const pendingKey = (chatId: number) => `telegram:pending:${chatId}`;
const PENDING_TTL = 600;

async function getPending(chatId: number): Promise<PendingBroadcast | null> {
  return safeRedis(async () => {
    const redis = getRedis();
    const raw = await redis.get(pendingKey(chatId));
    if (typeof raw !== "object" || raw === null) return null;
    const p = raw as unknown as PendingBroadcast;
    return p && typeof p.step === "string" ? p : null;
  }, null);
}

async function setPending(chatId: number, pending: PendingBroadcast): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.set(pendingKey(chatId), JSON.stringify(pending), { ex: PENDING_TTL });
    return true;
  }, false);
}

async function clearPending(chatId: number): Promise<void> {
  await safeRedis(async () => {
    const redis = getRedis();
    await redis.del(pendingKey(chatId));
    return true;
  }, false);
}

/* ---------- helper tampilan ---------- */

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso)) + " WIB";
  } catch {
    return iso;
  }
}

function statusLabel(m: MaintenanceState): string {
  const web = isWebMaintenance(m) ? "MAINTENANCE" : "ONLINE";
  const android = isAndroidMaintenance(m) ? "MAINTENANCE" : "ONLINE";
  return [
    `<b>Status Cyronime</b>`,
    ``,
    `WEB: <b>${web}</b>`,
    `ANDROID: <b>${android}</b>`,
    `Global maintenance: <b>${m.global ? "ON" : "OFF"}</b>`,
    ``,
    `Pesan: ${esc(m.message || "-")}`,
    `Perkiraan selesai: ${fmtDate(m.estimatedEnd)}`,
  ].join("\n");
}

async function userStats(): Promise<string> {
  const knownUsers = await safeRedis(async () => {
    const redis = getRedis();
    return redis.scard("users:known");
  }, 0);
  const androidDevices = await countDevices("android");
  const webDevices = await countDevices("web");
  return [
    "<b>Statistik User</b>",
    "",
    `User terdaftar: <b>${knownUsers}</b>`,
    `Device Android terdaftar: <b>${androidDevices}</b> (FCM)`,
    `Device Web terdaftar: <b>${webDevices}</b>`,
  ].join("\n");
}

const HELP_TEXT = [
  "<b>Cyronime Admin Bot</b>",
  "",
  "<b>Status & Maintenance</b>",
  "/status — status sistem lengkap",
  "/maintenance — lihat state maintenance",
  "/maintenance web|android|all on|off — maintenance per platform",
  "/maintenance_on — maintenance global ON",
  "/maintenance_off — matikan semua maintenance",
  "/maintenance_message teks | perkiraan selesai — ubah pesan",
  "",
  "<b>Notification</b>",
  "/notify — buat broadcast lewat wizard (Judul, Isi, Target)",
  "/broadcast Judul | Isi — broadcast cepat ke semua device",
  "",
  "<b>Info</b>",
  "/users — statistik user & device",
  "/version — versi Web & Android",
  "/fixwebhook — pasang ulang webhook (aktifkan tombol inline)",
  "/help — daftar command",
].join("\n");

/* ---------- command ---------- */

async function handleCommand(chatId: number, text: string): Promise<void> {
  const parts = text.trim().split(/\s+/);
  const cmd = (parts[0] ?? "").split("@")[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "/start":
    case "/help": {
      await sendMessage(chatId, HELP_TEXT);
      return;
    }

    case "/status": {
      const m = await getMaintenanceCached();
      const version = await getAppVersion();
      await sendMessage(
        chatId,
        [
          statusLabel(m),
          "",
          `<b>Versi</b>`,
          `Web: <b>${esc(pkg.version)}</b>`,
          `Android: <b>${esc(version.latestVersion)}</b> (min. didukung: ${esc(version.minimumVersion)})`,
        ].join("\n")
      );
      return;
    }

    case "/users": {
      await sendMessage(chatId, await userStats());
      return;
    }

    case "/fixwebhook": {
      // Pasang ulang webhook dari server: memakai TELEGRAM_WEBHOOK_SECRET asli
      // di env, dan WAJIB menyertakan callback_query supaya tombol inline
      // (wizard /notify, CONFIRM/CANCEL) sampai ke server.
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
      const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyronime.web.id").trim().replace(/\/+$/, "");
      if (!secret) {
        await sendMessage(chatId, "TELEGRAM_WEBHOOK_SECRET belum diset di server.");
        return;
      }
      const res = await callTelegram("setWebhook", {
        url: `${site}/api/telegram/webhook`,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      });
      const info = await callTelegram<{ allowed_updates?: string[]; last_error_message?: string }>("getWebhookInfo", {});
      await sendMessage(
        chatId,
        res.ok
          ? [
              "Webhook <b>dipasang ulang</b>.",
              `Update diizinkan: <code>${esc((info.result?.allowed_updates ?? []).join(", ") || "-")}</code>`,
              `Error terakhir: ${esc(info.result?.last_error_message ?? "-")}`,
              "",
              "Coba /notify lagi — tombol sekarang harus merespons.",
            ].join("\n")
          : `Gagal memasang webhook: ${esc(res.description ?? "unknown")}`
      );
      return;
    }

    case "/version": {
      const version = await getAppVersion();
      await sendMessage(
        chatId,
        [
          "<b>Versi Cyronime</b>",
          "",
          `Web: <b>${esc(pkg.version)}</b>`,
          `Android latest: <b>${esc(version.latestVersion)}</b>`,
          `Android minimum: <b>${esc(version.minimumVersion)}</b>`,
          version.downloadUrl ? `Download: ${esc(version.downloadUrl)}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
      return;
    }

    case "/maintenance_on": {
      await setMaintenance({ global: true }, `telegram:${chatId}`);
      await sendMessage(
        chatId,
        ["Maintenance berhasil diaktifkan.", "", `WEB: <b>MAINTENANCE</b>`, `ANDROID: <b>MAINTENANCE</b>`].join("\n")
      );
      return;
    }

    case "/maintenance_off": {
      await setMaintenance({ global: false, web: false, android: false }, `telegram:${chatId}`);
      await sendMessage(
        chatId,
        ["Maintenance berhasil dimatikan.", "", `WEB: <b>ONLINE</b>`, `ANDROID: <b>ONLINE</b>`].join("\n")
      );
      return;
    }

    case "/maintenance_message": {
      const joined = args.join(" ").trim();
      if (!joined) {
        await sendMessage(
          chatId,
          "Format: <code>/maintenance_message Pesan maintenance | perkiraan selesai</code>\nBagian setelah <code>|</code> opsional (contoh: <code>2 jam lagi</code> atau ISO datetime)."
        );
        return;
      }
      const [messagePart, etaPart] = joined.split("|").map((s) => s.trim());
      const estimatedEnd = etaPart ? new Date(etaPart).toISOString() : null;
      const m = await setMaintenance({ message: messagePart, estimatedEnd }, `telegram:${chatId}`);
      await sendMessage(
        chatId,
        [
          "Pesan maintenance diperbarui.",
          "",
          `Pesan: ${esc(m.message)}`,
          `Perkiraan selesai: ${fmtDate(m.estimatedEnd)}`,
        ].join("\n")
      );
      return;
    }

    case "/maintenance": {
      if (args.length === 0) {
        const m = await getMaintenanceCached();
        await sendMessage(
          chatId,
          [
            statusLabel(m),
            "",
            "Ubah dengan: <code>/maintenance web on</code>, <code>/maintenance android off</code>, atau <code>/maintenance all on</code>.",
          ].join("\n")
        );
        return;
      }
      // /maintenance <web|android|all> <on|off>
      const scope = args[0]?.toLowerCase();
      const state = args[1]?.toLowerCase();
      if (state !== "on" && state !== "off") {
        await sendMessage(chatId, "Format: <code>/maintenance web|android|all on|off</code>");
        return;
      }
      const on = state === "on";
      const updatedBy = `telegram:${chatId}`;
      if (scope === "web") {
        const m = await setMaintenance({ web: on }, updatedBy);
        await sendMessage(chatId, `Maintenance Web <b>${on ? "diaktifkan" : "dimatikan"}</b>.\n\nWEB: <b>${isWebMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>\nANDROID: <b>${isAndroidMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>`);
      } else if (scope === "android") {
        const m = await setMaintenance({ android: on }, updatedBy);
        await sendMessage(chatId, `Maintenance Android <b>${on ? "diaktifkan" : "dimatikan"}</b>.\n\nWEB: <b>${isWebMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>\nANDROID: <b>${isAndroidMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>`);
      } else if (scope === "all") {
        const m = await setMaintenance({ global: on, web: on, android: on }, updatedBy);
        await sendMessage(
          chatId,
          [
            `Maintenance global <b>${on ? "diaktifkan" : "dimatikan"}</b>.`,
            "",
            `WEB: <b>${isWebMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>`,
            `ANDROID: <b>${isAndroidMaintenance(m) ? "MAINTENANCE" : "ONLINE"}</b>`,
          ].join("\n")
        );
      } else {
        await sendMessage(chatId, "Scope harus <code>web</code>, <code>android</code>, atau <code>all</code>.");
      }
      return;
    }

    case "/notify": {
      await setPending(chatId, { step: "title" });
      await sendMessage(chatId, "Buat broadcast notification.\n\n<b>1/4</b> — Kirim <b>Judul</b> notification:");
      return;
    }

    case "/broadcast": {
      const joined = args.join(" ");
      const [title, body] = joined.split("|").map((s) => s.trim());
      if (!title || !body) {
        await sendMessage(chatId, 'Format: <code>/broadcast Judul notification | Isi notification</code>');
        return;
      }
      await setPending(chatId, { step: "confirm", title: title.slice(0, 120), body: body.slice(0, 500), platform: "all", category: "announcement" });
      await askConfirm(chatId, title.slice(0, 120), body.slice(0, 500), "all", "announcement");
      return;
    }

    default: {
      await sendMessage(chatId, `Command <b>${esc(cmd)}</b> tidak dikenal. Ketik /help untuk daftar command.`);
    }
  }
}

async function askConfirm(chatId: number, title: string, body: string, platform: TargetPlatform, category: BroadcastCategory): Promise<void> {
  const targets = await countTargetDevices(category, platform);
  await sendMessage(
    chatId,
    [
      "<b>Konfirmasi Broadcast</b>",
      "",
      `Judul: <b>${esc(title)}</b>`,
      `Isi: ${esc(body)}`,
      `Target: <b>${platform === "all" ? "Semua device" : platform === "android" ? "Android" : "Web"}</b>`,
      `Kategori: <b>${esc(categoryLabel(category))}</b>`,
      "",
      `Anda akan mengirim notification ke <b>${targets}</b> device.`,
    ].join("\n"),
    {
      buttons: [
        [
          { text: "CONFIRM", callback_data: "bc:go" },
          { text: "CANCEL", callback_data: "bc:cancel" },
        ],
      ],
    }
  );
}

function categoryLabel(c: BroadcastCategory): string {
  switch (c) {
    case "episode":
      return "Episode baru";
    case "favorite":
      return "Anime favorit";
    case "maintenance":
      return "Maintenance";
    case "update":
      return "Update aplikasi";
    default:
      return "Pengumuman";
  }
}

/* ---------- wizard text steps ---------- */

async function handleWizardText(chatId: number, text: string): Promise<void> {
  const pending = await getPending(chatId);
  if (!pending) {
    await sendMessage(chatId, "Ketik /help untuk daftar command.");
    return;
  }

  switch (pending.step) {
    case "title": {
      const title = text.trim().slice(0, 120);
      if (!title) {
        await sendMessage(chatId, "Judul tidak boleh kosong. Kirim Judul:");
        return;
      }
      await setPending(chatId, { ...pending, step: "body", title });
      await sendMessage(chatId, `<b>2/4</b> — Kirim <b>Isi</b> notification untuk "${esc(title)}":`);
      return;
    }
    case "body": {
      const body = text.trim().slice(0, 500);
      if (!body) {
        await sendMessage(chatId, "Isi tidak boleh kosong. Kirim Isi:");
        return;
      }
      await setPending(chatId, { ...pending, step: "platform", body });
      await sendMessage(chatId, `<b>3/4</b> — Pilih <b>Target</b> platform:`, {
        buttons: [
          [
            { text: "Semua device", callback_data: "np:all" },
            { text: "Android", callback_data: "np:android" },
            { text: "Web", callback_data: "np:web" },
          ],
        ],
      });
      return;
    }
    default: {
      await sendMessage(chatId, "Selesaikan konfirmasi sebelumnya (CONFIRM/CANCEL), atau /help.");
    }
  }
}

/* ---------- callback (tombol inline) ---------- */

async function handleCallback(cb: TgCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const data = cb.data ?? "";
  if (typeof chatId !== "number" || typeof messageId !== "number") return;

  const pending = await getPending(chatId);

  if (data.startsWith("np:")) {
    const platform = data.slice(3) as TargetPlatform;
    if (!pending || pending.step !== "platform" || (platform !== "all" && platform !== "android" && platform !== "web")) {
      await answerCallbackQuery(cb.id, "Sesi broadcast tidak ditemukan. Mulai ulang dengan /notify.");
      return;
    }
    await setPending(chatId, { ...pending, step: "category", platform });
    await answerCallbackQuery(cb.id, "Platform dipilih");
    await sendMessage(chatId, `<b>4/4</b> — Pilih <b>Kategori</b> (mempengaruhi preferensi user):`, {
      buttons: [
        [
          { text: "Episode baru", callback_data: "nc:episode" },
          { text: "Anime favorit", callback_data: "nc:favorite" },
        ],
        [
          { text: "Pengumuman", callback_data: "nc:announcement" },
          { text: "Maintenance", callback_data: "nc:maintenance" },
        ],
        [{ text: "Update aplikasi", callback_data: "nc:update" }],
      ],
    });
    return;
  }

  if (data.startsWith("nc:")) {
    const category = data.slice(3) as BroadcastCategory;
    if (
      !pending ||
      pending.step !== "category" ||
      !BROADCAST_CATEGORIES.includes(category)
    ) {
      await answerCallbackQuery(cb.id, "Sesi broadcast tidak ditemukan. Mulai ulang dengan /notify.");
      return;
    }
    await setPending(chatId, { ...pending, step: "confirm", category });
    await answerCallbackQuery(cb.id, "Kategori dipilih");
    await askConfirm(chatId, pending.title ?? "", pending.body ?? "", pending.platform ?? "all", category);
    return;
  }

  if (data === "bc:go" || data === "bc:cancel") {
    if (!pending || pending.step !== "confirm") {
      await answerCallbackQuery(cb.id, "Sesi broadcast kedaluwarsa. Mulai ulang dengan /notify.");
      await clearPending(chatId);
      return;
    }
    if (data === "bc:cancel") {
      await clearPending(chatId);
      await answerCallbackQuery(cb.id, "Broadcast dibatalkan");
      if (messageId) await editMessageText(chatId, messageId, "Broadcast <b>dibatalkan</b>.");
      return;
    }

    // CONFIRM — kirim sekarang.
    await answerCallbackQuery(cb.id, "Mengirim broadcast…");
    const result = await dispatchBroadcast({
      title: pending.title ?? "",
      body: pending.body ?? "",
      category: pending.category ?? "announcement",
      targetPlatform: pending.platform ?? "all",
      createdBy: `telegram:${cb.from.id}`,
    });
    await clearPending(chatId);
    if (messageId) {
      await editMessageText(
        chatId,
        messageId,
        result.fcmConfigured
          ? `Broadcast <b>terkirim</b>: ${result.sent}/${result.targets} device${result.failed ? ` (gagal: ${result.failed})` : ""}.`
          : `Broadcast dicatat, tapi <b>FCM belum dikonfigurasi</b> (FIREBASE_PROJECT_ID dll kosong). Target: ${result.targets} device.`
      );
    }
    return;
  }

  await answerCallbackQuery(cb.id, "Aksi tidak dikenal");
}

/* ---------- entry point (dipanggil webhook route) ---------- */

/**
 * Proses satu update Telegram. Semua error ditangkap — webhook selalu
 * membalas 200 supaya Telegram tidak mengulang update berkali-kali.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) {
      const from = update.callback_query.from;
      if (!isAdminTelegramUser(from.id)) {
        await answerCallbackQuery(update.callback_query.id, "Akses ditolak.");
        return;
      }
      // Rate limit per admin (anti spam tombol).
      const rl = await checkRateLimit(String(from.id), { bucket: "tg-cmd", limit: 30, windowSec: 60 });
      if (!rl.ok) {
        await answerCallbackQuery(update.callback_query.id, "Terlalu banyak aksi, tunggu sebentar.");
        return;
      }
      await handleCallback(update.callback_query);
      return;
    }

    const msg = update.message;
    if (!msg || !msg.text) return;
    const from = msg.from;
    if (!from) return;

    // Authorization: numeric ID SAJA. Username tidak pernah dipercaya.
    if (!isAdminTelegramUser(from.id)) {
      await sendMessage(msg.chat.id, "⛔ Anda tidak memiliki akses ke bot ini.");
      return;
    }

    const rl = await checkRateLimit(String(from.id), { bucket: "tg-cmd", limit: 30, windowSec: 60 });
    if (!rl.ok) {
      await sendMessage(msg.chat.id, "Terlalu banyak command. Tunggu sebentar.");
      return;
    }

    if (msg.text.trim().startsWith("/")) {
      await handleCommand(msg.chat.id, msg.text);
    } else {
      await handleWizardText(msg.chat.id, msg.text);
    }
  } catch (err) {
    console.error("[telegram] gagal memproses update:", err instanceof Error ? err.message : err);
  }
}

