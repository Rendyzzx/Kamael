/**
 * Tipe hasil normalisasi sumber player.
 * Semua sumber (anime Otakudesu / donghua Anichin) dinormalisasi ke satu bentuk
 * sebelum sampai ke player, sehingga UI tidak pernah tahu struktur per-situs.
 */

/** "hls" = m3u8, "mp4" = file progresif, "embed" = iframe pihak ketiga. */
export type SourceType = "hls" | "mp4" | "embed";

/**
 * Satu sumber playable. `url` sudah final (embed/hls/mp4), KECUALI sumber
 * anime ber-`serverId` yang URL-nya di-resolve lazy via resolveEndpoint
 * (hemat request: server yang tidak dipilih tidak pernah di-resolve).
 */
export interface PlayerSource {
  /** "360p" | "480p" | "720p" | "1080p" | "auto". */
  quality: string;
  /** Nama tampilan server, mis. "vidhide", "mega". */
  server: string;
  url?: string;
  serverId?: string;
  type: SourceType;
}

/** Kumpulan sumber per kualitas, urut prioritas server. */
export interface QualityGroup {
  quality: string;
  sources: PlayerSource[];
}

/** Link download hasil normalisasi (dipakai tombol Unduh). */
export interface DownloadOption {
  /** Label kualitas, mis. "360p". */
  quality: string;
  /** Label penyedia, mis. "Mega". */
  provider: string;
  url: string;
}

/** Kunci unik satu sumber (untuk tracking server gagal per episode). */
export function sourceKey(s: PlayerSource): string {
  return `${s.quality}|${s.server}|${s.serverId ?? s.url ?? ""}`;
}
