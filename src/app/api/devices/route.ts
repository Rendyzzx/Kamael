import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  isDeviceStoreActive,
  listUserDevices,
  registerDevice,
  touchDevice,
  unregisterDevice,
} from "@/lib/notify/devices";

/**
 * Registrasi device token push (FCM Android; platform "web" disiapkan untuk
 * web push). Dipakai app Android: daftar token setelah login, update token
 * saat berubah (POST upsert), unregister saat logout.
 *
 * GET    /api/devices                    -> daftar device milik user (tanpa token)
 * POST   /api/devices { platform, token, deviceId } -> upsert (register/update)
 * PATCH  /api/devices { deviceId }        -> refresh lastSeenAt (app foreground)
 * DELETE /api/devices?deviceId=...        -> unregister (logout)
 *
 * userId SELALU dari session server-side — tidak pernah dari body.
 */

interface DeviceBody {
  platform?: unknown;
  token?: unknown;
  deviceId?: unknown;
}

function validatePlatform(v: unknown): "web" | "android" | null {
  return v === "android" || v === "web" ? v : null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(req, { bucket: "dev-read", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  if (!isDeviceStoreActive()) {
    return NextResponse.json({ devices: [], notice: "Device store nonaktif (Redis belum dikonfigurasi)" });
  }
  const devices = await listUserDevices(userId);
  return NextResponse.json({ devices }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DeviceBody;
  try {
    body = (await req.json()) as DeviceBody;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const platform = validatePlatform(body.platform);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";

  if (!platform) return NextResponse.json({ error: "platform harus android atau web" }, { status: 400 });
  if (token.length < 20 || token.length > 4096) {
    return NextResponse.json({ error: "token tidak valid" }, { status: 400 });
  }
  if (deviceId.length < 1 || deviceId.length > 128) {
    return NextResponse.json({ error: "deviceId wajib (1-128 karakter)" }, { status: 400 });
  }

  const limited = await enforceRateLimit(req, { bucket: "dev-write", limit: 30, windowSec: 60 }, userId);
  if (limited) return limited;

  const ok = await registerDevice({ userId, deviceId, platform, token });
  if (!ok) {
    // Redis tidak aktif — fitur notifikasi degraded, bukan error user.
    return NextResponse.json({ ok: false, notice: "Device store belum aktif" }, { status: 202 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DeviceBody;
  try {
    body = (await req.json()) as DeviceBody;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  if (!deviceId || deviceId.length > 128) {
    return NextResponse.json({ error: "deviceId wajib" }, { status: 400 });
  }

  const limited = await enforceRateLimit(req, { bucket: "dev-write", limit: 60, windowSec: 60 }, userId);
  if (limited) return limited;

  await touchDevice(userId, deviceId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(req, { bucket: "dev-write", limit: 30, windowSec: 60 }, userId);
  if (limited) return limited;

  const deviceId = req.nextUrl.searchParams.get("deviceId")?.trim() ?? "";
  if (!deviceId || deviceId.length > 128) {
    return NextResponse.json({ error: "deviceId wajib" }, { status: 400 });
  }

  await unregisterDevice(userId, deviceId);
  return NextResponse.json({ ok: true });
}
