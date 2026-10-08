/**
 * LEGACY provider (Otakudesu via Sanka Vollerei). Dipertahankan sebagai fallback ANIME_PROVIDER=legacy.
 * Jangan tambah fitur baru di sini; provider aktif ada di src/lib/api/animein/.
 * Semua akses data anime harus lewat sini — jika struktur API berubah,
 * cukup perbaiki file ini; UI tetap memakai tipe dari src/types/anime.ts.
 * Struktur mentah terdokumentasi di docs/API-INSPECTION.md.
 */
import { apiFetch } from "../client";
import { normalizeAnimeDownloads } from "@/lib/player/sources";
import type {
  AnimeDetail,
  AnimeEpisodeDetail,
  AnimeEpisodeRef,
  AnimeListItem,
  AnimeQualityGroup,
  GenreRef,
  PaginationInfo,
} from "@/types/anime";

/* ---------- Raw shapes (verifikasi via inspeksi, jangan ubah sembarangan) ---------- */

interface RawGenre {
  title?: string | null;
  genreId?: string | null;
}

interface RawAnimeItem {
  title?: string | null;
  poster?: string | null;
  episodes?: number | null;
  episodeCount?: number | null;
  score?: number | string | null;
  status?: string | null;
  releaseDay?: string | null;
  latestReleaseDate?: string | null;
  lastReleaseDate?: string | null;
  season?: string | null;
  studios?: string | null;
  animeId?: string | null;
  genreList?: RawGenre[] | null;
  synopsis?: { paragraphs?: (string | null)[] | null } | null;
}

interface RawEpisode {
  title?: string | null;
  eps?: number | string | null;
  date?: string | null;
  episodeId?: string | null;
}

interface RawServerEntry {
  title?: string | null;
  serverId?: string | null;
}

interface RawPagination {
  currentPage?: number | null;
  totalPages?: number | null;
  hasPrevPage?: boolean | null;
  hasNextPage?: boolean | null;
  prevPage?: number | null;
  nextPage?: number | null;
}

interface RawEnvelope<T> {
  ok?: boolean;
  data?: T;
  pagination?: RawPagination | null;
}

interface RawHomeData {
  ongoing?: { animeList?: RawAnimeItem[] | null } | null;
  completed?: { animeList?: RawAnimeItem[] | null } | null;
}

interface RawDetailData extends RawAnimeItem {
  japanese?: string | null;
  producers?: string | null;
  type?: string | null;
  duration?: string | null;
  aired?: string | null;
  genreList?: RawGenre[] | null;
  episodeList?: RawEpisode[] | null;
  recommendedAnimeList?: RawAnimeItem[] | null;
}

interface RawEpisodeData {
  title?: string | null;
  animeId?: string | null;
  releaseTime?: string | null;
  defaultStreamingUrl?: string | null;
  hasPrevEpisode?: boolean | null;
  prevEpisode?: { episodeId?: string | null } | null;
  hasNextEpisode?: boolean | null;
  nextEpisode?: { episodeId?: string | null } | null;
  server?: {
    qualities?: {
      title?: string | null;
      serverList?: RawServerEntry[] | null;
    }[] | null;
  } | null;
  info?: {
    episodeList?: RawEpisode[] | null;
    genreList?: RawGenre[] | null;
  } | null;
  downloadUrl?: {
    qualities?: {
      title?: string | null;
      urls?: { title?: string | null; url?: string | null }[] | null;
    }[] | null;
  } | null;
}

/* ---------- Helpers ---------- */

function str(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeGenres(list?: RawGenre[] | null): GenreRef[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g) => g && g.genreId && g.title)
    .map((g) => ({ id: String(g.genreId), title: String(g.title) }));
}

function normalizeItem(raw: RawAnimeItem): AnimeListItem | null {
  const animeId = str(raw.animeId);
  const title = str(raw.title);
  if (!animeId || !title) return null;
  return {
    title,
    animeId,
    poster: str(raw.poster) ?? "",
    episodes: num(raw.episodes ?? raw.episodeCount),
    score: str(raw.score),
    status: str(raw.status),
    releaseDay: str(raw.releaseDay),
    latestReleaseDate: str(raw.latestReleaseDate ?? raw.lastReleaseDate),
    season: str(raw.season),
    studios: str(raw.studios),
    genres: normalizeGenres(raw.genreList),
    synopsis: normalizeSynopsis(raw.synopsis),
  };
}

function normalizeSynopsis(
  synopsis?: { paragraphs?: (string | null)[] | null } | null
): string | null {
  const paragraphs = synopsis?.paragraphs;
  if (!Array.isArray(paragraphs)) return null;
  const text = paragraphs
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
  return text.length ? text : null;
}

function normalizeEpisode(raw: RawEpisode): AnimeEpisodeRef | null {
  const episodeId = str(raw.episodeId);
  const title = str(raw.title);
  if (!episodeId || !title) return null;
  return {
    episodeId,
    title,
    eps: num(raw.eps),
    date: str(raw.date),
  };
}

function sortEpisodes(list: AnimeEpisodeRef[]): AnimeEpisodeRef[] {
  // API mengirim episode terbaru duluan; tampilkan urut menaik.
  return [...list].sort((a, b) => (a.eps ?? 0) - (b.eps ?? 0));
}

function normalizePagination(
  raw?: RawPagination | null,
  fallbackPage = 1
): PaginationInfo {
  const currentPage = num(raw?.currentPage) ?? fallbackPage;
  const totalPages = num(raw?.totalPages);
  return {
    currentPage,
    totalPages,
    hasPrevPage: raw?.hasPrevPage ?? currentPage > 1,
    hasNextPage: raw?.hasNextPage ?? (totalPages ? currentPage < totalPages : null),
    prevPage: num(raw?.prevPage) ?? currentPage > 1 ? currentPage - 1 : null,
    nextPage: num(raw?.nextPage) ?? (totalPages && currentPage < totalPages ? currentPage + 1 : null),
  };
}

function normalizeItems(list?: RawAnimeItem[] | null): AnimeListItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeItem)
    .filter((x): x is AnimeListItem => x !== null);
}

/* ---------- Public API ---------- */

export interface AnimeListPage {
  items: AnimeListItem[];
  pagination: PaginationInfo;
}

/** Home: anime ongoing + completed. */
export async function getAnimeHome(): Promise<{
  ongoing: AnimeListItem[];
  completed: AnimeListItem[];
}> {
  const res = await apiFetch<RawEnvelope<RawHomeData>>("/anime/home", {
    revalidate: 600,
  });
  return {
    ongoing: normalizeItems(res.data?.ongoing?.animeList),
    completed: normalizeItems(res.data?.completed?.animeList),
  };
}

export async function getOngoingAnime(page = 1): Promise<AnimeListPage> {
  const res = await apiFetch<RawEnvelope<{ animeList?: RawAnimeItem[] | null }>>(
    `/anime/ongoing-anime?page=${page}`,
    { revalidate: 300 }
  );
  return {
    items: normalizeItems(res.data?.animeList),
    pagination: normalizePagination(res.pagination, page),
  };
}

export async function getCompletedAnime(page = 1): Promise<AnimeListPage> {
  const res = await apiFetch<RawEnvelope<{ animeList?: RawAnimeItem[] | null }>>(
    `/anime/complete-anime?page=${page}`,
    { revalidate: 300 }
  );
  return {
    items: normalizeItems(res.data?.animeList),
    pagination: normalizePagination(res.pagination, page),
  };
}

export async function getAnimeGenres(): Promise<GenreRef[]> {
  const res = await apiFetch<
    RawEnvelope<{ genreList?: RawGenre[] | null }>
  >("/anime/genre", { revalidate: 86400 });
  return normalizeGenres(res.data?.genreList);
}

export async function getAnimeByGenre(
  genreId: string,
  page = 1
): Promise<AnimeListPage> {
  const res = await apiFetch<
    RawEnvelope<{ animeList?: RawAnimeItem[] | null }>
  >(`/anime/genre/${encodeURIComponent(genreId)}?page=${page}`, {
    revalidate: 600,
  });
  return {
    items: normalizeItems(res.data?.animeList),
    pagination: normalizePagination(res.pagination, page),
  };
}

/** Search anime. Endpoint ini tidak menyediakan pagination. */
export async function searchAnime(keyword: string): Promise<AnimeListItem[]> {
  const res = await apiFetch<
    RawEnvelope<{ animeList?: RawAnimeItem[] | null }>
  >(`/anime/search/${encodeURIComponent(keyword)}`, { revalidate: 300 });
  return normalizeItems(res.data?.animeList);
}

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const res = await apiFetch<RawEnvelope<RawDetailData>>(
    `/anime/anime/${encodeURIComponent(slug)}`,
    { revalidate: 600 }
  );
  const d = res.data;
  if (!d) throw new Error("Detail anime tidak ditemukan");

  const episodes = (d.episodeList ?? [])
    .map(normalizeEpisode)
    .filter((x): x is AnimeEpisodeRef => x !== null);

  const animeId = str(d.animeId) ?? slug;
  return {
    title: str(d.title) ?? slug,
    animeId,
    poster: str(d.poster) ?? "",
    japaneseTitle: str(d.japanese),
    score: str(d.score),
    producers: str(d.producers),
    type: str(d.type),
    status: str(d.status),
    episodeCount: num(d.episodes),
    duration: str(d.duration),
    aired: str(d.aired),
    studios: str(d.studios),
    synopsis: normalizeSynopsis(d.synopsis),
    genres: normalizeGenres(d.genreList),
    episodeList: sortEpisodes(episodes),
    recommended: normalizeItems(d.recommendedAnimeList),
  };
}

export async function getAnimeEpisode(
  episodeId: string
): Promise<AnimeEpisodeDetail> {
  const res = await apiFetch<RawEnvelope<RawEpisodeData>>(
    `/anime/episode/${encodeURIComponent(episodeId)}`,
    { revalidate: 600 }
  );
  const d = res.data;
  if (!d) throw new Error("Episode tidak ditemukan");

  const qualities: AnimeQualityGroup[] = [];
  for (const q of d.server?.qualities ?? []) {
    const servers = (q.serverList ?? [])
      .filter((s) => s && s.serverId)
      .map((s) => ({ serverId: String(s.serverId), title: String(s.title ?? s.serverId).trim() }))
      .filter((s) => s.title.length > 0);
    if (servers.length) {
      qualities.push({ quality: String(q.title ?? "?").trim(), servers });
    }
  }

  const episodeList = sortEpisodes(
    (d.info?.episodeList ?? [])
      .map(normalizeEpisode)
      .filter((x): x is AnimeEpisodeRef => x !== null)
  );

  const hasPrev = d.hasPrevEpisode === true && d.prevEpisode?.episodeId;
  const hasNext = d.hasNextEpisode === true && d.nextEpisode?.episodeId;

  return {
    title: str(d.title) ?? episodeId,
    downloads: normalizeAnimeDownloads(d.downloadUrl ?? null),
    animeId: str(d.animeId) ?? "",
    animeTitle: null, // API tidak menyertakan judul anime di response episode
    releaseTime: str(d.releaseTime),
    defaultStreamingUrl: str(d.defaultStreamingUrl),
    prevEpisodeId: hasPrev ? String(d.prevEpisode!.episodeId) : null,
    nextEpisodeId: hasNext ? String(d.nextEpisode!.episodeId) : null,
    qualities,
    episodeList,
  };
}

/** Resolve serverId → URL embed (untuk pilihan server di watch page). */
export async function resolveAnimeServerUrl(
  serverId: string
): Promise<string> {
  const res = await apiFetch<RawEnvelope<{ url?: string | null }>>(
    `/anime/server/${encodeURIComponent(serverId)}`,
    { revalidate: 3600 }
  );
  const url = str(res.data?.url);
  if (!url) throw new Error("URL server tidak tersedia");
  return url;
}
