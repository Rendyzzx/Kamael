import type { Metadata } from "next";
import DonghuaCard from "@/components/cards/DonghuaCard";
import Pagination from "@/components/ui/Pagination";
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

function buildHref(params: { tab: Tab; page?: number; genre?: string }): string {
  const sp = new URLSearchParams();
  sp.set("tab", params.tab);
  if (params.genre) sp.set("genre", params.genre);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
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
        <h1 className="font-display text-[26px] font-bold text-white">Donghua</h1>

        <Tabs
          items={[
            { key: "latest", label: "Terbaru", href: buildHref({ tab: "latest", genre }), active: !genre && tab === "latest" },
            { key: "ongoing", label: "Sedang Tayang", href: buildHref({ tab: "ongoing", genre }), active: !genre && tab === "ongoing" },
            { key: "completed", label: "Tamat", href: buildHref({ tab: "completed", genre }), active: !genre && tab === "completed" },
            ...(genre ? [{ key: "genre", label: `Genre: ${genre}`, href: "/donghua", active: true }] : []),
          ]}
        />

        <GenreSelect genres={genresRes.map((g) => ({ id: g.slug, title: g.name }))} basePath="/donghua" activeGenre={genre} />

        {items.length ? (
          <div className="grid grid-cols-3 gap-3">
            {items.map((d, i) => (
              <DonghuaCard key={d.slug} donghua={d} href={`/donghua/${d.slug}`} priority={i < 6} />
            ))}
          </div>
        ) : (
          <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
            {genre
              ? "Tidak ada donghua untuk genre ini, atau data sedang tidak tersedia."
              : "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."}
          </p>
        )}

        <Pagination
          currentPage={page}
          hasPrev={page > 1}
          hasNext={items.length ? mayHaveNext : false}
          totalPages={null}
          buildHref={(p) => buildHref({ tab, page: p, genre })}
        />
      </div>
    </div>
  );
}
