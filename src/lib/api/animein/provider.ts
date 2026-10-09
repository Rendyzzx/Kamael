/**
 * Provider anime AKTIF: AnimeIn (animeinweb.com).
 *
 * Kontrak identik dengan provider legacy (src/lib/api/legacy/anime.ts):
 * fungsi + bentuk return yang sama, jadi frontend & route internal tidak
 * perlu tahu sumber data diganti. Semua normalisasi ada di sini — UI hanya
 * mengenal tipe dari src/types/anime.ts.
 *
 * Field yang TIDAK tersedia di AnimeIn (score, season, producers, duration,
 * latestReleaseDate) diisi null — TIDAK ada data yang dikarang.
 *
 * Pilihan desain fallback provider: switching dilakukan lewat env
 * ANIME_PROVIDER (level deployment), BUKAN per-request. Alasan: ID space
 * AnimeIn ≠ ID space Otakudesu; fallback per-request akan menghasilkan
 * campuran ID yang merusak history/favorites/link detail secara diam-diam.
 */

import { animeIn } from "./scraper";
import { baseTitle, sameFranchise } from "../franchise";
import type { ScrapeAnimeItem, ScrapeEpisodeItem } from "./scraper";
import type {
  AnimeDetail,
  AnimeEpisodeDetail,
  AnimeEpisodeRef,
  AnimeListItem,
  AnimeQualityGroup,
  GenreRef,
  PaginationInfo,
} from "@/types/anime";
import type { DownloadOption } from "@/types/player";

export interface AnimeListPage {
  items: AnimeListItem[];
  pagination: PaginationInfo;
}

/** Jumlah item per "halaman tampilan" internal. */
const PAGE_SIZE = 30;

/* ---------- Helpers ---------- */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "ONGOING" -> "Ongoing"; "SUPER POWER" -> "Super Power". */
function titleCase(s: string | null): string | null {
  if (!s) return null;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Label status disamakan ke kosakata UI lama (bukan data baru):
 *  FINISHED -> "Completed", ONGOING -> "Ongoing". */
function statusLabel(s: string | null): string | null {
  if (!s) return null;
  const up = s.toUpperCase();
  if (up === "FINISHED") return "Completed";
  if (up === "ONGOING") return "Ongoing";
  return titleCase(s);
}

function normalizeItem(raw: ScrapeAnimeItem): AnimeListItem {
  return {
    title: raw.title,
    animeId: raw.id,
    poster: raw.poster ?? "",
    episodes: null, // tidak tersedia di listing AnimeIn
    score: null, // AnimeIn tidak punya skor rating
    status: statusLabel(raw.status),
    releaseDay: titleCase(raw.day),
    latestReleaseDate: null, // tidak tersedia di listing
    season: null, // tidak tersedia
    studios: null, // hanya ada di detail
    genres: raw.genres.map((g) => ({ id: slugify(g), title: g })),
    synopsis: raw.synopsis,
    views: raw.views,
  };
}

function normalizeEpisode(raw: ScrapeEpisodeItem): AnimeEpisodeRef {
  return {
    episodeId: raw.id,
    title: raw.title,
    eps: raw.episode_number,
    date: raw.release_date,
  };
}

/** Pagination dari daftar explore AnimeIn (60 item/halaman upstream). */
function paginationFromCount(
  fetchedCount: number,
  page: number,
  upstreamPageSize: number
): PaginationInfo {
  return {
    currentPage: page,
    totalPages: null,
    hasPrevPage: page > 1,
    hasNextPage: fetchedCount >= upstreamPageSize,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: fetchedCount >= upstreamPageSize ? page + 1 : null,
  };
}

/* ---------- Public API (kontrak sama dengan legacy) ---------- */

/** Home: rail "Anime Terbaru" (sedang tayang) + feed tamat. */
export async function getAnimeHome(): Promise<{
  ongoing: AnimeListItem[];
  completed: AnimeListItem[];
}> {
  const home = await animeIn
    .getHome(currentIndonesianDay())
    .catch(() => null);

  // "Anime Terbaru / episode terbaru yang sedang tayang" -> new (baru
  // ditambahkan), fallback today (jadwal hari ini), lalu latest upstream.
  let ongoing: AnimeListItem[];
  if (home && home.new.length) {
    ongoing = home.new.map(normalizeItem);
  } else if (home && home.today.length) {
    ongoing = home.today.map(normalizeItem);
  } else {
    ongoing = (await animeIn.getLatest(0)).map(normalizeItem);
  }

  const completed = (await getCompletedFeed()).slice(0, 12).map(normalizeItem);
  return { ongoing, completed };
}

export async function getOngoingAnime(page = 1): Promise<AnimeListPage> {
  const items = await animeIn.getLatest(page - 1);
  return {
    items: items.map(normalizeItem),
    pagination: paginationFromCount(items.length, page, 60),
  };
}

/**
 * Feed "Tamat": AnimeIn tidak punya filter status, jadi feed dibangun dari
 * beberapa halaman explore terbaru yang di-cache, difilter status COMPLETED
 * (data asli, bukan karangan). Halaman tampilan = irisan 30 item.
 */
async function getCompletedFeed(): Promise<ScrapeAnimeItem[]> {
  const SCAN_PAGES = 6; // ±360 item upstream (ter-cache, TTL 300s)
  const pages = await Promise.allSettled(
    Array.from({ length: SCAN_PAGES }, (_, i) => animeIn.getLatest(i))
  );
  const seen = new Set<string>();
  const feed: ScrapeAnimeItem[] = [];
  for (const p of pages) {
    if (p.status !== "fulfilled") continue;
    for (const item of p.value) {
      if (item.status === "FINISHED" && !seen.has(item.id)) {
        seen.add(item.id);
        feed.push(item);
      }
    }
  }
  return feed;
}

export async function getCompletedAnime(page = 1): Promise<AnimeListPage> {
  const feed = await getCompletedFeed();
  const start = (page - 1) * PAGE_SIZE;
  const items = feed.slice(start, start + PAGE_SIZE);
  return {
    items: items.map(normalizeItem),
    pagination: {
      currentPage: page,
      totalPages: null,
      hasPrevPage: page > 1,
      hasNextPage: feed.length > start + PAGE_SIZE,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: feed.length > start + PAGE_SIZE ? page + 1 : null,
    },
  };
}

/** Terpopuler berdasarkan views asli AnimeIn (bukan skor yang tidak ada). */
export async function getPopularAnime(page = 1): Promise<AnimeListPage> {
  const items = await animeIn.getPopular(page - 1);
  return {
    items: items.map(normalizeItem),
    pagination: paginationFromCount(items.length, page, 60),
  };
}

export async function getAnimeGenres(): Promise<GenreRef[]> {
  const genres = await animeIn.getGenres();
  return genres.map((g) => ({ id: g.id, title: g.name }));
}

export async function getAnimeByGenre(
  genreIdOrName: string,
  page = 1
): Promise<AnimeListPage> {
  const items = await animeIn.getByGenre(genreIdOrName, page - 1);
  return {
    items: items.map(normalizeItem),
    pagination: paginationFromCount(items.length, page, 60),
  };
}

export async function searchAnime(keyword: string): Promise<AnimeListItem[]> {
  const items = await animeIn.search(keyword, 0);
  return items.map(normalizeItem);
}

// Helper franchise kini shared di ../franchise supaya provider legacy bisa
// memakai logika "Anime Terkait satu franchise" yang sama.
export { baseTitle } from "../franchise";

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const { anime, episodes } = await animeIn.getDetail(slug, true);
  const episodeList = episodes.map(normalizeEpisode); // sudah urut menaik

  // "Anime Terkait": prioritas 1 = satu franchise (season lain, OVA, film)
  // lewat pencarian judul dasar; sisanya diisi anime segenre terpopuler.
  const related: ScrapeAnimeItem[] = [];
  const seen = new Set<string>([anime.id]);
  const franchiseQuery = baseTitle(anime.title);
  if (franchiseQuery.length >= 3) {
    try {
      const found = await animeIn.search(franchiseQuery, 0, "views");
      for (const x of found) {
        if (seen.has(x.id)) continue;
        if (!sameFranchise(x.title, anime.title)) continue;
        seen.add(x.id);
        related.push(x);
      }
    } catch {
      /* franchise opsional -> lanjut ke fallback genre */
    }
  }
  // Season/OVA diurut berdasarkan judul agar urutan natural (S1, S2, OVA ...).
  related.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

  const firstGenre = anime.genres[0];
  if (related.length < 12 && firstGenre) {
    try {
      const sameGenre = await animeIn.getByGenre(firstGenre, 0, "views");
      for (const x of sameGenre) {
        if (related.length >= 12) break;
        if (seen.has(x.id)) continue;
        seen.add(x.id);
        related.push(x);
      }
    } catch {
      /* abaikan */
    }
  }
  const recommended: AnimeListItem[] = related.slice(0, 12).map(normalizeItem);

  const aired = anime.aired_start
    ? anime.aired_end
      ? `${anime.aired_start} s/d ${anime.aired_end}`
      : anime.aired_start
    : null;

  return {
    title: anime.title,
    animeId: anime.id,
    poster: anime.poster ?? "",
    japaneseTitle: anime.synonyms,
    score: null, // tidak tersedia di AnimeIn
    producers: null, // tidak tersedia
    type: anime.type ? titleCase(anime.type) : null,
    status: statusLabel(anime.status),
    episodeCount: episodeList.length || null,
    duration: null, // tidak tersedia
    aired,
    studios: anime.studio || null,
    synopsis: anime.synopsis,
    genres: anime.genres.map((g) => ({ id: slugify(g), title: g })),
    episodeList,
    recommended,
  };
}

export async function getAnimeEpisode(
  episodeId: string
): Promise<AnimeEpisodeDetail> {
  const stream = await animeIn.getStream(episodeId);
  const ep = stream.episode;

  const episodeList = ep.anime_id
    ? (await animeIn.getAllEpisodes(ep.anime_id).catch(() => [])).map(normalizeEpisode)
    : [];

  // prev/next dari posisi di daftar episode (stream hanya memberi next).
  const idx = episodeList.findIndex((e) => e.episodeId === ep.id);
  const prevEpisodeId = idx > 0 ? episodeList[idx - 1].episodeId : null;
  const nextFromList =
    idx >= 0 && idx < episodeList.length - 1
      ? episodeList[idx + 1].episodeId
      : null;
  const nextEpisodeId = ep.next_episode_id ?? nextFromList;

  // Hanya server yang BENAR-BENAR bisa diputar browser yang masuk race
  // player: file .mp4/.webm/.m3u8 atau tipe "direct" dari storages AnimeIn
  // (terverifikasi: <video> lintas-origin memuatnya tanpa blokir CF/CORP).
  // Server "semi" (mis. uservideo.xyz, file .mkv) tidak didukung decoder
  // browser -> jadi opsi unduh saja, tidak dipaksa masuk player.
  const isPlayable = (url: string) => {
    try {
      const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
      return ["mp4", "webm", "m3u8", "m4v"].includes(ext);
    } catch {
      return false;
    }
  };

  // Grup kualitas: satu grup per label quality, serverId komposit
  // "<episodeId>:<rowId>" agar resolve lazy tetap lewat route internal
  // yang sama (/api/anime/server/[serverId]) tanpa membocorkan URL dini.
  const qualityMap = new Map<string, AnimeQualityGroup>();
  for (const s of stream.servers) {
    if (!isPlayable(s.url)) continue;
    const quality = s.quality ?? "auto";
    const group = qualityMap.get(quality) ?? { quality, servers: [] };
    group.servers.push({
      serverId: `${ep.id}:${s.id}`,
      title: s.name,
    });
    qualityMap.set(quality, group);
  }
  const qualities = [...qualityMap.values()].sort((a, b) => {
    const q = (x: string) => parseInt(x, 10) || 0;
    return q(b.quality) - q(a.quality);
  });

  // Link unduh: server AnimeIn adalah file langsung (.mp4) — valid diunduh.
  const downloads: DownloadOption[] = stream.servers.map((s) => ({
    quality: s.quality ?? "auto",
    provider: s.name,
    url: s.url,
  }));

  return {
    title: ep.title,
    downloads,
    animeId: ep.anime_id ?? "",
    animeTitle: null,
    releaseTime: ep.release_date,
    defaultStreamingUrl: null, // AnimeIn tidak punya embed default
    prevEpisodeId,
    nextEpisodeId,
    qualities,
    episodeList,
  };
}

/**
 * Resolve serverId komposit "<episodeId>:<rowId>" -> URL final.
 * Stream diambil segar (cache Redis TTL 120s) karena URL cepat berubah.
 */
export async function resolveAnimeServerUrl(serverId: string): Promise<string> {
  const sep = serverId.indexOf(":");
  if (sep <= 0) throw new Error("Format serverId AnimeIn tidak valid");
  const episodeId = serverId.slice(0, sep);
  const rowId = serverId.slice(sep + 1);

  const stream = await animeIn.getStream(episodeId);
  const server = stream.servers.find((s) => s.id === rowId);
  if (!server || !server.url) throw new Error("URL server tidak tersedia");
  return server.url;
}

/* ---------- Util ---------- */

/** Nama hari ini (bahasa Indonesia, uppercase) untuk getHome(day). */
export function currentIndonesianDay(): string {
  const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
  return days[new Date().getDay()];
}
