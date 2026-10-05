import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmbedPlayer, { type PlayerServer } from "@/components/player/EmbedPlayer";
import { getAnimeDetail, getAnimeEpisode } from "@/lib/api/anime";
import { validateSlug, episodeLabel } from "@/lib/utils/validation";
import WatchTracker from "@/components/watch/WatchTracker";
import Synopsis from "@/components/ui/Synopsis";

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

  const servers: PlayerServer[] = data.qualities.flatMap((q) =>
    q.servers.map((s) => ({ label: `${q.quality} · ${s.title.trim()}`, serverId: s.serverId }))
  );
  const initialServer: PlayerServer | null = data.defaultStreamingUrl
    ? { label: "Default", url: data.defaultStreamingUrl }
    : (servers[0] ?? null);
  const allServers = initialServer?.url ? [initialServer, ...servers] : servers;

  const animeDetail = data.animeId ? await getAnimeDetail(data.animeId).catch(() => null) : null;
  const epNumber = data.episodeList.find((e) => e.episodeId === episodeId)?.eps ?? null;
  const seriesTitle = animeDetail?.title ?? seriesTitleFromEpisode(data.title);

  return (
    <div>
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

      {/* Player full-width, bg hitam */}
      <div style={{ marginInline: "calc(-1 * var(--page-x-detail))" }}>
        <EmbedPlayer initialServer={initialServer} servers={allServers} resolveEndpoint="/api/anime/server" />
      </div>

      <div style={{ padding: "16px var(--page-x-detail) 0" }} className="space-y-6">
        {/* Navigasi episode */}
        <div className="flex items-center gap-2">
          {data.prevEpisodeId ? (
            <Link href={`/anime/watch/${data.prevEpisodeId}`} className="flex-1 rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
              &larr; Previous
            </Link>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-chip px-4 py-2.5 text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
              &larr; Previous
            </span>
          )}
          {data.animeId ? (
            <Link href={`/anime/${data.animeId}`} className="rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 17, verticalAlign: "middle" }}>list</span>
            </Link>
          ) : null}
          {data.nextEpisodeId ? (
            <Link href={`/anime/watch/${data.nextEpisodeId}`} className="flex-1 rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
              Next &rarr;
            </Link>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-chip px-4 py-2.5 text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
              Next &rarr;
            </span>
          )}
        </div>

        {/* Info episode */}
        <div>
          {data.animeId ? (
            <Link href={`/anime/${data.animeId}`} className="font-display text-[17px] font-medium text-white">
              {seriesTitle}
            </Link>
          ) : (
            <h1 className="font-display text-[17px] font-medium text-white">Anime</h1>
          )}
          <p className="mt-1 text-[15px]" style={{ color: "var(--text-2)" }}>
            {episodeLabel(data.title, data.title)}
          </p>
        </div>

        {animeDetail?.synopsis ? (
          <section>
            <h2 className="font-display mb-2 text-[17px] font-medium text-white">Deskripsi</h2>
            <Synopsis text={animeDetail.synopsis} />
          </section>
        ) : null}

        {/* Daftar episode — tab angka scroll horizontal */}
        {data.episodeList.length ? (
          <section aria-label="Daftar episode">
            <h2 className="font-display mb-3 text-[17px] font-medium text-white">Episode List</h2>
            <div className="flex overflow-x-auto pb-1" style={{ gap: 10 }}>
              {data.episodeList.map((ep) => {
                const active = ep.episodeId === episodeId;
                return (
                  <Link
                    key={ep.episodeId}
                    href={`/anime/watch/${ep.episodeId}`}
                    aria-current={active ? "true" : undefined}
                    className="flex shrink-0 items-center justify-center rounded-app text-[17px] font-bold transition-smooth"
                    style={{ width: 48, height: 48, background: active ? "#fff" : "var(--surface)", color: active ? "#000" : "#fff" }}
                  >
                    {ep.eps ?? "•"}
                  </Link>
                );
              })}
            </div>
          </section>
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
