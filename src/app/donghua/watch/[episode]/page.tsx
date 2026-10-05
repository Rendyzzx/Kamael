import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmbedPlayer, { type PlayerServer } from "@/components/player/EmbedPlayer";
import { getDonghuaDetail, getDonghuaEpisode } from "@/lib/api/donghua";
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

  const servers: PlayerServer[] = data.servers.map((s) => ({ label: s.name, url: s.url }));
  const initialServer: PlayerServer | null = data.mainServer
    ? { label: data.mainServer.name, url: data.mainServer.url }
    : (servers[0] ?? null);

  const epNumber = data.episodeList.find((e) => e.slug === episodeSlug)?.episodeNumber ?? null;

  const donghuaDetail = data.donghuaSlug ? await getDonghuaDetail(data.donghuaSlug).catch(() => null) : null;

  return (
    <div>
      {data.donghuaSlug ? (
        <WatchTracker
          type="donghua"
          contentId={data.donghuaSlug}
          episodeId={episodeSlug}
          episode={epNumber}
          title={data.donghuaTitle ?? data.title}
          poster={data.poster ?? ""}
        />
      ) : null}

      <div style={{ marginInline: "calc(-1 * var(--page-x-detail))" }}>
        <EmbedPlayer initialServer={initialServer} servers={servers} resolveEndpoint={null} />
      </div>

      <div style={{ padding: "16px var(--page-x-detail) 0" }} className="space-y-6">
        {/* Navigasi episode */}
        <div className="flex items-center gap-2">
          {data.prevEpisodeSlug ? (
            <Link href={`/donghua/watch/${data.prevEpisodeSlug}`} className="flex-1 rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
              &larr; Previous
            </Link>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-chip px-4 py-2.5 text-center text-sm" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
              &larr; Previous
            </span>
          )}
          {data.donghuaSlug ? (
            <Link href={`/donghua/${data.donghuaSlug}`} className="rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
              <span className="material-symbols-rounded" style={{ fontSize: 17, verticalAlign: "middle" }}>list</span>
            </Link>
          ) : null}
          {data.nextEpisodeSlug ? (
            <Link href={`/donghua/watch/${data.nextEpisodeSlug}`} className="flex-1 rounded-chip px-4 py-2.5 text-center text-sm font-semibold text-white transition-smooth" style={{ background: "var(--surface-3)" }}>
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
          {data.donghuaSlug ? (
            <Link href={`/donghua/${data.donghuaSlug}`} className="font-display text-[17px] font-medium text-white">
              {data.donghuaTitle ?? data.donghuaSlug}
            </Link>
          ) : (
            <h1 className="font-display text-[17px] font-medium text-white">{data.donghuaTitle ?? "Donghua"}</h1>
          )}
          <p className="mt-1 text-[15px]" style={{ color: "var(--text-2)" }}>
            {episodeLabel(data.title, data.title)}
          </p>
        </div>

        {donghuaDetail?.synopsis ? (
          <section>
            <h2 className="font-display mb-2 text-[17px] font-medium text-white">Deskripsi</h2>
            <Synopsis text={donghuaDetail.synopsis} />
          </section>
        ) : null}

        {/* Daftar episode — tab angka scroll horizontal */}
        {data.episodeList.length ? (
          <section aria-label="Daftar episode">
            <h2 className="font-display mb-3 text-[17px] font-medium text-white">Episode List</h2>
            <div className="flex overflow-x-auto pb-1" style={{ gap: 10 }}>
              {data.episodeList.map((ep) => {
                const active = ep.slug === episodeSlug;
                return (
                  <Link
                    key={ep.slug}
                    href={`/donghua/watch/${ep.slug}`}
                    aria-current={active ? "true" : undefined}
                    className="flex shrink-0 items-center justify-center rounded-app text-[14px] font-bold transition-smooth"
                    style={{ width: 48, height: 48, background: active ? "#fff" : "var(--surface)", color: active ? "#000" : "#fff" }}
                  >
                    {ep.episodeNumber ?? "•"}
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
