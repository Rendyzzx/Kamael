/**
 * Normalisasi sumber player — fungsi murni (bisa diuji tanpa React).
 * Anime (Otakudesu): kualitas dari server.qualities, serverId di-resolve lazy.
 * Donghua (Anichin): server dengan URL langsung, tanpa label kualitas → "auto".
 */

import type {
  AnimeEpisodeDetail,
} from "@/types/anime";
import type { DonghuaEpisodeDetail } from "@/types/donghua";
import type { PlayerSource, QualityGroup, SourceType, DownloadOption } from "@/types/player";

const QUALITY_RE = /(\d{3,4})\s*p/i;

/** Deteksi tipe sumber dari URL. ServerId anime diperlakukan "embed" (hasil resolve memang embed). */
export function detectSourceType(url: string): SourceType {
  const clean = (url || "").split("?")[0].toLowerCase();
  if (clean.endsWith(".m3u8") || clean.includes(".m3u8")) return "hls";
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v") || clean.endsWith(".webm")) return "mp4";
  return "embed";
}

/** Angka kualitas dari label ("720p" → 720). "auto" → null. */
export function qualityNumber(quality: string): number | null {
  const m = quality.match(QUALITY_RE);
  return m ? Number(m[1]) : null;
}

/** Bandingkan kualitas tinggi → rendah; "auto" paling akhir. */
export function compareQualityDesc(a: string, b: string): number {
  const an = qualityNumber(a);
  const bn = qualityNumber(b);
  if (an === null && bn === null) return a.localeCompare(b);
  if (an === null) return 1;
  if (bn === null) return -1;
  return bn - an;
}

/** Label tampilan kualitas ("auto" → "Otomatis"). */
export function qualityLabel(quality: string): string {
  return quality === "auto" ? "Otomatis" : quality;
}

/** Bersihkan nama server ("Mega 720p" → "Mega"; "VIP STREAMING" → "VIP Streaming"). */
function cleanServerName(raw: string): string {
  let name = raw.replace(/\b(360|480|720|1080)\s*p\b/ig, "").replace(/[_-]+$/, "").trim();
  if (!name) name = raw.trim();
  return name.toLowerCase() === name ? name.replace(/\b\w/g, (c) => c.toUpperCase()) : name;
}

/** Normalisasi sumber episode anime (Otakudesu) → grup kualitas. */
export function normalizeAnimeSources(data: AnimeEpisodeDetail): QualityGroup[] {
  const map = new Map<string, PlayerSource[]>();

  for (const group of data.qualities) {
    const m = group.quality.match(QUALITY_RE);
    const quality = m ? `${m[1]}p` : "auto";
    const sources: PlayerSource[] = group.servers.map((s) => ({
      quality,
      server: cleanServerName(s.title),
      serverId: s.serverId,
      type: "embed" as SourceType, // hasil resolve Otakudesu selalu URL embed
    }));
    const existing = map.get(quality) ?? [];
    map.set(quality, [...existing, ...sources]);
  }

  // defaultStreamingUrl = embed langsung kualitas tak berlabel → grup "auto".
  if (data.defaultStreamingUrl) {
    const auto = map.get("auto") ?? [];
    const hasSameUrl = auto.some((s) => s.url === data.defaultStreamingUrl);
    if (!hasSameUrl) {
      auto.unshift({
        quality: "auto",
        server: "Default",
        url: data.defaultStreamingUrl,
        type: detectSourceType(data.defaultStreamingUrl),
      });
      map.set("auto", auto);
    }
  }

  return [...map.entries()]
    .map(([quality, sources]) => ({ quality, sources }))
    .sort((a, b) => compareQualityDesc(a.quality, b.quality));
}

/** Normalisasi sumber episode donghua (Anichin) → satu grup "auto". */
export function normalizeDonghuaSources(data: DonghuaEpisodeDetail): QualityGroup[] {
  const sources: PlayerSource[] = [];
  if (data.mainServer) {
    sources.push({
      quality: "auto",
      server: cleanServerName(data.mainServer.name),
      url: data.mainServer.url,
      type: detectSourceType(data.mainServer.url),
    });
  }
  for (const s of data.servers) {
    if (!sources.some((x) => x.url === s.url)) {
      sources.push({
        quality: "auto",
        server: cleanServerName(s.name),
        url: s.url,
        type: detectSourceType(s.url),
      });
    }
  }
  if (!sources.length) return [];
  return [{ quality: "auto", sources }];
}

/** Link download anime dari downloadUrl.qualities (normalisasi additive). */
export function normalizeAnimeDownloads(raw: {
  qualities?: { title?: string | null; urls?: { title?: string | null; url?: string | null }[] | null }[] | null;
} | null): DownloadOption[] {
  const out: DownloadOption[] = [];
  for (const q of raw?.qualities ?? []) {
    const m = (q.title ?? "").match(QUALITY_RE);
    const quality = m ? `${m[1]}p` : (q.title ?? "Download");
    for (const u of q.urls ?? []) {
      if (u?.url && /^https?:\/\//i.test(u.url)) {
        out.push({ quality, provider: (u.title ?? "Link").trim(), url: u.url });
      }
    }
  }
  return out;
}

/** Link download donghua dari download_url_{q}p.Mirrored. */
export function normalizeDonghuaDownloads(
  raw: Record<string, { Mirrored?: string | null } | undefined> | null
): DownloadOption[] {
  const out: DownloadOption[] = [];
  for (const [key, value] of Object.entries(raw ?? {})) {
    const m = key.match(QUALITY_RE);
    const url = value?.Mirrored;
    if (m && url && /^https?:\/\//i.test(url)) {
      out.push({ quality: `${m[1]}p`, provider: "Mirrored", url });
    }
  }
  return out.sort((a, b) => compareQualityDesc(a.quality, b.quality));
}

export interface QualityChoice {
  quality: string;
  /** Toast bila preferensi tidak tersedia dan dipakai kualitas terdekat. */
  notice: string | null;
}

/**
 * Pilih kualitas awal episode:
 * - Ada preferensi tersimpan: pakai itu; bila tidak tersedia → terdekat lebih
 *   rendah, kalau tidak ada → lebih tinggi, dengan toast. Preferensi TIDAK ditimpa.
 * - Belum ada preferensi: 480p bila ada, kalau tidak → tertinggi di bawahnya,
 *   kalau tidak ada sama sekali → terendah yang tersedia.
 */
export function pickInitialQuality(groups: QualityGroup[], stored: string | null): QualityChoice {
  if (!groups.length) return { quality: "", notice: null };
  const available = groups.map((g) => g.quality);
  const sorted = [...available].sort(compareQualityDesc);

  if (stored && available.includes(stored)) {
    return { quality: stored, notice: null };
  }

  const fallback =
    (stored &&
      (nearestBelow(sorted, stored) ?? nearestAbove(sorted, stored))) ||
    null;

  if (stored && fallback) {
    return {
      quality: fallback,
      notice: `${qualityLabel(stored)} tidak tersedia di episode ini, memakai ${qualityLabel(fallback)}`,
    };
  }

  // Tanpa preferensi: 480p → tertinggi di bawahnya → terendah yang ada.
  const initial = sorted.includes("480p")
    ? "480p"
    : (nearestBelow(sorted, "480p") ?? sorted[sorted.length - 1]);
  return { quality: initial, notice: null };
}

function nearestBelow(sortedDesc: string[], target: string): string | null {
  const tn = qualityNumber(target);
  if (tn === null) return null;
  const below = sortedDesc.filter((q) => {
    const n = qualityNumber(q);
    return n !== null && n < tn;
  });
  return below.length ? below[0] : null; // sortedDesc → first = tertinggi di bawah
}

function nearestAbove(sortedDesc: string[], target: string): string | null {
  const tn = qualityNumber(target);
  if (tn === null) return null;
  const above = sortedDesc.filter((q) => {
    const n = qualityNumber(q);
    return n !== null && n > tn;
  });
  return above.length ? above[above.length - 1] : null; // terendah di atas
}
