/**
 * AnimeProvider — facade pemilihan provider sumber data anime.
 *
 * Provider aktif dikontrol env ANIME_PROVIDER:
 * - "animein" (default): AnimeIn scraper (src/lib/api/animein/)
 * - "legacy": Otakudesu via Sanka Vollerei (src/lib/api/legacy/)
 *
 * Kontrak fungsi & bentuk data IDENTIK untuk semua provider — frontend dan
 * route internal hanya import file ini, tidak pernah menyentuh provider
 * secara langsung. Mengganti provider cukup ganti env, tanpa bongkar UI.
 *
 * Switching dilakukan level deployment (bukan per-request): ID space antar
 * provider berbeda; fallback per-request akan mencampur ID dan merusak
 * history/favorites/link secara diam-diam. Lihat provider.ts.
 */

import * as animeInProvider from "./animein/provider";
import * as legacyProvider from "./legacy/anime";

export type AnimeListPage = animeInProvider.AnimeListPage;

const useAnimeIn = (process.env.ANIME_PROVIDER ?? "animein") !== "legacy";

const provider = useAnimeIn ? animeInProvider : legacyProvider;

/* ---------- Distribusi kontrak (identik untuk semua provider) ---------- */

export const getAnimeHome = () => provider.getAnimeHome();
export const getOngoingAnime = (page = 1) => provider.getOngoingAnime(page);
export const getCompletedAnime = (page = 1) => provider.getCompletedAnime(page);
export const getAnimeGenres = () => provider.getAnimeGenres();
export const getAnimeByGenre = (genreId: string, page = 1) =>
  provider.getAnimeByGenre(genreId, page);
export const searchAnime = (keyword: string) => provider.searchAnime(keyword);
export const getAnimeDetail = (slug: string) => provider.getAnimeDetail(slug);
export const getAnimeEpisode = (episodeId: string) =>
  provider.getAnimeEpisode(episodeId);
export const resolveAnimeServerUrl = (serverId: string) =>
  provider.resolveAnimeServerUrl(serverId);

/**
 * Terpopuler (views asli AnimeIn). Legacy tidak punya padanan langsung —
 * fallback ke completed agar facade tetap aman dipanggil.
 */
export async function getPopularAnime(page = 1): Promise<AnimeListPage> {
  if ("getPopularAnime" in provider) {
    return (provider as typeof animeInProvider).getPopularAnime(page);
  }
  return legacyProvider.getCompletedAnime(page);
}
