"use client";

import DonghuaCard from "@/components/cards/DonghuaCard";
import type { DonghuaListItem } from "@/types/donghua";
import InfiniteGrid from "@/components/ui/InfiniteGrid";

/**
 * Wrapper InfiniteGrid khusus listing Donghua — tahu cara memanggil
 * /api/donghua/list dengan tab/genre yang sedang aktif, dan cara
 * merender DonghuaCard. renderItem/getKey didefinisikan di sini
 * (bukan diterima dari Server Component) karena fungsi tidak bisa
 * dikirim lewat RSC boundary.
 */
export default function InfiniteGridDonghua({
  initialItems,
  initialHasNext,
  initialPage,
  tab,
  genre,
  emptyMessage,
}: {
  initialItems: DonghuaListItem[];
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
      getKey={(d) => d.slug}
      renderItem={(d, i) => <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} priority={i < 6} />}
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
