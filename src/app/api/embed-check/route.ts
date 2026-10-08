import { NextResponse } from "next/server";
import { isSafeEmbedUrl } from "@/lib/utils/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Cek apakah URL embed (server pihak ketiga) BENAR-BENAR bisa ditampilkan
 * di iframe situs kita, sebelum diikutkan ke race.
 *
 * Keamanan (SSRF): URL awal DAN SETIAP hop redirect divalidasi ulang lewat
 * isSafeEmbedUrl (blok localhost/IP privat/CGNAT/link-local dalam semua
 * notasi, protokol non-http, host satu-label). Redirect diikuti MANUAL —
 * maksimal 5 hop — bukan redirect:"follow" (yang bisa mendarat di host
 * internal TANPA diverifikasi).
 *
 * Endpoint ini adalah fetch ke URL eksternal pilihan user → wajib rate limit
 * (paling ketat setelah report) supaya tidak jadi proxy scanning.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 5;

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, { bucket: "embed-check", limit: 20, windowSec: 60 });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url") ?? "";
  if (target.length > 2000) {
    return NextResponse.json({ embeddable: false }, { status: 400 });
  }

  if (!isSafeEmbedUrl(target)) {
    return NextResponse.json({ embeddable: false }, { status: 400 });
  }

  let current = target;
  try {
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // Validasi ULANG tiap hop: Location bisa mengarah ke host internal.
      if (!isSafeEmbedUrl(current)) {
        return NextResponse.json({ embeddable: false }, { status: 400 });
      }
      res = await fetch(current, {
        method: "GET",
        headers: { "User-Agent": BROWSER_UA },
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      // Kita hanya butuh header — hentikan unduhan body secepatnya.
      res.body?.cancel().catch(() => {});
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) break; // redirect tanpa target: perlakukan sebagai gagal cek
        current = new URL(location, current).toString();
        continue;
      }
      break;
    }
    if (!res) {
      return NextResponse.json({ embeddable: false }, { status: 502 });
    }

    const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
    if (xfo.includes("deny") || xfo.includes("sameorigin")) {
      return NextResponse.json({ embeddable: false });
    }

    const csp = res.headers.get("content-security-policy") || "";
    const match = csp.match(/frame-ancestors\s+([^;]+)/i);
    if (match) {
      // Token HARUS "*" persis (bebas untuk semua). "https://*.domain.com"
      // juga mengandung karakter '*' tapi itu wildcard SUBDOMAIN untuk satu
      // domain spesifik, bukan izin terbuka — jadi dicek per token, bukan
      // substring mentah.
      const tokens = match[1].trim().split(/\s+/);
      const allowsAny = tokens.includes("*");
      if (!allowsAny) {
        return NextResponse.json({ embeddable: false });
      }
    }

    return NextResponse.json(
      { embeddable: true },
      // Hasil per-URL bersifat publik (boolean) — aman & hemat bandwidth
      // bila di-cache singkat di edge.
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[api/embed-check]", err instanceof Error ? err.message : "unknown error");
    // Gagal diperiksa → anggap TIDAK bisa (fail-closed). Lebih baik server
    // ini dilewati daripada race "menang" dengan frame yang berisiko kosong.
    return NextResponse.json({ embeddable: false }, { status: 502 });
  }
}
