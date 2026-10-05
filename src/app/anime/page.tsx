import type { Metadata } from "next";
import AnimeCard from "@/components/cards/AnimeCard";
import Pagination from "@/components/ui/Pagination";
import Tabs from "@/components/ui/Tabs";
import GenreSelect from "@/components/ui/GenreSelect";
import {
  getAnimeByGenre,
  getAnimeGenres,
  getCompletedAnime,
  getOngoingAnime,
} from "@/lib/api/otakudesu";
import { validatePage, validateSlug } from "@/lib/utils/validation";

export const metadata: Metadata = {
  title: "Anime",
  description: "Jelajahi koleksi anime subtitle Indonesia.",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; page?: string; genre?: string }>;
}

function buildHref(params: {
  tab: string;
  page?: number;
  genre?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("tab", params.tab);
  if (params.genre) sp.set("genre", params.genre);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Anime</h1>
        <GenreSelect
          genres={genresRes}
          basePath="/anime"
          activeGenre={genre}
        />
      </div>

      <Tabs
        items={[
          {
            key: "ongoing",
            label: "Sedang Tayang",
            href: buildHref({ tab: "ongoing", genre }),
            active: !genre && tab === "ongoing",
          },
          {
            key: "completed",
            label: "Tamat",
            href: buildHref({ tab: "completed", genre }),
            active: !genre && tab === "completed",
          },
          ...(genre
            ? [
                {
                  key: "genre",
                  label: `Genre: ${genre}`,
                  href: "/anime",
                  active: true,
                },
              ]
            : []),
        ]}
      />

      {list.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {list.items.map((a, i) => (
            <AnimeCard key={a.animeId} anime={a} priority={i < 6} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
          {genre
            ? "Tidak ada anime untuk genre ini, atau data sedang tidak tersedia."
            : "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."}
        </p>
      )}

      <Pagination
        currentPage={list.pagination.currentPage}
        hasPrev={list.pagination.hasPrevPage}
        hasNext={list.pagination.hasNextPage}
        totalPages={list.pagination.totalPages}
        buildHref={(p) => buildHref({ tab, page: p, genre })}
      />

    </div>
  );
}
