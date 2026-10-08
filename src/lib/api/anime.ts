/**
 * AnimeProvider — facade pemilihan provider sumber data anime.
 *
 * Provider aktif dikontrol env ANIME_PROVIDER:
 * - "legacy" (default): Otakudesu via Sanka Vollerei (src/lib/api/legacy/)
 * - "animein": AnimeIn scraper (src/lib/api/animein/)
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

const useAnimeIn = (process.env.ANIME_PROVIDER ?? "legacy") === "animein";

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
 * Terpopuler. AnimeIn punya views asli. Legacy tidak punya padanan —
 * fallback: item "Tamat" diurut skor tertinggi (perilaku pra-migrasi).
 */
export async function getPopularAnime(page = 1): Promise<AnimeListPage> {
  if ("getPopularAnime" in provider) {
    return (provider as typeof animeInProvider).getPopularAnime(page);
  }
  const completed = await legacyProvider.getCompletedAnime(page);
  const items = [...completed.items].sort(
    (a, b) => Number(b.score ?? 0) - Number(a.score ?? 0)
  );
  return { ...completed, items };
}
