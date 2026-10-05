import { NextResponse } from "next/server";
import { isSafeEmbedUrl } from "@/lib/utils/validation";

/**
 * Cek apakah URL embed (server pihak ketiga) BENAR-BENAR bisa ditampilkan
 * di iframe situs kita, sebelum diikutkan ke race.
 *
 * Alasan: event onLoad milik <iframe> TETAP terpicu walau konten di
 * dalamnya diblokir oleh X-Frame-Options atau CSP frame-ancestors milik
 * provider (mis. desustream/otakuwatch7 hanya mengizinkan iframe dari
 * otakudesu.blog) — jaringan permintaan tetap "berhasil" dari sudut
 * pandang browser, cuma renderingnya yang ditolak. Akibatnya race client
 * lama bisa "menang"-kan server yang sebenarnya tampil kosong/ikon rusak.
 * Pengecekan header di server ini mencegah kandidat semacam itu pernah
 * masuk ke race sama sekali.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url") ?? "";

  if (!isSafeEmbedUrl(target)) {
    return NextResponse.json({ embeddable: false }, { status: 400 });
  }

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    // Kita hanya butuh header — hentikan unduhan body secepatnya.
    res.body?.cancel().catch(() => {});

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

    return NextResponse.json({ embeddable: true });
  } catch (err) {
    console.error("[api/embed-check]", err instanceof Error ? err.message : "unknown error");
    // Gagal diperiksa → anggap TIDAK bisa (fail-closed). Lebih baik server
    // ini dilewati daripada race "menang" dengan frame yang berisiko kosong.
    return NextResponse.json({ embeddable: false }, { status: 502 });
  }
}
