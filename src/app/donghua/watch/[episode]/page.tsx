import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerShell from "@/components/player/PlayerShell";
import EpisodeStrip, { type StripEpisode } from "@/components/watch/EpisodeStrip";
import EpisodeSheet from "@/components/watch/EpisodeSheet";
import WatchActions from "@/components/watch/WatchActions";
import WatchTracker from "@/components/watch/WatchTracker";
import Synopsis from "@/components/ui/Synopsis";
import { getDonghuaDetail, getDonghuaEpisode } from "@/lib/api/donghua";
import { normalizeDonghuaSources } from "@/lib/player/sources";
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
    const data = await getDonghuaEpisode(safeSlug);
    return { title: data.title, description: `Nonton ${data.title} subtitle Indonesia.` };
  } catch {
    return { title: "Episode tidak ditemukan" };
  }
}

export default async function DonghuaWatchPage({ params }: PageProps) {
  const { episode } = await params;
  const episodeSlug = validateSlug(episode);
  if (!episodeSlug) notFound();

  let data;
  try {
    data = await getDonghuaEpisode(episodeSlug);
  } catch {
    notFound();
  }

  const epNumber =
    data.episodeList.find((e) => e.slug === episodeSlug)?.episodeNumber ?? null;
  const donghuaDetail = data.donghuaSlug
    ? await getDonghuaDetail(data.donghuaSlug).catch(() => null)
    : null;
  const seriesTitle = data.donghuaTitle ?? donghuaDetail?.title ?? data.donghuaSlug ?? "Donghua";
  const poster = data.poster ?? donghuaDetail?.poster ?? "";
  const shortLabel = epNumber !== null ? `Episode ${epNumber}` : episodeLabel(data.title, "Episode");

  const prevNumber = data.prevEpisodeSlug
    ? (data.episodeList.find((e) => e.slug === data.prevEpisodeSlug)?.episodeNumber ?? null)
    : null;
  const nextNumber = data.nextEpisodeSlug
    ? (data.episodeList.find((e) => e.slug === data.nextEpisodeSlug)?.episodeNumber ?? null)
    : null;

  // Donghua: semua server URL langsung → satu grup "auto".
  const groups = normalizeDonghuaSources(data);

  // Progress continue-watching untuk garis progres episode aktif.
  const userId = await getAuthenticatedUserId();
  const progress =
    userId && data.donghuaSlug
      ? await getProgress(userId, data.donghuaSlug).catch(() => null)
      : null;
  const progressPct =
    progress &&
    progress.episodeId === episodeSlug &&
    typeof progress.position === "number" &&
    typeof progress.duration === "number" &&
    progress.duration > 0
      ? Math.min(100, Math.round((progress.position / progress.duration) * 100))
      : null;

  const stripEpisodes: StripEpisode[] = data.episodeList.map((ep) => ({
    episodeId: ep.slug,
    label: ep.episodeNumber !== null ? String(ep.episodeNumber) : "•",
    href: `/donghua/watch/${ep.slug}`,
    number: ep.episodeNumber,
  }));

  return (
    <div className="pb-6">
      {data.donghuaSlug ? (
        <WatchTracker
          type="donghua"
          contentId={data.donghuaSlug}
          episodeId={episodeSlug}
          episode={epNumber}
          title={seriesTitle}
          poster={poster}
        />
      ) : null}

      {/* Tombol back ke portal Donghua */}
      <div
        className="flex items-center gap-1"
        style={{ padding: "10px var(--page-x-detail)", background: "var(--ink)" }}
      >
        <Link
          href="/donghua"
          aria-label="Kembali ke portal Donghua"
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: "var(--frost)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 22 }}>arrow_back</span>
        </Link>
        <Link href="/donghua" className="text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
          Portal Donghua
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
          resolveEndpoint={null}
          episodeKey={episodeSlug}
          episodeShortLabel={shortLabel}
          prevHref={data.prevEpisodeSlug ? `/donghua/watch/${data.prevEpisodeSlug}` : null}
          prevLabel={prevNumber !== null ? `Eps ${prevNumber}` : null}
          nextHref={data.nextEpisodeSlug ? `/donghua/watch/${data.nextEpisodeSlug}` : null}
          nextLabel={nextNumber !== null ? `Eps ${nextNumber}` : null}
          poster={poster || null}
          track={
            data.donghuaSlug
              ? {
                  type: "donghua",
                  contentId: data.donghuaSlug,
                  episodeId: episodeSlug,
                  episode: epNumber,
                  title: seriesTitle,
                  poster,
                }
              : null
          }
        />
      </div>

      {/* Bagian bawah player */}
      <div style={{ padding: "18px var(--page-x-detail) 0" }} className="space-y-5">
        {/* Info episode */}
        <header>
          {data.donghuaSlug ? (
            <Link href={`/donghua/${data.donghuaSlug}`} className="block truncate text-[14px]" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </Link>
          ) : (
            <p className="truncate text-[14px]" style={{ color: "var(--muted)" }}>
              {seriesTitle}
            </p>
          )}
          <h1 className="font-display mt-1 text-[30px] font-extrabold leading-[1.05] tracking-tight text-[var(--text)]">
            {shortLabel}
          </h1>
          {data.title !== shortLabel ? (
            <p className="mt-1.5 text-[16px]" style={{ color: "var(--muted)" }}>
              {data.title}
            </p>
          ) : null}
        </header>

        {/* Aksi: suka, simpan, unduh */}
        {data.donghuaSlug ? (
          <WatchActions
            type="donghua"
            contentId={data.donghuaSlug}
            episodeKey={episodeSlug}
            title={seriesTitle}
            poster={poster}
            downloads={data.downloads}
          />
        ) : null}

        {/* Deskripsi */}
        {donghuaDetail?.synopsis ? (
          <section aria-label="Deskripsi">
            <h2 className="font-display mb-1.5 text-[15px] font-semibold" style={{ color: "var(--frost)" }}>
              Deskripsi
            </h2>
            <Synopsis text={donghuaDetail.synopsis} lines={3} accent="var(--glacier)" />
          </section>
        ) : null}

        {/* Tombol daftar episode lengkap (bottom sheet draggable) */}
        {stripEpisodes.length ? (
          <EpisodeSheet episodes={stripEpisodes} activeId={episodeSlug} totalLabel={`${stripEpisodes.length} eps`} />
        ) : null}

        {/* Strip episode horizontal */}
        {stripEpisodes.length ? (
          <EpisodeStrip
            episodes={stripEpisodes}
            activeId={episodeSlug}
            activeNumber={epNumber}
            progressPct={progressPct}
            poster={poster}
          />
        ) : null}
      </div>
    </div>
  );
}
