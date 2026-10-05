import type { Metadata } from "next";
import InfiniteGridAnime from "@/components/ui/InfiniteGridAnime";
import Tabs from "@/components/ui/Tabs";
import GenreSheet from "@/components/ui/GenreSheet";
import SearchBox from "@/components/navbar/SearchBox";
import PortalSwitch from "@/components/portal/PortalSwitch";
import {
  getAnimeByGenre,
  getAnimeGenres,
  getCompletedAnime,
  getOngoingAnime,
} from "@/lib/api/anime";
import { validatePage, validateSlug } from "@/lib/utils/validation";

export const metadata: Metadata = {
  title: "Anime",
  description: "Jelajahi koleksi anime subtitle Indonesia.",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; page?: string; genre?: string }>;
}

function buildHref(params: { tab: string; genre?: string }): string {
  const sp = new URLSearchParams();
  sp.set("tab", params.tab);
  if (params.genre) sp.set("genre", params.genre);
  const qs = sp.toString();
  return qs ? `/anime?${qs}` : "/anime";
}

export default async function AnimePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = sp.tab === "completed" ? "completed" : "ongoing";
  const page = validatePage(sp.page);
  const genre = sp.genre ? validateSlug(sp.genre) ?? undefined : undefined;

  const genresRes = await getAnimeGenres().catch(() => []);
  const listPromise = genre
    ? getAnimeByGenre(genre, page)
    : tab === "completed"
      ? getCompletedAnime(page)
      : getOngoingAnime(page);
  const list = await listPromise;

  return (
    <div style={{ padding: "0 var(--page-x)" }}>
      <SearchBox />

      <div className="space-y-5" style={{ marginTop: 16 }}>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[18px] font-bold text-white">Anime</h1>
          <PortalSwitch portal="anime" />
        </div>

        <Tabs
          items={[
            { key: "ongoing", label: "Sedang Tayang", href: buildHref({ tab: "ongoing", genre }), active: !genre && tab === "ongoing" },
            { key: "completed", label: "Tamat", href: buildHref({ tab: "completed", genre }), active: !genre && tab === "completed" },
            ...(genre ? [{ key: "genre", label: `Genre: ${genre}`, href: "/anime", active: true }] : []),
          ]}
        />

        <GenreSheet genres={genresRes} basePath="/anime" activeGenre={genre} />

        <InfiniteGridAnime
          key={`${tab}-${genre ?? ""}-${page}`}
          initialItems={list.items}
          initialHasNext={list.pagination.hasNextPage}
          initialPage={list.pagination.currentPage}
          tab={tab}
          genre={genre}
          emptyMessage={
            genre
              ? "Tidak ada anime untuk genre ini, atau data sedang tidak tersedia."
              : "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."
          }
        />
      </div>
    </div>
  );
}
