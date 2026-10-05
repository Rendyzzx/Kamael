import Image from "next/image";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import ContinueWatchingCard from "@/components/cards/ContinueWatchingCard";
import SectionHeader from "@/components/ui/SectionHeader";
import HorizontalRow from "@/components/ui/HorizontalRow";
import { getAnimeGenres, getAnimeHome, getCompletedAnime } from "@/lib/api/anime";
import { getLatestDonghua, getCompletedDonghua } from "@/lib/api/donghua";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { listProgress } from "@/lib/redis/watching";

/** Homepage: fokus pada konten, bukan hero raksasa. Request API dibatasi + di-cache. */
export const revalidate = 600;

export default async function HomePage() {
  const userId = await getAuthenticatedUserId();

  const [animeHomeRes, donghuaLatestRes, animeCompletedRes, donghuaCompletedRes, genresRes, continueRes] =
    await Promise.allSettled([
      getAnimeHome(),
      getLatestDonghua(1),
      getCompletedAnime(1),
      getCompletedDonghua(1),
      getAnimeGenres(),
      userId ? listProgress(userId) : Promise.resolve([]),
    ]);

  const animeOngoing = animeHomeRes.status === "fulfilled" ? animeHomeRes.value.ongoing : [];
  const donghuaLatest = donghuaLatestRes.status === "fulfilled" ? donghuaLatestRes.value : [];
  const popularAnime =
    animeCompletedRes.status === "fulfilled"
      ? [...animeCompletedRes.value.items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      : [];
  const donghuaCompleted = donghuaCompletedRes.status === "fulfilled" ? donghuaCompletedRes.value : [];
  const genres = genresRes.status === "fulfilled" ? genresRes.value : [];
  const continueWatching = continueRes.status === "fulfilled" ? continueRes.value.slice(0, 10) : [];

  const featured = animeOngoing[0] ?? null;

  return (
    <div className="space-y-10">
      {/* Featured — satu konten unggulan, bukan hero generik */}
      {featured ? (
        <section aria-labelledby="featured-anime">
          <Link
            href={`/anime/${featured.animeId}`}
            className="group relative flex h-44 overflow-hidden rounded-lg bg-surface-900 sm:h-56"
          >
            {featured.poster ? (
              <Image
                src={featured.poster}
                alt={featured.title}
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-70 transition-opacity group-hover:opacity-80"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-surface-950 via-surface-950/70 to-transparent" />
            <div className="relative z-10 flex max-w-sm flex-col justify-center gap-2 px-5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-500">
                Sedang Tayang
              </span>
              <h1 className="line-clamp-2 text-xl font-bold tracking-tight sm:text-2xl">{featured.title}</h1>
              {featured.genres?.length ? (
                <p className="truncate text-xs text-zinc-400">
                  {featured.genres.slice(0, 3).map((g) => g.title).join(" · ")}
                </p>
              ) : null}
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-accent-600">
                Tonton Sekarang
              </span>
            </div>
          </Link>
        </section>
      ) : null}

      {/* Continue Watching — hanya muncul jika login dan punya progress */}
      {continueWatching.length > 0 ? (
        <section aria-labelledby="continue-watching">
          <SectionHeader title="Continue Watching" />
          <HorizontalRow>
            {continueWatching.map((item) => (
              <div key={item.contentId} className="shrink-0 snap-start">
                <ContinueWatchingCard item={item} />
              </div>
            ))}
          </HorizontalRow>
        </section>
      ) : null}

      {/* Anime Terbaru */}
      <section aria-labelledby="anime-terbaru">
        <SectionHeader title="Anime Terbaru" href="/anime" />
        {animeOngoing.length ? (
          <HorizontalRow>
            {animeOngoing.slice(0, 15).map((a, i) => (
              <div key={a.animeId} className="w-32 shrink-0 snap-start sm:w-36">
                <AnimeCard anime={a} priority={i < 4} />
              </div>
            ))}
          </HorizontalRow>
        ) : (
          <EmptyFallback />
        )}
      </section>

      {/* Donghua Terbaru */}
      <section aria-labelledby="donghua-terbaru">
        <SectionHeader title="Donghua Terbaru" href="/donghua" />
        {donghuaLatest.length ? (
          <HorizontalRow>
            {donghuaLatest.slice(0, 15).map((d, i) => (
              <div key={d.slug} className="w-32 shrink-0 snap-start sm:w-36">
                <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} priority={i < 4} />
              </div>
            ))}
          </HorizontalRow>
        ) : (
          <EmptyFallback />
        )}
      </section>

      {/* Popular Anime — anime tamat diurutkan skor tertinggi (data asli, bukan field "popular" buatan) */}
      <section aria-labelledby="popular-anime">
        <SectionHeader title="Anime Terpopuler" href="/anime" />
        {popularAnime.length ? (
          <HorizontalRow>
            {popularAnime.slice(0, 15).map((a) => (
              <div key={a.animeId} className="w-32 shrink-0 snap-start sm:w-36">
                <AnimeCard anime={a} />
              </div>
            ))}
          </HorizontalRow>
        ) : (
          <EmptyFallback />
        )}
      </section>

      {/* Donghua Tamat — API donghua tidak menyediakan skor pada listing, jadi tidak diberi label "Popular" */}
      <section aria-labelledby="donghua-tamat">
        <SectionHeader title="Donghua Tamat" href="/donghua" />
        {donghuaCompleted.length ? (
          <HorizontalRow>
            {donghuaCompleted.slice(0, 15).map((d) => (
              <div key={d.slug} className="w-32 shrink-0 snap-start sm:w-36">
                <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} />
              </div>
            ))}
          </HorizontalRow>
        ) : (
          <EmptyFallback />
        )}
      </section>

      {/* Genres */}
      {genres.length ? (
        <section aria-labelledby="genres">
          <SectionHeader title="Genres" href="/anime" />
          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 20).map((g) => (
              <Link
                key={g.id}
                href={`/anime?genre=${encodeURIComponent(g.id)}`}
                className="rounded-full border border-surface-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-accent-500 hover:text-accent-500"
              >
                {g.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EmptyFallback() {
  return (
    <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
      Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
    </p>
  );
}
