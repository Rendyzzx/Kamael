import type { Metadata } from "next";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { searchAnime } from "@/lib/api/anime";
import { searchDonghua } from "@/lib/api/donghua";
import { sanitizeSearchQuery } from "@/lib/utils/validation";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);
  return {
    title: q ? `Pencarian: ${q}` : "Pencarian",
    robots: { index: false },
  };
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);

  if (q.length < 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Pencarian</h1>
        <p className="text-sm text-zinc-500">
          Ketik minimal 2 karakter pada kolom pencarian di navbar.
        </p>
      </div>
    );
  }

  // Hasil TETAP dipisah per kategori; jika salah satu sumber gagal, bagian
  // tersebut menampilkan fallback, bukan error mentah.
  const [animeRes, donghuaRes] = await Promise.allSettled([
    searchAnime(q),
    searchDonghua(q),
  ]);

  const anime =
    animeRes.status === "fulfilled"
      ? animeRes.value
      : [];
  const donghua =
    donghuaRes.status === "fulfilled"
      ? donghuaRes.value
      : [];
  const animeFailed = animeRes.status === "rejected";
  const donghuaFailed = donghuaRes.status === "rejected";

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hasil pencarian: <span className="text-accent-500">{q}</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {anime.length} anime · {donghua.length} donghua
        </p>
      </div>

      <section aria-labelledby="hasil-anime">
        <SectionHeader title="Anime" />
        {anime.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {anime.map((a) => (
              <AnimeCard key={a.animeId} anime={a} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
            {animeFailed
              ? "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."
              : "Tidak ada anime yang cocok."}
          </p>
        )}
      </section>

      <section aria-labelledby="hasil-donghua">
        <SectionHeader title="Donghua" />
        {donghua.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {donghua.map((d) => (
              <DonghuaCard key={d.slug} donghua={d} href={`/donghua/${d.slug}`} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
            {donghuaFailed
              ? "Data sedang tidak tersedia. Silakan coba beberapa saat lagi."
              : "Tidak ada donghua yang cocok."}
          </p>
        )}
      </section>

      <p className="text-center text-sm text-zinc-500">
        Tidak menemukan yang dicari?{" "}
        <Link href="/anime" className="text-accent-500 hover:underline">
          Jelajahi semua anime
        </Link>{" "}
        atau{" "}
        <Link href="/donghua" className="text-accent-500 hover:underline">
          semua donghua
        </Link>
        .
      </p>
    </div>
  );
}
