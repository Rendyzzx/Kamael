import type { Metadata } from "next";
import InfiniteGridDonghua from "@/components/ui/InfiniteGridDonghua";
import Tabs from "@/components/ui/Tabs";
import GenreSelect from "@/components/ui/GenreSelect";
import SearchBox from "@/components/navbar/SearchBox";
import {
  getCompletedDonghua,
  getDonghuaByGenre,
  getDonghuaGenres,
  getLatestDonghua,
  getOngoingDonghua,
} from "@/lib/api/donghua";
import { validatePage, validateSlug } from "@/lib/utils/validation";

export const metadata: Metadata = {
  title: "Donghua",
  description: "Jelajahi koleksi donghua subtitle Indonesia.",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; page?: string; genre?: string }>;
}

type Tab = "latest" | "ongoing" | "completed";

function buildHref(params: { tab: Tab; genre?: string }): string {
  const sp = new URLSearchParams();
  sp.set("tab", params.tab);
  if (params.genre) sp.set("genre", params.genre);
  const qs = sp.toString();
  return qs ? `/donghua?${qs}` : "/donghua";
}

export default async function DonghuaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "ongoing" || sp.tab === "completed" ? sp.tab : "latest";
  const page = validatePage(sp.page);
  const genre = sp.genre ? validateSlug(sp.genre) ?? undefined : undefined;

  const genresRes = await getDonghuaGenres().catch(() => []);
  const items = genre
    ? await getDonghuaByGenre(genre, page).catch(() => [])
    : tab === "ongoing"
      ? await getOngoingDonghua(page).catch(() => [])
      : tab === "completed"
        ? await getCompletedDonghua(page).catch(() => [])
        : await getLatestDonghua(page).catch(() => []);

  const mayHaveNext = genre ? items.length >= 10 : items.length >= 30;

  return (
    <div style={{ padding: "0 var(--page-x)" }}>
      <SearchBox />

      <div className="space-y-5" style={{ marginTop: 16 }}>
        <h1 className="font-display text-[18px] font-bold text-white">Donghua</h1>

        <Tabs
          items={[
            { key: "latest", label: "Terbaru", href: buildHref({ tab: "latest", genre }), active: !genre && tab === "latest" },
            { key: "ongoing", label: "Sedang Tayang", href: buildHref({ tab: "ongoing", genre }), active: !genre && tab === "ongoing" },
            { key: "completed", label: "Tamat", href: buildHref({ tab: "completed", genre }), active: !genre && tab === "completed" },
            ...(genre ? [{ key: "genre", label: `Genre: ${genre}`, href: "/donghua", active: true }] : []),
          ]}
        />

        <GenreSelect genres={genresRes.map((g) => ({ id: g.slug, title: g.name }))} basePath="/donghua" activeGenre={genre} />

        <InfiniteGridDonghua
          key={`${tab}-${genre ?? ""}-${page}`}
          initialItems={items}
          initialHasNext={items.length ? mayHaveNext : false}
          initialPage={page}
          tab={tab}
          genre={genre}
          emptyMessage={
            genre
              ? "Tidak ada donghua untuk genre ini, atau data sedang tidak tersedia."
              : "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."
          }
        />
      </div>
    </div>
  );
}
