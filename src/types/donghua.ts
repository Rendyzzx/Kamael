/**
 * Tipe hasil normalisasi adapter Donghua (Anichin via Sanka API).
 * UI hanya mengenal tipe ini; struktur mentah API tidak pernah bocor ke komponen.
 */

export interface DonghuaGenre {
  slug: string;
  name: string;
}

/** Item donghua pada listing (ongoing/completed/latest/genre/search/recommendation). */
export interface DonghuaListItem {
  title: string;
  slug: string;
  poster: string;
  status: string | null;
  type: string | null;
  sub: string | null;
  /** Mis. "Ep 161" pada latest_release home. */
  currentEpisode: string | null;
}

export interface DonghuaEpisodeRef {
  slug: string;
  /** Judul lengkap episode. */
  title: string;
  /** Nomor episode hasil parse, null jika gagal. */
  episodeNumber: number | null;
  releaseDate: string | null;
  /** True jika episode terakhir/tamat. */
  isFinal: boolean;
}

export interface DonghuaDetail {
  title: string;
  slug: string;
  poster: string;
  alterTitle: string | null;
  rating: string | null;
  followers: string | null;
  studio: string | null;
  network: string | null;
  released: string | null;
  duration: string | null;
  type: string | null;
  status: string | null;
  episodeCount: number | null;
  season: string | null;
  country: string | null;
  synopsis: string | null;
  genres: DonghuaGenre[];
  /** Diurutkan menaik. */
  episodes: DonghuaEpisodeRef[];
  recommendations: DonghuaListItem[];
}

export interface DonghuaStreamServer {
  name: string;
  url: string;
}

export interface DonghuaEpisodeDetail {
  title: string;
  donghuaTitle: string | null;
  donghuaSlug: string | null;
  poster: string | null;
  servers: DonghuaStreamServer[];
  mainServer: DonghuaStreamServer | null;
  prevEpisodeSlug: string | null;
  nextEpisodeSlug: string | null;
  /** Daftar episode urut menaik. */
  episodeList: DonghuaEpisodeRef[];
}
