import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Proxy poster eksternal. Dipakai agar poster (anichin/otakudesu) tidak
 * bergantung pada hotlink dari browser user (diblok ORB/Cloudflare di sebagian
 * jaringan). SSRF: hanya host allowlist, https saja, redirect TIDAK diikuti,
 * wajib content-type image/*, ukuran maks 4MB.
 */
const ALLOWED_HOSTS = new Set([
  "anichin.moe",
  "www.anichin.moe",
  "otakudesu.blog",
  "www.otakudesu.blog",
]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, { bucket: "img-proxy", limit: 120, windowSec: 60 });
  if (limited) return limited;

  const raw = new URL(request.url).searchParams.get("u");
  if (!raw || raw.length > 500) return new NextResponse(null, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "https:" || target.username || target.password || target.port) {
    return new NextResponse(null, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) return new NextResponse(null, { status: 403 });

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return new NextResponse(null, { status: 502 });
    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return new NextResponse(null, { status: 415 });
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
