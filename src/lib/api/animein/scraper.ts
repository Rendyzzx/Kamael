/**
 * Port scraper AnimeIn (KyuuX444/scraper → anime/animein.js) ke TypeScript.
 * Semua method setara 1:1 dengan scraper sumber; hanya transport yang
 * diganti (axios → fetch native + cache Redis di client.ts).
 *
 * Bentuk mentah respons sudah diverifikasi langsung ke
 * https://animeinweb.com/api/proxy (Okt 2026). Jangan ubah mapping
 * sembarangan tanpa verifikasi ulang.
 */

import { animeInFetch } from "./client";

/* ---------- Raw shapes (terverifikasi via inspeksi) ---------- */

export interface RawAnimeItem {
  id?: string | null;
  title?: string | null;
  synopsis?: string | null;
  synonyms?: string | null;
  image_poster?: string | null;
  image_cover?: string | null;
  type?: string | null; // "SERIES" | "MOVIE" | ...
  status?: string | null; // "ONGOING" | "COMPLETED" | ...
  day?: string | null; // "SENIN" | ... | "RANDOM"
  year?: string | number | null;
  views?: string | number | null;
  favorites?: string | number | null;
  studio?: string | null;
  aired_start?: string | null;
  aired_end?: string | null;
  genre?: string | null; // "Action,Adventure,..." (string koma)
}

export interface RawEpisodeItem {
  id?: string | null;
  index?: string | number | null;
  title?: string | null;
  views?: string | number | null;
  id_movie?: string | null;
  key_time?: string | null;
  image?: string | null;
  is_new?: string | number | null;
}

export interface RawStreamServer {
  id?: string | null;
  link?: string | null;
  quality?: string | null;
  key_file_size?: string | null;
  name?: string | null; // uploader, mis. "RAPSODI"
  type?: string | null; // "direct" | ...
  server_id?: string | null;
}

interface RawHomeEnvelope {
  status?: boolean;
  data?: {
    today?: RawAnimeItem[];
    popular?: RawAnimeItem[];
    new?: RawAnimeItem[];
    hot?: RawAnimeItem[];
    slider?: RawAnimeItem[];
    waiting?: RawAnimeItem[];
  } | null;
}

interface RawExploreEnvelope {
  status?: boolean;
  data?: { movie?: RawAnimeItem[] } | null;
}

interface RawGenreEnvelope {
  status?: boolean;
  data?: {
    genre?: { id?: string; name?: string; group?: string | null; image?: string | null }[];
  } | null;
}

interface RawDetailEnvelope {
  status?: boolean;
  data?: { movie?: RawAnimeItem | null } | null;
}

interface RawEpisodesEnvelope {
  status?: boolean;
  data?: { episode?: RawEpisodeItem[] } | null;
}

interface RawStreamEnvelope {
  status?: boolean;
  data?: {
    episode?: RawEpisodeItem | null;
    episode_next?: RawEpisodeItem | null;
    server?: RawStreamServer[];
  } | null;
}

/* ---------- Normalisasi bentuk scraper (identik dgn animein.js) ---------- */

export interface ScrapeAnimeItem {
  id: string;
  title: string;
  synonyms: string | null;
  url: string;
  type: string | null;
  status: string | null;
  day: string | null;
  year: string | null;
  views: number | null;
  favorites: number | null;
  genres: string[];
  poster: string | null;
  cover: string | null;
  aired_start: string | null;
  synopsis: string | null;
}

export interface ScrapeEpisodeItem {
  id: string;
  episode_number: number | null;
  title: string;
  views: number;
  release_date: string | null;
  image: string | null;
  is_new: boolean;
  anime_id: string | null;
}

export interface ScrapeStreamServer {
  id: string;
  name: string;
  quality: string | null;
  type: string | null;
  file_size_mb: number | null;
  url: string;
  server_id: string | null;
}

export interface ScrapeStream {
  episode: {
    id: string;
    title: string;
    episode_number: number | null;
    views: number;
    release_date: string | null;
    next_episode_id: string | null;
    anime_id: string | null;
  };
  servers: ScrapeStreamServer[];
}

const BASE_SITE = "https://animeinweb.com";
const IMAGE_CDN = "https://xyz-api.animein.net";

function parseGenres(genreStr: string | null | undefined): string[] {
  if (!genreStr) return [];
  if (Array.isArray(genreStr)) return genreStr as unknown as string[];
  return genreStr.split(",").map((g) => g.trim()).filter(Boolean);
}

function toInt(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function toStr(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Ubah "animeinweb.com/anime/<id>" / URL watch -> id murni. */
export function cleanId(input: string): string {
  if (!input) return "";
  let s = String(input).trim();
  s = s.replace(/^https?:\/\/animeinweb\.com\/anime\//i, "");
  s = s.replace(/^https?:\/\/animeinweb\.com\/watch\//i, "");
  return s.split("/")[0].split("?")[0].trim();
}

function formatAnimeItem(item: RawAnimeItem | null | undefined): ScrapeAnimeItem | null {
  if (!item) return null;
  const id = toStr(item.id);
  const title = toStr(item.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    synonyms: toStr(item.synonyms),
    url: `${BASE_SITE}/anime/${id}`,
    type: toStr(item.type),
    status: toStr(item.status),
    day: toStr(item.day),
    year: toStr(item.year),
    views: toInt(item.views),
    favorites: toInt(item.favorites),
    genres: parseGenres(item.genre),
    poster: toStr(item.image_poster) ?? toStr(item.image_cover),
    cover: toStr(item.image_cover) ?? toStr(item.image_poster),
    aired_start: toStr(item.aired_start),
    synopsis: toStr(item.synopsis),
  };
}

function formatEpisode(e: RawEpisodeItem | null | undefined): ScrapeEpisodeItem | null {
  if (!e) return null;
  const id = toStr(e.id);
  if (!id) return null;
  const image = toStr(e.image);
  return {
    id,
    episode_number: toInt(e.index),
    title: toStr(e.title) ?? `Episode ${toStr(e.index) ?? id}`,
    views: toInt(e.views) ?? 0,
    release_date: toStr(e.key_time),
    image: image
      ? image.startsWith("http")
        ? image
        : `${IMAGE_CDN}/${image.replace(/^\/+/, "")}`
      : null,
    is_new: String(e.is_new ?? "0") === "1",
    anime_id: toStr(e.id_movie),
  };
}

/* ---------- Scraper (setara animein.js) ---------- */

export class AnimeInScraper {
  async getHome(day: string | null = null): Promise<{
    today: ScrapeAnimeItem[];
    popular: ScrapeAnimeItem[];
    new: ScrapeAnimeItem[];
    hot: ScrapeAnimeItem[];
    slider: ScrapeAnimeItem[];
    waiting: ScrapeAnimeItem[];
  }> {
    const currentDay = day ? day.toUpperCase() : "KAMIS";
    const res = await animeInFetch<RawHomeEnvelope>(
      `/3/2/home/data?day=${encodeURIComponent(currentDay)}&limit=20`,
      { revalidate: 300 }
    );
    const data = res.data ?? {};
    const pick = (list?: RawAnimeItem[]) =>
      (list ?? []).map(formatAnimeItem).filter((x): x is ScrapeAnimeItem => x !== null);
    return {
      today: pick(data.today),
      popular: pick(data.popular),
      new: pick(data.new),
      hot: pick(data.hot),
      slider: pick(data.slider),
      waiting: pick(data.waiting),
    };
  }

  async search(keyword: string, page = 0, sort = "views"): Promise<ScrapeAnimeItem[]> {
    if (!keyword) throw new Error("Search keyword wajib diisi.");
    const p = Math.max(0, parseInt(page as unknown as string) || 0);
    const res = await animeInFetch<RawExploreEnvelope>(
      `/3/2/explore/movie?page=${p}&sort=${encodeURIComponent(sort)}&keyword=${encodeURIComponent(keyword)}`,
      { revalidate: 300 }
    );
    return (res.data?.movie ?? []).map(formatAnimeItem).filter((x): x is ScrapeAnimeItem => x !== null);
  }

  async getLatest(page = 0): Promise<ScrapeAnimeItem[]> {
    const p = Math.max(0, parseInt(page as unknown as string) || 0);
    const res = await animeInFetch<RawExploreEnvelope>(
      `/3/2/explore/movie?page=${p}&sort=latest&keyword=`,
      { revalidate: 300 }
    );
    return (res.data?.movie ?? []).map(formatAnimeItem).filter((x): x is ScrapeAnimeItem => x !== null);
  }

  async getPopular(page = 0): Promise<ScrapeAnimeItem[]> {
    const p = Math.max(0, parseInt(page as unknown as string) || 0);
    const res = await animeInFetch<RawExploreEnvelope>(
      `/3/2/explore/movie?page=${p}&sort=views&keyword=`,
      { revalidate: 300 }
    );
    return (res.data?.movie ?? []).map(formatAnimeItem).filter((x): x is ScrapeAnimeItem => x !== null);
  }

  async getGenres(): Promise<{ id: string; name: string; group: string | null }[]> {
    const res = await animeInFetch<RawGenreEnvelope>(`/3/2/explore/genre`, {
      revalidate: 86400,
      kind: "genre",
    });
    return (res.data?.genre ?? [])
      .filter((g) => g && g.id && g.name)
      .map((g) => ({ id: String(g.id), name: String(g.name), group: toStr(g.group) }));
  }

  async getByGenre(
    genreNameOrId: string,
    page = 0,
    sort = "views"
  ): Promise<ScrapeAnimeItem[]> {
    if (!genreNameOrId) throw new Error("Nama genre atau ID genre wajib diisi.");
    let genreId = genreNameOrId;

    // Resolver nama genre -> ID (frontend lama memakai slug/nama).
    if (isNaN(Number(genreNameOrId))) {
      const allGenres = await this.getGenres();
      const target = allGenres.find(
        (g) => g.name.toLowerCase() === genreNameOrId.toLowerCase().trim()
      );
      if (!target) throw new Error(`Genre "${genreNameOrId}" tidak ditemukan.`);
      genreId = target.id;
    }

    const p = Math.max(0, parseInt(page as unknown as string) || 0);
    const res = await animeInFetch<RawExploreEnvelope>(
      `/3/2/explore/movie?page=${p}&sort=${encodeURIComponent(sort)}&id_genre=${encodeURIComponent(genreId)}`,
      { revalidate: 600 }
    );
    return (res.data?.movie ?? []).map(formatAnimeItem).filter((x): x is ScrapeAnimeItem => x !== null);
  }

  /** Episode satu halaman (30/halaman, urut terbaru duluan). */
  async getEpisodes(animeIdOrUrl: string, page = 0): Promise<ScrapeEpisodeItem[]> {
    const id = cleanId(animeIdOrUrl);
    if (!id) throw new Error("ID anime wajib diisi.");
    const res = await animeInFetch<RawEpisodesEnvelope>(
      `/3/2/movie/episode/${encodeURIComponent(id)}?page=${page}`,
      { revalidate: 900, kind: "episodes" }
    );
    return (res.data?.episode ?? [])
      .map(formatEpisode)
      .filter((x): x is ScrapeEpisodeItem => x !== null);
  }

  /**
   * SELURUH daftar episode (semua halaman), urut menaik.
   * Anime panjang (One Piece ± 40 halaman) di-fetch paralel per batch.
   */
  async getAllEpisodes(animeIdOrUrl: string): Promise<ScrapeEpisodeItem[]> {
    const id = cleanId(animeIdOrUrl);
    if (!id) throw new Error("ID anime wajib diisi.");

    const first = await this.getEpisodes(id, 0);
    if (first.length === 0) return [];
    const PAGE_SIZE = 30;
    if (first.length < PAGE_SIZE) {
      return sortAsc(first);
    }

    // Halaman lanjutan di-fetch paralel sampai halaman kosong/pendek.
    const collected: ScrapeEpisodeItem[] = [...first];
    const BATCH = 8;
    let nextPages = Array.from({ length: BATCH }, (_, i) => i + 1);
    while (nextPages.length) {
      const results = await Promise.allSettled(
        nextPages.map((p) => this.getEpisodes(id, p))
      );
      let shortPageHit = false;
      for (const r of results) {
        if (r.status === "fulfilled") {
          collected.push(...r.value);
          if (r.value.length < PAGE_SIZE) shortPageHit = true;
        }
      }
      if (shortPageHit) break;
      nextPages = nextPages.map((p) => p + BATCH);
      if (nextPages[0] > 200) break; // pengaman: max ±6000 episode
    }

    // Dedup + urut menaik.
    const seen = new Set<string>();
    return sortAsc(collected.filter((e) => (seen.has(e.id) ? false : seen.add(e.id))));
  }

  async getDetail(animeIdOrUrl: string, includeEpisodes = true): Promise<{
    anime: ScrapeAnimeItem & { studio: string | null; aired_end: string | null };
    episodes: ScrapeEpisodeItem[];
  }> {
    const id = cleanId(animeIdOrUrl);
    if (!id) throw new Error("ID atau URL anime wajib diisi.");

    const res = await animeInFetch<RawDetailEnvelope>(
      `/3/2/movie/detail/${encodeURIComponent(id)}`,
      { revalidate: 900, kind: "detail" }
    );
    const movie = res.data?.movie;
    const base = formatAnimeItem(movie);
    if (!movie || !base) throw new Error(`Anime dengan ID ${id} tidak ditemukan.`);

    const episodes = includeEpisodes ? await this.getAllEpisodes(id) : [];
    return {
      anime: { ...base, studio: toStr(movie.studio), aired_end: toStr(movie.aired_end) },
      episodes,
    };
  }

  async getStream(episodeIdOrUrl: string): Promise<ScrapeStream> {
    const epId = cleanId(episodeIdOrUrl);
    if (!epId) throw new Error("ID episode wajib diisi.");

    const res = await animeInFetch<RawStreamEnvelope>(
      `/3/2/episode/streamnew/${encodeURIComponent(epId)}`,
      { revalidate: 120, kind: "stream" } // URL stream cepat berubah -> TTL pendek
    );
    const d = res.data ?? {};
    const episodeInfo = d.episode;
    if (!episodeInfo) throw new Error(`Episode ${epId} tidak ditemukan.`);

    const servers = (d.server ?? [])
      .filter((s) => s && s.link && s.id)
      .map((s) => ({
        id: String(s.id),
        name: toStr(s.name) ?? "Server",
        quality: toStr(s.quality),
        type: toStr(s.type),
        file_size_mb: s.key_file_size ? parseFloat(String(s.key_file_size)) : null,
        url: String(s.link),
        server_id: toStr(s.server_id),
      }));

    const nextId = d.episode_next?.id ? String(d.episode_next.id) : null;

    return {
      episode: {
        id: String(episodeInfo.id ?? epId),
        title: toStr(episodeInfo.title) ?? `Episode ${epId}`,
        episode_number: toInt(episodeInfo.index),
        views: toInt(episodeInfo.views) ?? 0,
        release_date: toStr(episodeInfo.key_time),
        next_episode_id: nextId,
        anime_id: toStr(episodeInfo.id_movie),
      },
      servers,
    };
  }
}

function sortAsc(list: ScrapeEpisodeItem[]): ScrapeEpisodeItem[] {
  return [...list].sort(
    (a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0)
  );
}

/** Instance singleton — dipakai provider layer. */
export const animeIn = new AnimeInScraper();
