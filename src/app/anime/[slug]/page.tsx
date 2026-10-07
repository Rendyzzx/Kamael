import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/cards/AnimeCard";
import SectionHeader from "@/components/ui/SectionHeader";
import Synopsis from "@/components/ui/Synopsis";
import DetailHeroBar from "@/components/ui/DetailHeroBar";
import Icon from "@/components/ui/Icon";
import FavoriteButton from "@/components/cards/FavoriteButton";
import { getAnimeDetail } from "@/lib/api/anime";
import { validateSlug } from "@/lib/utils/validation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = validateSlug(slug);
  if (!safeSlug) return { title: "Anime tidak ditemukan" };

  try {
    const detail = await getAnimeDetail(safeSlug);
    const description = detail.synopsis?.slice(0, 160) ?? `Nonton ${detail.title} subtitle Indonesia.`;
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
      twitter: { card: detail.poster ? "summary_large_image" : "summary", title: detail.title, description },
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

  const infoChips: Array<string | null> = [
    detail.type,
    detail.episodeCount ? `${detail.episodeCount} Episode` : null,
    detail.duration,
    detail.aired,
    detail.studios,
    detail.producers,
  ];


  return (
    <div>
      {/* Hero full-bleed */}
      <div className="relative" style={{ height: 400, marginInline: "calc(-1 * var(--page-x-detail))" }}>
        {detail.poster ? (
          <Image src={detail.poster} alt={detail.title} fill priority sizes="480px" className="object-cover" />
        ) : null}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, var(--bg) 100%)" }} />
        <DetailHeroBar title={detail.title} backHref="/anime" />
      </div>

      <div style={{ padding: "0 var(--page-x-detail)", marginTop: -8 }}>
        {detail.status ? (
          <span
            className="mb-3 inline-flex items-center gap-1.5 rounded-chip px-3"
            style={{ height: 32, background: "rgba(30,30,35,.9)" }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--yellow)" }}>
              calendar_month
            </span>
            <span className="text-[14px] font-bold" style={{ color: "var(--yellow)" }}>
              {detail.status}
            </span>
          </span>
        ) : null}

        <h1 className="font-display text-[32px] font-medium leading-tight text-[var(--text)] sm:text-[44px]">{detail.title}</h1>
        {detail.japaneseTitle ? (
          <p className="mt-1 text-[17px]" style={{ color: "var(--text-2)" }}>
            {detail.japaneseTitle}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.score ? (
            <Chip>
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--yellow)" }}>
                star
              </span>
              {detail.score}
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
                key={g.id}
                href={`/anime?genre=${g.id}`}
                className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-[var(--text)] transition-smooth"
                style={{ height: 32, border: "1.5px solid var(--chip-border)", background: "rgba(90,26,32,.15)" }}
              >
                {g.title}
              </Link>
            ))}
          </div>
        ) : null}

        {detail.synopsis ? (
          <section className="mt-6">
            <h2 className="font-display mb-2 text-[21px] font-light text-[var(--text)]">Synopsis</h2>
            <Synopsis text={detail.synopsis} />
          </section>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          {detail.episodeList[0] ? (
            <Link
              href={`/anime/watch/${detail.episodeList[0].episodeId}`}
              className="btn btn-play flex-1"
              style={{ height: 48, fontSize: 16 }}
            >
              <Icon name="play" size={20} />
              Mulai nonton eps 1
            </Link>
          ) : null}
          <FavoriteButton type="anime" contentId={detail.animeId} title={detail.title} poster={detail.poster} />
        </div>

        {detail.episodeList.length ? (
          <section className="mt-8" aria-labelledby="episode-list">
            <SectionHeader title={`Episodes (${detail.episodeList.length})`} />
            <div className="flex flex-col" style={{ gap: 10 }}>
              {detail.episodeList
                .slice()
                .reverse()
                .map((ep) => (
                  <Link
                    key={ep.episodeId}
                    href={`/anime/watch/${ep.episodeId}`}
                    className="flex items-center justify-between rounded-chip px-4 transition-smooth"
                    style={{ height: 48, background: "var(--surface)" }}
                  >
                    <span className="line-clamp-1 text-[14px] font-medium text-[var(--text)]">{ep.title}</span>
                    <span className="shrink-0 pl-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                      {ep.date}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ) : (
          <p className="mt-8 rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
            Daftar episode belum tersedia untuk anime ini.
          </p>
        )}

        {detail.recommended.length ? (
          <section className="mt-8" aria-labelledby="rekomendasi">
            <SectionHeader title="Anime Terkait" />
            <div className="grid grid-cols-2 gap-3">
              {detail.recommended.slice(0, 4).map((a) => (
                <AnimeCard key={a.animeId} anime={a} />
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
    <span
      className="inline-flex items-center gap-1 rounded-chip px-3.5 text-[14px] font-medium text-[var(--text)]"
      style={{ height: 32, background: "var(--surface-3)" }}
    >
      {children}
    </span>
  );
}
