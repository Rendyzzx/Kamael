import type { Metadata } from "next";
import DonghuaCard from "@/components/cards/DonghuaCard";
import Pagination from "@/components/ui/Pagination";
import Tabs from "@/components/ui/Tabs";
import GenreSelect from "@/components/ui/GenreSelect";
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
  const tab: Tab =
    sp.tab === "ongoing" || sp.tab === "completed" ? sp.tab : "latest";
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

  // API donghua tidak menyediakan info pagination; page berikut tetap dicoba
  // selama halaman ini penuh (API selalu mengirim 30 item per halaman penuh).
  const mayHaveNext = genre ? items.length >= 10 : items.length >= 30;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Donghua</h1>
        <GenreSelect
          genres={genresRes.map((g) => ({ id: g.slug, title: g.name }))}
          basePath="/donghua"
          activeGenre={genre}
        />
      </div>

      <Tabs
        items={[
          {
            key: "latest",
            label: "Terbaru",
            href: buildHref({ tab: "latest", genre }),
            active: !genre && tab === "latest",
          },
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
                  href: "/donghua",
                  active: true,
                },
              ]
            : []),
        ]}
      />

      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((d, i) => (
            <DonghuaCard
              key={d.slug}
              donghua={d}
              href={`/donghua/${d.slug}`}
              priority={i < 6}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
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
  );
}
