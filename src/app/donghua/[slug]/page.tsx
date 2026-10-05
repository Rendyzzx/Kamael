import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SectionHeader from "@/components/ui/SectionHeader";
import Synopsis from "@/components/ui/Synopsis";
import DetailHeroBar from "@/components/ui/DetailHeroBar";
import Icon from "@/components/ui/Icon";
import FavoriteButton from "@/components/cards/FavoriteButton";
import { getDonghuaDetail } from "@/lib/api/donghua";
import { validateSlug, episodeLabel } from "@/lib/utils/validation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) return { title: "Donghua tidak ditemukan" };

  try {
    const detail = await getDonghuaDetail(safeSlug);
    const description = detail.synopsis?.slice(0, 160) ?? `Nonton ${detail.title} subtitle Indonesia.`;
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
      twitter: { card: detail.poster ? "summary_large_image" : "summary", title: detail.title, description },
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

  const infoChips: Array<string | null> = [
    detail.type,
    detail.episodeCount ? `${detail.episodeCount} Episode` : null,
    detail.duration,
    detail.released,
    detail.studio,
    detail.network,
    detail.season,
    detail.country,
    detail.followers ? `${detail.followers} Pengikut` : null,
  ];

  return (
    <div>
      <div className="relative" style={{ height: 400, marginInline: "calc(-1 * var(--page-x-detail))" }}>
        {detail.poster ? (
          <Image src={detail.poster} alt={detail.title} fill priority sizes="480px" className="object-cover" />
        ) : null}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, var(--bg) 100%)" }} />
        <DetailHeroBar title={detail.title} backHref="/donghua" />
      </div>

      <div style={{ padding: "0 var(--page-x-detail)", marginTop: -8 }}>
        {detail.status ? (
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-chip px-3" style={{ height: 32, background: "rgba(30,30,35,.9)" }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--yellow)" }}>
              calendar_month
            </span>
            <span className="text-[14px] font-bold" style={{ color: "var(--yellow)" }}>
              {detail.status}
            </span>
          </span>
        ) : null}

        <h1 className="font-display text-[32px] font-medium leading-tight text-white sm:text-[44px]">{detail.title}</h1>
        {detail.alterTitle ? (
          <p className="mt-1 text-[17px]" style={{ color: "var(--text-2)" }}>
            {detail.alterTitle}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.rating ? (
            <Chip>
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--yellow)" }}>
                star
              </span>
              {detail.rating}
            </Chip>
          ) : null}
          {infoChips.filter(Boolean).map((v) => (
            <Chip key={v}>{v}</Chip>
          ))}
        </div>

        {detail.genres.length ? (
          <div className="mt-3 flex flex-wrap" style={{ gap: "10px 8px" }}>
            {detail.genres.map((g) => (
              <Link
                key={g.slug}
                href={`/donghua?genre=${g.slug}`}
                className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-white transition-smooth"
                style={{ height: 32, border: "1.5px solid var(--chip-border)", background: "rgba(90,26,32,.15)" }}
              >
                {g.name}
              </Link>
            ))}
          </div>
        ) : null}

        {detail.synopsis ? (
          <section className="mt-6">
            <h2 className="font-display mb-2 text-[21px] font-light text-white">Synopsis</h2>
            <Synopsis text={detail.synopsis} />
          </section>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          {detail.episodes[0] ? (
            <Link
              href={`/donghua/watch/${detail.episodes[0].slug}`}
              className="btn btn-play flex-1"
              style={{ height: 48, fontSize: 16 }}
            >
              <Icon name="play" size={20} />
              Mulai nonton eps 1
            </Link>
          ) : null}
          <FavoriteButton type="donghua" contentId={detail.slug} title={detail.title} poster={detail.poster} />
        </div>

        {detail.episodes.length ? (
          <section className="mt-8" aria-labelledby="episode-list-donghua">
            <SectionHeader title={`Episodes (${detail.episodes.length})`} />
            <div className="flex flex-col" style={{ gap: 10 }}>
              {detail.episodes
                .slice()
                .reverse()
                .map((ep) => (
                  <Link
                    key={ep.slug}
                    href={`/donghua/watch/${ep.slug}`}
                    className="flex items-center justify-between rounded-chip px-4 transition-smooth"
                    style={{ height: 48, background: "var(--surface)" }}
                  >
                    <span className="line-clamp-1 text-[14px] font-medium text-white">
                      {episodeLabel(ep.title, ep.title)}
                      {ep.isFinal ? (
                        <span className="ml-1.5 text-xs font-bold" style={{ color: "var(--blue)" }}>
                          END
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 pl-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                      {ep.releaseDate}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ) : (
          <p className="mt-8 rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
            Daftar episode belum tersedia untuk donghua ini.
          </p>
        )}

        {detail.recommendations.length ? (
          <section className="mt-8" aria-labelledby="rekomendasi-donghua">
            <SectionHeader title="Donghua Terkait" />
            <div className="grid grid-cols-2 gap-3">
              {detail.recommendations.slice(0, 4).map((d) => (
                <DonghuaCard key={d.slug} donghua={d} href={`/donghua/${d.slug}`} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip px-3.5 text-[14px] font-medium text-white" style={{ height: 32, background: "var(--surface-3)" }}>
      {children}
    </span>
  );
}
