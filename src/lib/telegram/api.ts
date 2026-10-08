/**
 * Klien Bot API Telegram (server-only). Token HANYA dari env
 * TELEGRAM_BOT_TOKEN — tidak pernah di-commit, tidak pernah dikirim ke
 * client, tidak pernah muncul di log.
 */
import "server-only";

export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return Boolean(token && /^\d+:[\w-]{20,}$/.test(token));
}

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN kosong");
  return token;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

/** Panggil method Bot API. Gagal = return {ok:false} — tidak pernah throw. */
export async function callTelegram<T = unknown>(method: string, payload: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
  if (!isTelegramConfigured()) return { ok: false, description: "bot-not-configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${getBotToken()}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as TelegramApiResponse<T> | null;
    return json ?? { ok: false, description: `http-${res.status}` };
  } catch (err) {
    // Jangan log token/payload — cukup method + pesan error generik.
    console.error(`[telegram] ${method} gagal:`, err instanceof Error ? err.message : "unknown");
    return { ok: false, description: "network-error" };
  }
}

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts?: { buttons?: InlineButton[][]; disablePreview?: boolean }
): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4000),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: opts?.disablePreview ?? true },
    ...(opts?.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  opts?: { buttons?: InlineButton[][] }
): Promise<void> {
  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: text.slice(0, 4000),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(opts?.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
  });
}

export async function answerCallbackQuery(id: string, text?: string): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text: text.slice(0, 190) } : {}),
  });
}

/** Escape HTML untuk parse_mode=HTML (teks dari user wajib di-escape). */
export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
