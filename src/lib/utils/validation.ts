/**
 * Validasi & util kecil. Semua input user (slug, page, query) divalidasi
 * sebelum menyentuh adapter/API.
 */

const SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,200}$/i;
// AnimeIn: serverId komposit "<episodeId>:<rowId>" (resolve lazy).
const SERVER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,120}$/;

/** Validasi slug episode/anime/donghua/genre. Return null jika tidak valid. */
export function validateSlug(slug: string): string | null {
  const s = (slug ?? "").toString().trim();
  if (!SLUG_RE.test(s)) return null;
  return s;
}

/** Validasi serverId untuk resolve URL embed. */
export function validateServerId(serverId: string): string | null {
  const s = (serverId ?? "").toString().trim();
  if (!SERVER_ID_RE.test(s)) return null;
  return s;
}

/** Validasi & clamp nomor halaman. Default 1. */
export function validatePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, 500);
}

/** Sanitasi keyword pencarian: buang karakter aneh, batasi panjang. */
export function sanitizeSearchQuery(raw: string | undefined | null): string {
  const s = (raw ?? "").toString().trim().replace(/[\u0000-\u001f<>]/g, "");
  return s.slice(0, 80);
}

/** Ambil nama tampil dari judul episode, mis. "Solo Leveling Episode 05 Subtitle Indonesia". */
export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Potong judul episode "X Episode N Subtitle Indonesia" jadi "Episode N". */
export function episodeLabel(title: string, fallback = "Episode"): string {
  const m = title.match(/episode\s*([\d.]+)/i);
  if (m) return `Episode ${m[1]}`;
  return fallback;
}

/**
 * Validasi URL target untuk pengecekan embeddability (/api/embed-check).
 * Hanya http(s), bukan localhost/IP privat — endpoint ini melakukan fetch
 * server-side ke URL yang diberikan, jadi harus ditutup dari penyalahgunaan
 * sebagai proxy SSRF ke jaringan internal.
 */
export function isSafeEmbedUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return isSafeEmbedHost(u);
}

/**
 * Validasi host+protokol untuk URL embed (dipakai juga TIAP hop redirect di
 * /api/embed-check, bukan hanya URL awal).
 *
 * Yang ditolak: non-http(s), localhost & semua alias-nya, IPv4 privat/CGNAT/
 * link-local/multicast dalam SEMUA notasi (desimal "2130706433", hex
 * "0x7f000001", oktal "0177.0.0.1", singkatan "127.1"), IPv6 privat
 * (fc00::/7, fe80::/10, ::1, ::ffff: mapped), dan host satu-label tanpa
 * titik (mis. "http://intranet/") yang biasanya resolusi internal.
 *
 * Batasan jujur: DNS rebinding (host publik yang di-resolve ke IP privat
 * SETELAH pemeriksaan) tidak dicek di sini — butuh resolusi DNS per-hop;
 * mitigasi realistisnya adalah hop-hop redirect + tidak ada cookie/secret
 * internal yang pernah dikirim ke target, sehingga nilai SSRF-nya rendah.
 */
function isSafeEmbedHost(u: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv6: parse ke 8 grup numerik lalu uji rentangnya. URL API men-
  // serialisasi IPv6 kanonik (mis. ::ffff:127.0.0.1 -> "::ffff:7f00:1"),
  // jadi pemeriksaan berbasis string saja tidak cukup.
  if (host.includes(":")) {
    const groups = parseIpv6(host);
    if (!groups) return false; // format tidak dikenal -> tolak (fail-closed)

    // Semua nol (::) atau loopback ::1.
    if (groups.every((g) => g === 0)) return false;
    if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return false;

    const first = groups[0];
    // fc00::/7 unique-local: 16 bit pertama 0xfc00-0xfdff.
    if ((first & 0xfe00) === 0xfc00) return false;
    // fe80::/10 link-local: 10 bit pertama 0b1111111010.
    if ((first & 0xffc0) === 0xfe80) return false;
    // IPv4-mapped ::ffff:0:0/96 -> uji bagian IPv4-nya.
    if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
      const ipv4 = ((groups[6] << 16) | groups[7]) >>> 0;
      return isPublicIpv4(ipv4);
    }
    return true;
  }

  // Host satu-label tanpa titik (kecuali tidak ada yang sah untuk embed
  // eksternal) → tolak: biasanya nama internal/intranet.
  if (!host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return false;

  // Notasi numerik IPv4 dalam bentuk apa pun: langsung uji parse sebagai int.
  const asInt = ipv4ToLong(host);
  if (asInt !== null && !isPublicIpv4(asInt)) return false;

  // Nama DNS biasa, tapi mengandung pola notasi oktal/hex per komponen
  // (mis. "0177.0.0.1", "0x7f.1") yang parseInt di atas sudah tangkap.
  return true;
}


/** Parse IPv6 ke 8 grup u16. Return null bila format tidak valid. */
function parseIpv6(host: string): number[] | null {
  let h = host;
  // Bagian dotted-quad di akhir (mis. ::ffff:1.2.3.4) -> konversi ke dua grup hex.
  const dotted = h.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) {
    const n = ipv4ToLong(dotted[1]);
    if (n === null) return null;
    const hi = ((n >>> 16) & 0xffff).toString(16);
    const lo = (n & 0xffff).toString(16);
    h = h.slice(0, dotted.index) + hi + ":" + lo;
  }
  const halves = h.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) =>
    part === "" ? [] : part.split(":").map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? Number.parseInt(g, 16) : NaN));
  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  if (head.includes(NaN) || tail.includes(NaN)) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && head.length !== 8)) return null;
  return [...head, ...new Array(halves.length === 2 ? missing : 0).fill(0), ...tail];
}

function ipv4ToLong(host: string): number | null {
  // "127.1" dan sejenisnya (singkatan oktet) — ekspansi ala resolver.
  const parts = host.split(".");
  if (parts.length === 4 || (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1]))) {
    const nums = parts.map((p) => {
      if (/^0x/i.test(p)) return Number.parseInt(p, 16);
      if (/^0\d/.test(p)) return Number.parseInt(p, 8); // oktal
      return Number(p);
    });
    if (nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const expanded =
        parts.length === 4
          ? nums
          : [nums[0], (nums[1] >> 16) & 255, (nums[1] >> 8) & 255, nums[1] & 255];
      return ((expanded[0] << 24) | (expanded[1] << 16) | (expanded[2] << 8) | expanded[3]) >>> 0;
    }
  }
  // Desimal penuh: "2130706433".
  if (/^\d{1,10}$/.test(host)) {
    const n = Number(host);
    if (n <= 0xffffffff) return n;
  }
  return null;
}

function isPublicIpv4(n: number): boolean {
  const a = (n >>> 24) & 255;
  const b = (n >>> 16) & 255;
  if (a === 0 || a === 10 || a === 127) return false;              // 0/8, 10/8, loopback
  if (a === 169 && b === 254) return false;                         // link-local
  if (a === 172 && b >= 16 && b <= 31) return false;                // 172.16/12
  if (a === 192 && b === 168) return false;                         // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return false;               // CGNAT 100.64/10
  if (a >= 224) return false;                                      // multicast + reserved
  return true;
}
