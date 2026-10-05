"use client";

import type { AnimeListItem } from "@/types/anime";
import InfiniteGrid from "@/components/ui/InfiniteGrid";

/**
 * Wrapper InfiniteGrid khusus listing Anime — tahu cara memanggil
 * /api/anime/list dengan tab/genre yang sedang aktif.
 */
export default function InfiniteGridAnime({
  initialItems,
  initialHasNext,
  initialPage,
  tab,
  genre,
  renderItem,
  getKey,
  emptyMessage,
}: {
  initialItems: AnimeListItem[];
  initialHasNext: boolean | null;
  initialPage: number;
  tab: string;
  genre?: string;
  renderItem: (item: AnimeListItem, index: number) => React.ReactNode;
  getKey: (item: AnimeListItem) => string;
  emptyMessage: string;
}) {
  return (
    <InfiniteGrid
      initialItems={initialItems}
      initialHasNext={initialHasNext}
      initialPage={initialPage}
      renderItem={renderItem}
      getKey={getKey}
      emptyMessage={emptyMessage}
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
