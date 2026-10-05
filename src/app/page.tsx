import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { getAnimeHome } from "@/lib/api/otakudesu";
import { getLatestDonghua } from "@/lib/api/donghua";

/** Homepage: hanya 2 request API (hemat rate limit), sisanya di-cache. */
export const revalidate = 600;

export default async function HomePage() {
  // Kedua sumber diambil paralel; jika salah satu gagal, section-nya merender fallback.
  const [animeHomeRes, donghuaRes] = await Promise.allSettled([
    getAnimeHome(),
    getLatestDonghua(1),
  ]);

  const animeOngoing =
    animeHomeRes.status === "fulfilled" ? animeHomeRes.value.ongoing : [];
  const donghuaLatest =
    donghuaRes.status === "fulfilled" ? donghuaRes.value.slice(0, 12) : [];
  const animeSlice = animeOngoing.slice(0, 12);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="py-8 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Temukan Anime &amp; Donghua Favoritmu
          </h1>
          <p className="mt-4 text-sm text-zinc-400 sm:text-base">
            Streaming berbagai anime dan donghua dengan tampilan sederhana,
            cepat, dan nyaman.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/anime"
              className="rounded-lg bg-accent-500 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-600"
            >
              Jelajahi Anime
            </Link>
            <Link
              href="/donghua"
              className="rounded-lg bg-surface-800 px-6 py-3 text-center text-sm font-semibold text-zinc-100 transition-colors hover:bg-surface-700"
            >
              Jelajahi Donghua
            </Link>
          </div>
        </div>
      </section>

      {/* Anime Terbaru */}
      <section aria-labelledby="anime-terbaru">
        <SectionHeader title="Anime Terbaru" href="/anime" />
        {animeSlice.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {animeSlice.map((a, i) => (
              <AnimeCard key={a.animeId} anime={a} priority={i < 6} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
            Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
          </p>
        )}
      </section>

      {/* Donghua Terbaru */}
      <section aria-labelledby="donghua-terbaru">
        <SectionHeader title="Donghua Terbaru" href="/donghua" />
        {donghuaLatest.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {donghuaLatest.map((d, i) => (
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
            Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
          </p>
        )}
      </section>
    </div>
  );
}
