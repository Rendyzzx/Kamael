/**
 * Adapter Donghua (Anichin) untuk Sanka Vollerei Anime API.
 * Semua akses data donghua harus lewat sini — jika struktur API berubah,
 * cukup perbaiki file ini; UI tetap memakai tipe dari src/types/donghua.ts.
 * Struktur mentah terdokumentasi di docs/API-INSPECTION.md.
 */
import { apiFetch } from "./client";
import { normalizeDonghuaDownloads } from "@/lib/player/sources";
import type {
  DonghuaDetail,
  DonghuaEpisodeDetail,
  DonghuaEpisodeRef,
  DonghuaGenre,
  DonghuaListItem,
  DonghuaStreamServer,
} from "@/types/donghua";

/* ---------- Raw shapes (verifikasi via inspeksi, jangan ubah sembarangan) ---------- */

interface RawDongItem {
  title?: string | null;
  slug?: string | null;
  poster?: string | null;
  status?: string | null;
  type?: string | null;
  sub?: string | null;
  current_episode?: string | null;
}

interface RawGenreItem {
  name?: string | null;
  slug?: string | null;
}

interface RawEpisodeItem {
  episode?: string | null;
  episode_number?: string | number | null;
  sub?: string | null;
  release_date?: string | null;
  slug?: string | null;
}

interface RawDetail {
  title?: string | null;
  alter_title?: string | null;
  poster?: string | null;
  rating?: string | number | null;
  followers?: string | null;
  studio?: string | null;
  network?: string | null;
  released?: string | null;
  duration?: string | null;
  type?: string | null;
  status?: string | null;
  episodes_count?: number | string | null;
  season?: string | null;
  country?: string | null;
  synopsis?: string | null;
  genres?: RawGenreItem[] | null;
  episodes_list?: RawEpisodeItem[] | null;
  recommendations?: RawDongItem[] | null;
}

interface RawServer {
  name?: string | null;
  url?: string | null;
}

interface RawEpisodePage {
  episode?: string | null;
  streaming?: {
    main_url?: RawServer | null;
    servers?: RawServer[] | null;
  } | null;
  donghua_details?: {
    title?: string | null;
    slug?: string | null;
    poster?: string | null;
  } | null;
  navigation?: {
    previous_episode?: { slug?: string | null } | null;
    next_episode?: { slug?: string | null } | null;
  } | null;
  episodes_list?: RawEpisodeItem[] | null;
  download_url?: Record<string, { Mirrored?: string | null } | undefined> | null;
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

/**
 * Poster donghua dari anichin.moe sering diblok browser (ORB/hotlink), jadi
 * dilewatkan proxy internal /api/img. Aman diulang (sudah ter-proxy = utuh).
 */
function proxyPoster(url: string | null): string | null {
  if (!url) return url;
  if (url.startsWith("/api/img")) return url;
  return /^https:\/\/(www\.)?anichin\.moe\//.test(url) ? `/api/img?u=${encodeURIComponent(url)}` : url;
}

function normalizeItem(raw: RawDongItem): DonghuaListItem | null {
  const slug = str(raw.slug);
  const title = str(raw.title);
  if (!slug || !title) return null;
  return {
    title,
    slug,
    poster: proxyPoster(str(raw.poster)) ?? "",
    status: str(raw.status),
    type: str(raw.type),
    sub: str(raw.sub),
    currentEpisode: str(raw.current_episode),
  };
}

function normalizeItems(list?: RawDongItem[] | null): DonghuaListItem[] {
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeItem)
    .filter((x): x is DonghuaListItem => x !== null);
}

function normalizeGenres(list?: RawGenreItem[] | null): DonghuaGenre[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g) => g && g.slug && g.name)
    .map((g) => ({ slug: String(g.slug), name: String(g.name) }));
}

function parseEpisodeNumber(raw: RawEpisodeItem): number | null {
  // episode_number berbentuk "01", "40 END", atau angka.
  const direct = num(raw.episode_number);
  if (direct !== null) return direct;
  const fromTitle = str(raw.episode)?.match(/episode\s+(\d+)/i);
  if (fromTitle) return Number(fromTitle[1]);
  return null;
}

function normalizeEpisode(raw: RawEpisodeItem): DonghuaEpisodeRef | null {
  const slug = str(raw.slug);
  const title = str(raw.episode);
  if (!slug || !title) return null;
  const episodeNumber = parseEpisodeNumber(raw);
  return {
    slug,
    title,
    episodeNumber,
    releaseDate: str(raw.release_date),
    isFinal: /\b(end|tamat)\b/i.test(String(raw.episode_number ?? "")) || /\b(end|tamat)\b/i.test(title),
  };
}

function sortEpisodes(list: DonghuaEpisodeRef[]): DonghuaEpisodeRef[] {
  // API mengirim episode terbaru dulian; tampilkan urut menaik.
  return [...list].sort(
    (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
  );
}

/* ---------- Public API ---------- */

/** Home donghua: rilisan terbaru (per episode) + donghua tamat. */
export async function getDonghuaHome(): Promise<{
  latestRelease: DonghuaListItem[];
  completed: DonghuaListItem[];
}> {
  const res = await apiFetch<{
    latest_release?: RawDongItem[] | null;
    completed_donghua?: RawDongItem[] | null;
  }>("/anime/donghua/home/1", { revalidate: 600 });
  return {
    latestRelease: normalizeItems(res.latest_release),
    completed: normalizeItems(res.completed_donghua),
  };
}

export async function getLatestDonghua(page = 1): Promise<DonghuaListItem[]> {
  const res = await apiFetch<{ latest_donghua?: RawDongItem[] | null }>(
    `/anime/donghua/latest/${page}`,
    { revalidate: 300 }
  );
  return normalizeItems(res.latest_donghua);
}

export async function getOngoingDonghua(page = 1): Promise<DonghuaListItem[]> {
  const res = await apiFetch<{ ongoing_donghua?: RawDongItem[] | null }>(
    `/anime/donghua/ongoing/${page}`,
    { revalidate: 300 }
  );
  return normalizeItems(res.ongoing_donghua);
}

export async function getCompletedDonghua(
  page = 1
): Promise<DonghuaListItem[]> {
  const res = await apiFetch<{ completed_donghua?: RawDongItem[] | null }>(
    `/anime/donghua/completed/${page}`,
    { revalidate: 300 }
  );
  return normalizeItems(res.completed_donghua);
}

export async function getDonghuaGenres(): Promise<DonghuaGenre[]> {
  const res = await apiFetch<{ data?: RawGenreItem[] | null }>(
    "/anime/donghua/genres",
    { revalidate: 86400 }
  );
  return normalizeGenres(res.data);
}

export async function getDonghuaByGenre(
  slug: string,
  page = 1
): Promise<DonghuaListItem[]> {
  const res = await apiFetch<{ data?: RawDongItem[] | null }>(
    `/anime/donghua/genres/${encodeURIComponent(slug)}/${page}`,
    { revalidate: 600 }
  );
  return normalizeItems(res.data);
}

export async function searchDonghua(
  keyword: string
): Promise<DonghuaListItem[]> {
  const res = await apiFetch<{ data?: RawDongItem[] | null }>(
    `/anime/donghua/search/${encodeURIComponent(keyword)}/1`,
    { revalidate: 300 }
  );
  return normalizeItems(res.data);
}

export async function getDonghuaDetail(slug: string): Promise<DonghuaDetail> {
  const res = await apiFetch<RawDetail>(
    `/anime/donghua/detail/${encodeURIComponent(slug)}`,
    { revalidate: 600 }
  );
  if (!res || !res.title) throw new Error("Detail donghua tidak ditemukan");

  const episodes = (res.episodes_list ?? [])
    .map(normalizeEpisode)
    .filter((x): x is DonghuaEpisodeRef => x !== null);

  return {
    title: String(res.title),
    slug, // detail endpoint tidak mengirim slug balik; pakai slug request
    poster: proxyPoster(str(res.poster)) ?? "",
    alterTitle: str(res.alter_title),
    rating: str(res.rating),
    followers: str(res.followers),
    studio: str(res.studio),
    network: str(res.network),
    released: str(res.released),
    duration: str(res.duration),
    type: str(res.type),
    status: str(res.status),
    episodeCount: num(res.episodes_count),
    season: str(res.season),
    country: str(res.country),
    synopsis: str(res.synopsis),
    genres: normalizeGenres(res.genres),
    episodes: sortEpisodes(episodes),
    recommendations: normalizeItems(res.recommendations),
  };
}

export async function getDonghuaEpisode(
  slug: string
): Promise<DonghuaEpisodeDetail> {
  const res = await apiFetch<RawEpisodePage>(
    `/anime/donghua/episode/${encodeURIComponent(slug)}`,
    { revalidate: 600 }
  );
  if (!res || !res.episode) throw new Error("Episode tidak ditemukan");

  const servers: DonghuaStreamServer[] = (res.streaming?.servers ?? [])
    .filter((s) => s && s.url && s.name)
    .map((s) => ({ name: String(s.name).trim(), url: String(s.url) }))
    .filter((s) => /^https?:\/\//i.test(s.url));

  const main = res.streaming?.main_url;
  const mainServer =
    main && main.url && /^https?:\/\//i.test(String(main.url))
      ? { name: String(main.name ?? "Utama").trim(), url: String(main.url) }
      : null;

  const episodeList = sortEpisodes(
    (res.episodes_list ?? [])
      .map(normalizeEpisode)
      .filter((x): x is DonghuaEpisodeRef => x !== null)
  );

  return {
    title: String(res.episode),
    donghuaTitle: str(res.donghua_details?.title),
    donghuaSlug: str(res.donghua_details?.slug),
    poster: proxyPoster(str(res.donghua_details?.poster)),
    servers,
    mainServer,
    prevEpisodeSlug: str(res.navigation?.previous_episode?.slug) ?? null,
    nextEpisodeSlug: str(res.navigation?.next_episode?.slug) ?? null,
    downloads: normalizeDonghuaDownloads(res.download_url ?? null),
    episodeList,
  };
}
