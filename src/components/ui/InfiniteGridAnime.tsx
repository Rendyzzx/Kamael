"use client";

import AnimeCard from "@/components/cards/AnimeCard";
import type { AnimeListItem } from "@/types/anime";
import InfiniteGrid from "@/components/ui/InfiniteGrid";

/**
 * Wrapper InfiniteGrid khusus listing Anime — tahu cara memanggil
 * /api/anime/list dengan tab/genre yang sedang aktif, dan cara
 * merender AnimeCard. renderItem/getKey didefinisikan di sini (bukan
 * diterima dari Server Component) karena fungsi tidak bisa dikirim
 * lewat RSC boundary.
 */
export default function InfiniteGridAnime({
  initialItems,
  initialHasNext,
  initialPage,
  tab,
  genre,
  emptyMessage,
}: {
  initialItems: AnimeListItem[];
  initialHasNext: boolean | null;
  initialPage: number;
  tab: string;
  genre?: string;
  emptyMessage: string;
}) {
  return (
    <InfiniteGrid
      initialItems={initialItems}
      initialHasNext={initialHasNext}
      initialPage={initialPage}
      emptyMessage={emptyMessage}
      getKey={(a) => a.animeId}
      renderItem={(a, i) => <AnimeCard anime={a} priority={i < 6} />}
      fetchPage={async (page) => {
        const sp = new URLSearchParams();
        sp.set("tab", tab);
        if (genre) sp.set("genre", genre);
        sp.set("page", String(page));
        const res = await fetch(`/api/anime/list?${sp.toString()}`);
        if (!res.ok) return { items: [], hasNextPage: false };
        return (await res.json()) as { items: AnimeListItem[]; hasNextPage: boolean | null };
      }}
    />
  );
}
