import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/cards/AnimeCard";
import Badge from "@/components/ui/Badge";
import SectionHeader from "@/components/ui/SectionHeader";
import { getAnimeDetail } from "@/lib/api/anime";
import FavoriteButton from "@/components/cards/FavoriteButton";
import { validateSlug } from "@/lib/utils/validation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) return { title: "Anime tidak ditemukan" };

  try {
    const detail = await getAnimeDetail(safeSlug);
    const description =
      detail.synopsis?.slice(0, 160) ??
      `Nonton ${detail.title} subtitle Indonesia.`;
    return {
      title: detail.title,
      description,
      alternates: { canonical: `/anime/${detail.animeId}` },
      openGraph: {
        title: detail.title,
        description,
        images: detail.poster ? [{ url: detail.poster }] : [],
        type: "video.tv_show",
      },
      twitter: {
        card: detail.poster ? "summary_large_image" : "summary",
        title: detail.title,
        description,
      },
    };
  } catch {
    return { title: "Anime tidak ditemukan" };
  }
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) notFound();

  let detail;
  try {
    detail = await getAnimeDetail(safeSlug);
  } catch {
    notFound();
  }

  const info: Array<[string, string | null]> = [
    ["Japanese", detail.japaneseTitle],
    ["Skor", detail.score],
    ["Tipe", detail.type],
    ["Status", detail.status],
    ["Episode", detail.episodeCount ? String(detail.episodeCount) : null],
    ["Durasi", detail.duration],
    ["Tanggal Tayang", detail.aired],
    ["Studio", detail.studios],
    ["Produser", detail.producers],
  ];

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg bg-surface-800 md:w-56">
          {detail.poster ? (
            <Image
              src={detail.poster}
              alt={detail.title}
              fill
              sizes="(max-width: 768px) 60vw, 224px"
              className="object-cover"
              priority
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {detail.title}
            </h1>
            {detail.japaneseTitle ? (
              <p className="mt-1 text-sm text-zinc-500">{detail.japaneseTitle}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {detail.status ? (
              <Badge tone={detail.status.toLowerCase().startsWith("ongo") ? "success" : "default"}>
                {detail.status}
              </Badge>
            ) : null}
            {detail.score ? <Badge tone="muted">★ {detail.score}</Badge> : null}
            {detail.genres.map((g) => (
              <Link
                key={g.id}
                href={`/anime?genre=${g.id}`}
                className="rounded-sm bg-surface-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:text-accent-500"
              >
                {g.title}
              </Link>
            ))}
          </div>

          {detail.synopsis ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-400">
              {detail.synopsis}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            {detail.episodeList[0] ? (
              <Link
                href={`/anime/watch/${detail.episodeList[0].episodeId}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                ▶ Watch Now
              </Link>
            ) : null}
            <FavoriteButton
              type="anime"
              contentId={detail.animeId}
              title={detail.title}
              poster={detail.poster}
            />
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {info
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-28 shrink-0 text-zinc-500">{label}</dt>
                  <dd className="min-w-0 flex-1 text-zinc-300">{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="episode-list">
        <SectionHeader title="Daftar Episode" />
        {detail.episodeList.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.episodeList.map((ep) => (
              <Link
                key={ep.episodeId}
                href={`/anime/watch/${ep.episodeId}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-900 px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-800"
              >
                <span className="line-clamp-2 min-w-0 text-zinc-200">
                  {ep.title}
                </span>
                <span className="shrink-0 text-xs text-accent-500">
                  ▶ Tonton
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
            Daftar episode belum tersedia untuk anime ini.
          </p>
        )}
      </section>

      {detail.recommended.length ? (
        <section aria-labelledby="rekomendasi">
          <SectionHeader title="Rekomendasi" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {detail.recommended.map((a) => (
              <AnimeCard key={a.animeId} anime={a} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
