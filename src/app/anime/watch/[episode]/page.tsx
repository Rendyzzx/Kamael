import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmbedPlayer, { type PlayerServer } from "@/components/player/EmbedPlayer";
import { getAnimeEpisode } from "@/lib/api/anime";
import { validateSlug } from "@/lib/utils/validation";
import { episodeLabel } from "@/lib/utils/validation";
import WatchTracker from "@/components/watch/WatchTracker";
import { getAnimeDetail } from "@/lib/api/anime";

interface PageProps {
  params: Promise<{ episode: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { episode } = await params;
  const safeSlug = validateSlug(episode);
  if (!safeSlug) return { title: "Episode tidak ditemukan" };
  try {
    const data = await getAnimeEpisode(safeSlug);
    return {
      title: data.title,
      description: `Nonton ${data.title} subtitle Indonesia.`,
    };
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

  // Susun daftar server: label "720p · vidhide", resolve via /api/anime/server/:serverId
  const servers: PlayerServer[] = data.qualities.flatMap((q) =>
    q.servers.map((s) => ({
      label: `${q.quality} · ${s.title.trim()}`,
      serverId: s.serverId,
    }))
  );

  const initialServer: PlayerServer | null =
    data.defaultStreamingUrl
      ? { label: "Default", url: data.defaultStreamingUrl }
      : (servers[0] ?? null);

  const allServers = initialServer?.url
    ? [initialServer, ...servers]
    : servers;

  // Poster untuk continue-watching; detail di-cache (Redis/Next) sehingga murah.
  const animeDetail = data.animeId
    ? await getAnimeDetail(data.animeId).catch(() => null)
    : null;
  const epNumber = data.episodeList.find((e) => e.episodeId === episodeId)?.eps ?? null;

  return (
    <div className="space-y-6">
      {data.animeId ? (
        <WatchTracker
          type="anime"
          contentId={data.animeId}
          episodeId={episodeId}
          episode={epNumber}
          title={animeDetail?.title ?? seriesTitleFromEpisode(data.title)}
          poster={animeDetail?.poster ?? ""}
        />
      ) : null}
      {/* Player sebagai fokus utama */}
      <EmbedPlayer
        initialServer={initialServer}
        servers={allServers}
        resolveEndpoint="/api/anime/server"
      />

      {/* Judul & navigasi episode */}
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {data.animeId ? (
              <Link
                href={`/anime/${data.animeId}`}
                className="transition-colors hover:text-accent-500"
              >
                {seriesTitleFromEpisode(data.title)}
              </Link>
            ) : (
              "Anime"
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {episodeLabel(data.title, data.title)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.prevEpisodeId ? (
            <Link
              href={`/anime/watch/${data.prevEpisodeId}`}
              className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
            >
              ← Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md bg-surface-800/50 px-4 py-2 text-sm text-zinc-500">
              ← Previous
            </span>
          )}
          {data.animeId ? (
            <Link
              href={`/anime/${data.animeId}`}
              className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
            >
              Episode List
            </Link>
          ) : null}
          {data.nextEpisodeId ? (
            <Link
              href={`/anime/watch/${data.nextEpisodeId}`}
              className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
            >
              Next →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md bg-surface-800/50 px-4 py-2 text-sm text-zinc-500">
              Next →
            </span>
          )}
        </div>
      </div>

      {/* Daftar episode */}
      {data.episodeList.length ? (
        <section aria-label="Daftar episode">
          <h2 className="mb-3 text-base font-semibold">Daftar Episode</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.episodeList.map((ep) => (
              <Link
                key={ep.episodeId}
                href={`/anime/watch/${ep.episodeId}`}
                aria-current={ep.episodeId === episodeId ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
                  ep.episodeId === episodeId
                    ? "bg-accent-500/15 text-accent-500"
                    : "bg-surface-900 text-zinc-200 hover:bg-surface-800"
                }`}
              >
                <span className="line-clamp-2 min-w-0">
                  {ep.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Derive judul series dari judul episode ("X Episode N ... Subtitle Indonesia" → "X"). */
function seriesTitleFromEpisode(episodeTitle: string): string {
  const stripped = episodeTitle.replace(/\s*subtitle\s+indonesia\s*$/i, "");
  const cut = stripped.split(/\s+Episode\s+\d+/i)[0].trim();
  return cut.length ? cut : stripped;
}
