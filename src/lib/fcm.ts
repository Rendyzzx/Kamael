/**
 * Firebase Cloud Messaging — pengirim push ANDROID, via HTTP v1 API.
 *
 * TANPA dependency firebase-admin: token akses OAuth2 dibuat sendiri
 * dari service account JWT (RS256, node:crypto) — ringan untuk serverless
 * dan tidak menambah ukuran bundle. Semua credential HANYA env server-side:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * Jangan pernah menaruh private key di repo/APK/frontend.
 */
import "server-only";
import crypto from "node:crypto";

export interface FcmPayload {
  title: string;
  body: string;
  image?: string | null;
  /** Data tambahan untuk deep link dsb. — semua nilai harus string. */
  data?: Record<string, string>;
}

export interface FcmSendResult {
  ok: boolean;
  /** True jika FCM menyatakan token tidak valid lagi -> wajib dihapus dari store. */
  invalidToken: boolean;
  error?: string;
}

export function isFcmConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  );
}

/* ---------- OAuth2 service-account token ---------- */

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function privateKeyPem(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n").trim();
  return raw.includes("-----BEGIN") ? raw : `-----BEGIN PRIVATE KEY-----\n${raw}\n-----END PRIVATE KEY-----`;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: process.env.FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKeyPem()).toString("base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FCM OAuth gagal (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (typeof json.access_token !== "string") throw new Error("FCM OAuth: token kosong");

  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in ?? 3600) - 120) * 1000,
  };
  return cachedAccessToken.token;
}

/* ---------- kirim pesan ---------- */

/**
 * Kirim satu pesan FCM HTTP v1. Token invalid (404/410/UNREGISTERED)
 * ditandai supaya caller menghapusnya dari device store.
 */
export async function sendFcm(token: string, payload: FcmPayload): Promise<FcmSendResult> {
  if (!isFcmConfigured()) return { ok: false, invalidToken: false, error: "fcm-not-configured" };

  const data = Object.fromEntries(
    Object.entries(payload.data ?? {})
      .filter(([k, v]) => typeof k === "string" && typeof v === "string")
      .slice(0, 10)
  );

  const message = {
    message: {
      token,
      notification: {
        title: payload.title.slice(0, 200),
        body: payload.body.slice(0, 1000),
        ...(payload.image ? { image: payload.image } : {}),
      },
      ...(Object.keys(data).length > 0 ? { data } : {}),
      android: {
        priority: "high" as const,
        notification: { channel_id: "cyronime_general" },
      },
    },
  };

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) return { ok: true, invalidToken: false };

    const errText = (await res.text().catch(() => "")).slice(0, 300);
    // 404 UNREGISTERED / 410 → token mati; 400 INVALID_ARGUMENT biasanya token rusak.
    const invalidToken = res.status === 404 || res.status === 410 || (res.status === 400 && /UNREGISTERED|INVALID/i.test(errText));
    return { ok: false, invalidToken, error: `fcm-http-${res.status}` };
  } catch (err) {
    return { ok: false, invalidToken: false, error: err instanceof Error ? err.message : "fcm-error" };
  }
}

/**
 * Kirim ke banyak token dengan konkurensi terbatas. Return agregat +
 * daftar token invalid untuk dibersihkan.
 */
export async function sendFcmToMany(
  tokens: string[],
  payload: FcmPayload,
  concurrency = 20
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tokens.length) {
      const token = tokens[idx++];
      const result = await sendFcm(token, payload);
      if (result.ok) sent++;
      else {
        failed++;
        if (result.invalidToken) invalidTokens.push(token);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tokens.length) }, worker));
  return { sent, failed, invalidTokens };
}
