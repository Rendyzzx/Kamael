import Image from "next/image";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import ContinueWatchingCard from "@/components/cards/ContinueWatchingCard";
import SectionHeader from "@/components/ui/SectionHeader";
import HorizontalRow from "@/components/ui/HorizontalRow";
import ShowMoreChips from "@/components/ui/ShowMoreChips";
import SearchBox from "@/components/navbar/SearchBox";
import { getAnimeGenres, getAnimeHome, getCompletedAnime } from "@/lib/api/anime";
import { getLatestDonghua, getCompletedDonghua } from "@/lib/api/donghua";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { listProgress } from "@/lib/redis/watching";

/** Homepage: fokus pada konten. Request API dibatasi + di-cache. */
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
    <div>
      {/* Background gradient maroon -> bg, hanya di area atas Home */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "linear-gradient(180deg,#5A1A20 0%,#3A1218 25%,#121316 60%)" }}
        aria-hidden="true"
      />

      <div className="relative" style={{ paddingTop: 16 }}>
        {/* Featured — satu konten unggulan dari data asli (ongoing teratas) */}
        {featured ? (
          <section aria-labelledby="featured-anime" style={{ padding: "0 var(--page-x)" }}>
            <Link href={`/anime/${featured.animeId}`} className="group relative block overflow-hidden rounded-card" style={{ height: 150 }}>
              {featured.poster ? (
                <Image src={featured.poster} alt={featured.title} fill priority sizes="480px" className="object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/75" />
              <h1 className="font-display absolute inset-x-3 bottom-3 line-clamp-2 text-center text-[22px] font-medium text-white">
                {featured.title}
              </h1>
            </Link>
          </section>
        ) : null}

        <div style={{ marginTop: "var(--section-gap)" }}>
          <SearchBox />
        </div>

        <div className="space-y-8" style={{ marginTop: "var(--section-gap)" }}>
          {/* Terakhir Ditonton */}
          {continueWatching.length > 0 ? (
            <section aria-labelledby="continue-watching" style={{ padding: "0 var(--page-x)" }}>
              <SectionHeader title="Terakhir Ditonton" />
              <HorizontalRow>
                {continueWatching.map((item) => (
                  <ContinueWatchingCard key={item.contentId} item={item} />
                ))}
              </HorizontalRow>
            </section>
          ) : null}

          {/* Anime Terbaru */}
          <section aria-labelledby="anime-terbaru" style={{ padding: "0 var(--page-x)" }}>
            <SectionHeader title="Anime Terbaru" href="/anime" />
            {animeOngoing.length ? (
              <HorizontalRow>
                {animeOngoing.slice(0, 15).map((a, i) => (
                  <div key={a.animeId} className="shrink-0 snap-start" style={{ width: 128 }}>
                    <AnimeCard anime={a} priority={i < 4} />
                  </div>
                ))}
              </HorizontalRow>
            ) : (
              <EmptyFallback />
            )}
          </section>

          {/* Donghua Terbaru */}
          <section aria-labelledby="donghua-terbaru" style={{ padding: "0 var(--page-x)" }}>
            <SectionHeader title="Donghua Terbaru" href="/donghua" />
            {donghuaLatest.length ? (
              <HorizontalRow>
                {donghuaLatest.slice(0, 15).map((d, i) => (
                  <div key={d.slug} className="shrink-0 snap-start" style={{ width: 128 }}>
                    <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} priority={i < 4} />
                  </div>
                ))}
              </HorizontalRow>
            ) : (
              <EmptyFallback />
            )}
          </section>

          {/* Anime Terpopuler — anime tamat diurutkan skor tertinggi (data asli) */}
          <section aria-labelledby="popular-anime" style={{ padding: "0 var(--page-x)" }}>
            <SectionHeader title="Anime Terpopuler" href="/anime" />
            {popularAnime.length ? (
              <HorizontalRow>
                {popularAnime.slice(0, 15).map((a) => (
                  <div key={a.animeId} className="shrink-0 snap-start" style={{ width: 128 }}>
                    <AnimeCard anime={a} />
                  </div>
                ))}
              </HorizontalRow>
            ) : (
              <EmptyFallback />
            )}
          </section>

          {/* Donghua Tamat — listing donghua tidak membawa skor, jadi tidak dilabeli "Popular" */}
          <section aria-labelledby="donghua-tamat" style={{ padding: "0 var(--page-x)" }}>
            <SectionHeader title="Donghua Tamat" href="/donghua" />
            {donghuaCompleted.length ? (
              <HorizontalRow>
                {donghuaCompleted.slice(0, 15).map((d) => (
                  <div key={d.slug} className="shrink-0 snap-start" style={{ width: 128 }}>
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
            <section aria-labelledby="genres" style={{ padding: "0 var(--page-x)" }}>
              <h2 className="font-display mb-3 text-[28px] font-light text-white">Genres</h2>
              <ShowMoreChips genres={genres} basePath="/anime" />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyFallback() {
  return (
    <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
      Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
    </p>
  );
}
