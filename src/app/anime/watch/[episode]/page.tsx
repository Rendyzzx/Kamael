import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerShell from "@/components/player/PlayerShell";
import EpisodeStrip, { type StripEpisode } from "@/components/watch/EpisodeStrip";
import EpisodeSheet from "@/components/watch/EpisodeSheet";
import WatchActions from "@/components/watch/WatchActions";
import WatchTracker from "@/components/watch/WatchTracker";
import Synopsis from "@/components/ui/Synopsis";
import { getAnimeDetail, getAnimeEpisode } from "@/lib/api/anime";
import { normalizeAnimeSources } from "@/lib/player/sources";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getProgress } from "@/lib/redis/watching";
import { validateSlug, episodeLabel } from "@/lib/utils/validation";

interface PageProps {
  params: Promise<{ episode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { episode } = await params;
  const safeSlug = validateSlug(episode);
  if (!safeSlug) return { title: "Episode tidak ditemukan" };
  try {
    const data = await getAnimeEpisode(safeSlug);
    return { title: data.title, description: `Nonton ${data.title} subtitle Indonesia.` };
  } catch {
    return { title: "Episode tidak ditemukan" };
  }
}

export default async function AnimeWatchPage({ params }: PageProps) {
  const { episode } = await params;
  const episodeId = validateSlug(episode);
  if (!episodeId) notFound();

  let data;
  try {
    data = await getAnimeEpisode(episodeId);
  } catch {
    notFound();
  }

  const animeDetail = data.animeId ? await getAnimeDetail(data.animeId).catch(() => null) : null;
  const epNumber = data.episodeList.find((e) => e.episodeId === episodeId)?.eps ?? null;
  const seriesTitle = animeDetail?.title ?? seriesTitleFromEpisode(data.title);
  const shortLabel = epNumber !== null ? `Episode ${epNumber}` : episodeLabel(data.title, "Episode");

  const prevNumber = data.prevEpisodeId
    ? (data.episodeList.find((e) => e.episodeId === data.prevEpisodeId)?.eps ?? null)
    : null;
  const nextNumber = data.nextEpisodeId
    ? (data.episodeList.find((e) => e.episodeId === data.nextEpisodeId)?.eps ?? null)
    : null;

  // Sumber dinormalisasi sekali di server: player hanya mengenal grup kualitas.
  const groups = normalizeAnimeSources(data);

  // Progress continue-watching untuk garis progres episode aktif.
  const userId = await getAuthenticatedUserId();
  const progress = userId && data.animeId ? await getProgress(userId, data.animeId).catch(() => null) : null;
  const progressPct =
    progress &&
    progress.episodeId === episodeId &&
    typeof progress.position === "number" &&
    typeof progress.duration === "number" &&
    progress.duration > 0
      ? Math.min(100, Math.round((progress.position / progress.duration) * 100))
      : null;

  const stripEpisodes: StripEpisode[] = data.episodeList.map((ep) => ({
    episodeId: ep.episodeId,
    label: ep.eps !== null ? String(ep.eps) : "•",
    href: `/anime/watch/${ep.episodeId}`,
    number: ep.eps,
  }));

  return (
    <div className="pb-6">
      {data.animeId ? (
        <WatchTracker
          type="anime"
          contentId={data.animeId}
          episodeId={episodeId}
          episode={epNumber}
          title={seriesTitle}
          poster={animeDetail?.poster ?? ""}
        />
      ) : null}

      {/* Tombol back ke portal Anime */}
      <div
        className="flex items-center gap-1"
        style={{ padding: "10px var(--page-x-detail)", background: "var(--ink)" }}
      >
        <Link
          href="/anime"
          aria-label="Kembali ke portal Anime"
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: "var(--frost)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 22 }}>arrow_back</span>
        </Link>
        <Link
          href="/anime"
          className="text-[14px] font-semibold"
          style={{ color: "var(--muted)" }}
        >
          Portal Anime
        </Link>
      </div>

      {/* Player full-bleed — sticky di atas: iframe 16:9 menempel saat
          konten di bawahnya (episode, info, rekomendasi) di-scroll. */}
      <div
        className="sticky z-30"
        style={{ top: 0, marginInline: "calc(-1 * var(--page-x-detail))" }}
      >
        <PlayerShell
          groups={groups}
          resolveEndpoint="/api/anime/server"
          episodeKey={episodeId}
          episodeShortLabel={shortLabel}
          prevHref={data.prevEpisodeId ? `/anime/watch/${data.prevEpisodeId}` : null}
          prevLabel={prevNumber !== null ? `Eps ${prevNumber}` : null}
          nextHref={data.nextEpisodeId ? `/anime/watch/${data.nextEpisodeId}` : null}
          nextLabel={nextNumber !== null ? `Eps ${nextNumber}` : null}
          poster={animeDetail?.poster ?? null}
          track={
            data.animeId
              ? {
                  type: "anime",
                  contentId: data.animeId,
                  episodeId,
                  episode: epNumber,
                  title: seriesTitle,
                  poster: animeDetail?.poster ?? "",
                }
              : null
          }
        />
      </div>

      {/* Bagian bawah player */}
      <div style={{ padding: "18px var(--page-x-detail) 0" }} className="space-y-5">
        {/* Info episode */}
        <header>
          {data.animeId ? (
            <Link href={`/anime/${data.animeId}`} className="block truncate text-[14px]" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </Link>
          ) : (
            <p className="truncate text-[14px]" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </p>
          )}
          <h1 className="font-display mt-1 text-[30px] font-extrabold leading-[1.05] tracking-tight text-white">
            {shortLabel}
          </h1>
          {data.title !== shortLabel ? (
            <p className="mt-1.5 text-[16px]" style={{ color: "var(--muted)" }}>
              {data.title}
            </p>
          ) : null}
        </header>

        {/* Aksi: suka, simpan, unduh */}
        {data.animeId ? (
          <WatchActions
            type="anime"
            contentId={data.animeId}
            episodeKey={episodeId}
            title={seriesTitle}
            poster={animeDetail?.poster ?? ""}
            downloads={data.downloads}
          />
        ) : null}

        {/* Deskripsi */}
        {animeDetail?.synopsis ? (
          <section aria-label="Deskripsi">
            <h2 className="font-display mb-1.5 text-[15px] font-semibold" style={{ color: "var(--frost)" }}>
              Deskripsi
            </h2>
            <Synopsis text={animeDetail.synopsis} lines={3} accent="var(--glacier)" />
          </section>
        ) : null}

        {/* Tombol daftar episode lengkap (bottom sheet draggable) */}
        {stripEpisodes.length ? (
          <EpisodeSheet episodes={stripEpisodes} activeId={episodeId} totalLabel={`${stripEpisodes.length} eps`} />
        ) : null}

        {/* Strip episode horizontal */}
        {stripEpisodes.length ? (
          <EpisodeStrip
            episodes={stripEpisodes}
            activeId={episodeId}
            activeNumber={epNumber}
            progressPct={progressPct}
            poster={animeDetail?.poster ?? ""}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Derive judul series dari judul episode ("X Episode N ... Subtitle Indonesia" → "X"). */
function seriesTitleFromEpisode(episodeTitle: string): string {
  const stripped = episodeTitle.replace(/\s*subtitle\s+indonesia\s*$/i, "");
  const cut = stripped.split(/\s+Episode\s+\d+/i)[0].trim();
  return cut.length ? cut : stripped;
}
