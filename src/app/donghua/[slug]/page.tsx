import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DonghuaCard from "@/components/cards/DonghuaCard";
import Badge from "@/components/ui/Badge";
import SectionHeader from "@/components/ui/SectionHeader";
import { getDonghuaDetail } from "@/lib/api/donghua";
import { validateSlug } from "@/lib/utils/validation";
import { episodeLabel } from "@/lib/utils/validation";
import FavoriteButton from "@/components/cards/FavoriteButton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) return { title: "Donghua tidak ditemukan" };

  try {
    const detail = await getDonghuaDetail(safeSlug);
    const description =
      detail.synopsis?.slice(0, 160) ??
      `Nonton ${detail.title} subtitle Indonesia.`;
    return {
      title: detail.title,
      description,
      alternates: { canonical: `/donghua/${detail.slug}` },
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
    return { title: "Donghua tidak ditemukan" };
  }
}

export default async function DonghuaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) notFound();

  let detail;
  try {
    detail = await getDonghuaDetail(safeSlug);
  } catch {
    notFound();
  }

  const info: Array<[string, string | null]> = [
    ["Judul Alternatif", detail.alterTitle],
    ["Rating", detail.rating],
    ["Pengikut", detail.followers],
    ["Studio", detail.studio],
    ["Jaringan", detail.network],
    ["Rilis", detail.released],
    ["Durasi", detail.duration],
    ["Tipe", detail.type],
    ["Total Episode", detail.episodeCount ? String(detail.episodeCount) : null],
    ["Musim", detail.season],
    ["Negara", detail.country],
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
            {detail.alterTitle ? (
              <p className="mt-1 text-sm text-zinc-500">{detail.alterTitle}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {detail.status ? <Badge tone="success">{detail.status}</Badge> : null}
            {detail.rating ? <Badge tone="muted">★ {detail.rating}</Badge> : null}
            {detail.type ? <Badge tone="default">{detail.type}</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {detail.genres.map((g) => (
              <Link
                key={g.slug}
                href={`/donghua?genre=${g.slug}`}
                className="rounded-sm bg-surface-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:text-accent-500"
              >
                {g.name}
              </Link>
            ))}
          </div>

          {detail.synopsis ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-400">
              {detail.synopsis}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            {detail.episodes[0] ? (
              <Link
                href={`/donghua/watch/${detail.episodes[0].slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                ▶ Watch Now
              </Link>
            ) : null}
            <FavoriteButton
              type="donghua"
              contentId={detail.slug}
              title={detail.title}
              poster={detail.poster}
            />
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {info
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-zinc-500">{label}</dt>
                  <dd className="min-w-0 flex-1 text-zinc-300">{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="episode-list-donghua">
        <SectionHeader title="Daftar Episode" />
        {detail.episodes.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {detail.episodes.map((ep) => (
              <Link
                key={ep.slug}
                href={`/donghua/watch/${ep.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-900 px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-800"
              >
                <span className="line-clamp-2 min-w-0 text-zinc-200">
                  {episodeLabel(ep.title, ep.title)}
                  {ep.isFinal ? (
                    <span className="ml-1.5 text-xs text-accent-500">END</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-accent-500">
                  ▶ Tonton
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
            Daftar episode belum tersedia untuk donghua ini.
          </p>
        )}
      </section>

      {detail.recommendations.length ? (
        <section aria-labelledby="rekomendasi-donghua">
          <SectionHeader title="Rekomendasi" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {detail.recommendations.map((d) => (
              <DonghuaCard key={d.slug} donghua={d} href={`/donghua/${d.slug}`} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
