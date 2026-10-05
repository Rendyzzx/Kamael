"use client";

import type { DonghuaListItem } from "@/types/donghua";
import InfiniteGrid from "@/components/ui/InfiniteGrid";

/**
 * Wrapper InfiniteGrid khusus listing Donghua — tahu cara memanggil
 * /api/donghua/list dengan tab/genre yang sedang aktif.
 */
export default function InfiniteGridDonghua({
  initialItems,
  initialHasNext,
  initialPage,
  tab,
  genre,
  renderItem,
  getKey,
  emptyMessage,
}: {
  initialItems: DonghuaListItem[];
  initialHasNext: boolean | null;
  initialPage: number;
  tab: string;
  genre?: string;
  renderItem: (item: DonghuaListItem, index: number) => React.ReactNode;
  getKey: (item: DonghuaListItem) => string;
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
        const res = await fetch(`/api/donghua/list?${sp.toString()}`);
        if (!res.ok) return { items: [], hasNextPage: false };
        return (await res.json()) as { items: DonghuaListItem[]; hasNextPage: boolean | null };
      }}
    />
  );
}
