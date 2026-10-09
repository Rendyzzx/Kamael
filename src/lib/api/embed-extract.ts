/**
 * Ekstraksi URL file langsung (HLS/MP4) dari halaman embed server pihak ketiga
 * (VidHide, DesuStream, dsb). Ini solusi playback Android: daripada WebView
 * (yang sering layar hitam/putih karena iklan & popup), backend membuka
 * halaman embed sekali, mengurai playernya, lalu menyerahkan direct file
 * (.m3u8/.mp4) ke ExoPlayer.
 *
 * Strategi ekstraksi (berurutan, ambil kandidat terbaik):
 * 1. Dean Edwards packer `eval(function(p,a,c,k,e,d))` — dipakai VidHide:
 *    kode player dipack jadi token base36. Di-unpack SECARA MURNI di sini
 *    (tanpa eval/Function — JS hasil scrape TIDAK PERNAH dieksekusi),
 *    lalu URL media dicari di hasil unpack.
 * 2. Scan HTML mentah — player lain sering menaruh `file:"https://..m3u8"`
 *    atau objek `sources:[{file:...}]` tanpa obfuscation.
 *
 * URL relatif ("/stream/../master.m3u8") di-resolve terhadap origin halaman.
 * Preferensi kandidat: master.m3u8 > index.m3u8 > m3u8 lain > mp4.
 *
 * Keamanan: URL awal & tiap hop redirect divalidasi isSafeEmbedUrl (anti
 * SSRF); hanya permintaan GET tanpa kredensial; tidak ada JS yang dieksekusi.
 */

import { isSafeEmbedUrl } from "@/lib/utils/validation";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 2_000_000; // 2 MB — cukup untuk halaman embed apapun

export interface ExtractedStream {
  /** URL file langsung yang bisa diputar ExoPlayer/<video>. */
  url: string;
  type: "hls" | "mp4";
  /** Host halaman embed asal (mis. "odvidhide.com"). */
  host: string;
  /** Metode ekstraksi yang berhasil — memudahkan debugging. */
  method: "packer" | "html";
}

/* ------------------------- fetch dengan SSRF guard ------------------------- */

async function fetchEmbedPage(startUrl: string): Promise<{ html: string; finalUrl: string } | null> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeEmbedUrl(current)) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        headers: { "User-Agent": DESKTOP_UA, Accept: "text/html,*/*" },
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      return null;
    }
    // 3xx: ikuti redirect manual (tiap hop divalidasi ulang).
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        current = new URL(loc, current).toString();
        continue;
      } catch {
        return null;
      }
    }
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) return null;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { html, finalUrl: current };
  }
  return null;
}

/* ------------------- unpack Dean Edwards packer (murni TS) ------------------- */

/**
 * Cari `eval(function(p,a,c,k,e,d){...}('P',A,C,'K'.split('|'),0,{}))`,
 * bongkar argumennya, dan jalankan algoritma unpack-nya TANPA eval:
 *   while(c--) if(k[c]) p = p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'), k[c]);
 * Radix valid untuk Number.prototype.toString: 2..36.
 */
function unpackPacker(html: string): string | null {
  const start = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (start < 0) return null;

  // Scan tanda kurung seimbang (sadar string & escape) untuk area eval(...).
  let depth = 0;
  let end = -1;
  for (let i = start + 4; i < html.length; i++) {
    const ch = html[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch;
      i++;
      while (i < html.length && html[i] !== q) {
        if (html[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;

  const call = html.slice(start + 5, end); // isi dalam eval( ... )
  // Bentuk: function(...){...}('P',A,C,'K'.split('|'),0,{})
  const argStart = call.indexOf("}(");
  if (argStart < 0) return null;

  // Tokenizer argumen: baca string/angka hingga koma di level atas.
  const raw = call.slice(argStart + 2);
  const args: string[] = [];
  let i = 0;
  while (i < raw.length && args.length < 5) {
    const ch = raw[i];
    if (ch === "'" || ch === '"') {
      // string (dengan escape) — ikutkan suffix .split('|') bila menempel
      const q = ch;
      i++;
      let s = "";
      while (i < raw.length && raw[i] !== q) {
        if (raw[i] === "\\") {
          // pertahankan escape persis seperti sumbernya; pakai JSON parse di bawah
          s += raw[i] + raw[i + 1];
          i += 2;
        } else {
          s += raw[i];
          i++;
        }
      }
      i++; // tutup quote
      // sufiks yang mungkin menempel pada string: .split('|')
      const rest = raw.slice(i);
      const splitMatch = rest.match(/^\.split\('([^']*)'\)/);
      if (splitMatch) {
        // simpan sebagai array literal
        args.push(JSON.stringify(s.split(splitMatch[1])));
        i += splitMatch[0].length;
      } else {
        // simpan sebagai string dengan escape JSON-ish
        args.push(JSON.stringify(s));
      }
    } else if (/[0-9]/.test(ch)) {
      let n = "";
      while (i < raw.length && /[0-9]/.test(raw[i])) n += raw[i++];
      args.push(n);
    } else if (ch === "," || ch === " ") {
      i++;
      continue;
    } else {
      // objek {..} / ekspresi lain -> hentikan (argumen k & setelahnya tak dibutuhkan begitu)
      if (ch === "{") {
        // lewati objek seimbang
        let d = 0;
        while (i < raw.length) {
          if (raw[i] === "{") d++;
          if (raw[i] === "}") d--;
          i++;
          if (d === 0) break;
        }
        args.push("{}");
        continue;
      }
      i++;
    }
    // skip sampai koma berikutnya
    while (i < raw.length && raw[i] !== "," && args.length < 5) {
      if (raw[i] === "'" || raw[i] === '"') {
        const q = raw[i];
        i++;
        while (i < raw.length && raw[i] !== q) {
          if (raw[i] === "\\") i++;
          i++;
        }
      }
      i++;
    }
    if (raw[i] === ",") i++;
  }

  if (args.length < 4) return null;

  let p: string;
  let a: number;
  let c: number;
  let k: string[];
  try {
    p = JSON.parse(args[0]) as string;
    a = Number(args[1]);
    c = Number(args[2]);
    const kRaw = JSON.parse(args[3]);
    k = Array.isArray(kRaw) ? kRaw : String(kRaw).split("|");
  } catch {
    return null;
  }
  if (!Number.isInteger(a) || a < 2 || a > 36 || !Number.isInteger(c) || c < 1 || c > 5000) {
    return null;
  }

  // Algoritma unpack asli: indeks tinggi dulu, token = c.toString(a),
  // penggantian literal (replacer function → '$' di k[] aman).
  for (let idx = c - 1; idx >= 0; idx--) {
    const word = k[idx];
    if (!word) continue;
    const token = idx.toString(a);
    p = p.replace(new RegExp(`\\b${token}\\b`, "g"), () => word);
  }
  return p;
}

/* ----------------------------- kandidat media ------------------------------ */

interface MediaCandidate {
  url: string;
  type: "hls" | "mp4";
  score: number;
}

const MEDIA_RE = /["'`](https?:\/\/[^"'`\\\s]*(?:\.m3u8|\.mp4|\.m4v|\.webm)[^"'`\\\s]*)["'`]/gi;
const RELATIVE_RE = /["'`](\/[^"'`\\\s]*(?:\.m3u8|\.mp4|\.m4v|\.webm)[^"'`\\\s]*)["'`]/gi;

function scoreUrl(type: "hls" | "mp4", path: string): number {
  if (type === "mp4") return 0;
  if (/master\.m3u8/i.test(path)) return 4;
  if (/index\.m3u8/i.test(path)) return 3;
  if (/iframes?[-.]/i.test(path)) return 1; // iframe-only playlist — nilai rendah
  return 2;
}

function collect(js: string, origin: string): MediaCandidate[] {
  const out: MediaCandidate[] = [];
  const push = (raw: string) => {
    const lower = raw.toLowerCase();
    const isM3u8 = lower.includes(".m3u8");
    const isMp4 = lower.includes(".mp4") || lower.includes(".m4v") || lower.includes(".webm");
    if (!isM3u8 && !isMp4) return;
    let abs: URL;
    try {
      abs = new URL(raw, origin);
    } catch {
      return;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return;
    out.push({ url: abs.toString(), type: isM3u8 ? "hls" : "mp4", score: scoreUrl(isM3u8 ? "hls" : "mp4", abs.pathname) });
  };

  for (const m of js.matchAll(MEDIA_RE)) push(m[1]);
  for (const m of js.matchAll(RELATIVE_RE)) push(m[1]);
  return out;
}

/* -------------------------------- API publik ------------------------------- */

/**
 * Buka halaman embed dan cari direct file. Return null kalau gagal/bukan
 * halaman embed yang dikenal — pemanggil wajib fallback ke WebView embed.
 */
export async function extractDirectStream(embedUrl: string): Promise<ExtractedStream | null> {
  const page = await fetchEmbedPage(embedUrl);
  if (!page) return null;
  const { html, finalUrl } = page;
  const origin = new URL(finalUrl).origin;
  const host = new URL(finalUrl).hostname;

  // 1) unpack packer (VidHide & sejenis), 2) HTML mentah.
  const unpacked = unpackPacker(html);
  const haystacks = [unpacked ?? "", html];

  let best: MediaCandidate | null = null;
  let bestMethod: ExtractedStream["method"] | null = null;

  for (const [index, js] of haystacks.entries()) {
    if (!js) continue;
    const candidates = collect(js, origin);
    if (!candidates.length) continue;
    const top = candidates.reduce((a, b) => (b.score > a.score ? b : a));
    if (!best || top.score > best.score) {
      best = top;
      bestMethod = index === 0 ? "packer" : "html";
    }
    if (best && best.score >= 4) break; // master.m3u8 — tak perlu lanjut
  }

  if (!best || best.score < 1) return null;
  return { url: best.url, type: best.type, host, method: bestMethod! };
}
