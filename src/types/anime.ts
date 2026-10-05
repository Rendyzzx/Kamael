/**
 * Tipe hasil normalisasi adapter Otakudesu (anime).
 * UI hanya mengenal tipe ini; struktur mentah API tidak pernah bocor ke komponen.
 * Field opsional mencerminkan variasi nyata antar endpoint (terinspeksi di docs/API-INSPECTION.md).
 */

export interface GenreRef {
  id: string;
  title: string;
}

/** Item anime pada semua listing/list (home, ongoing, completed, genre, search, recommended). */
export interface AnimeListItem {
  title: string;
  animeId: string;
  poster: string;
  /** Jumlah episode; sebagian endpoint tidak menyediakan. */
  episodes: number | null;
  /** Skor; sebagian endpoint tidak menyediakan. */
  score: string | null;
  /** "Ongoing" | "Completed" | "Drop" | ...; tidak semua endpoint menyediakan. */
  status: string | null;
  releaseDay: string | null;
  latestReleaseDate: string | null;
  season: string | null;
  studios: string | null;
  genres: GenreRef[];
  synopsis: string | null;
}

export interface AnimeEpisodeRef {
  episodeId: string;
  title: string;
  /** Nomor episode bila bisa diparse; null jika tidak. */
  eps: number | null;
  date: string | null;
}

export interface AnimeDetail {
  title: string;
  animeId: string;
  poster: string;
  japaneseTitle: string | null;
  score: string | null;
  producers: string | null;
  type: string | null;
  status: string | null;
  /** String/null sesuai API; null artinya tidak diketahui. */
  episodeCount: number | null;
  duration: string | null;
  aired: string | null;
  studios: string | null;
  synopsis: string | null;
  genres: GenreRef[];
  /** Diurutkan menaik (episode terbaru di akhir). */
  episodeList: AnimeEpisodeRef[];
  recommended: AnimeListItem[];
}

export interface AnimeServerOption {
  serverId: string;
  title: string;
}

export interface AnimeQualityGroup {
  quality: string;
  servers: AnimeServerOption[];
}

export interface AnimeEpisodeDetail {
  title: string;
  animeId: string;
  animeTitle: string | null;
  releaseTime: string | null;
  /** URL embed default (langsung bisa dipakai iframe). */
  defaultStreamingUrl: string | null;
  prevEpisodeId: string | null;
  nextEpisodeId: string | null;
  qualities: AnimeQualityGroup[];
  /** Daftar episode dari info episode, urut menaik. */
  episodeList: AnimeEpisodeRef[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number | null;
  hasPrevPage: boolean;
  hasNextPage: boolean | null;
  prevPage: number | null;
  nextPage: number | null;
}
