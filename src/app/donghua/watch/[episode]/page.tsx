import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EmbedPlayer, { type PlayerServer } from "@/components/player/EmbedPlayer";
import { getDonghuaEpisode } from "@/lib/api/donghua";
import { validateSlug } from "@/lib/utils/validation";
import { episodeLabel } from "@/lib/utils/validation";

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
    const data = await getDonghuaEpisode(safeSlug);
    return {
      title: data.title,
      description: `Nonton ${data.title} subtitle Indonesia.`,
    };
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

  // Server donghua sudah menyertakan URL embed langsung.
  const servers: PlayerServer[] = data.servers.map((s) => ({
    label: s.name,
    url: s.url,
  }));

  const initialServer: PlayerServer | null = data.mainServer
    ? { label: data.mainServer.name, url: data.mainServer.url }
    : (servers[0] ?? null);

  return (
    <div className="space-y-6">
      <EmbedPlayer
        initialServer={initialServer}
        servers={servers}
        resolveEndpoint={null}
      />

      {/* Judul & navigasi episode */}
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {data.donghuaSlug ? (
              <Link
                href={`/donghua/${data.donghuaSlug}`}
                className="transition-colors hover:text-accent-500"
              >
                {data.donghuaTitle ?? data.donghuaSlug}
              </Link>
            ) : (
              data.donghuaTitle ?? "Donghua"
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {episodeLabel(data.title, data.title)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.prevEpisodeSlug ? (
            <Link
              href={`/donghua/watch/${data.prevEpisodeSlug}`}
              className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
            >
              ← Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-md bg-surface-800/50 px-4 py-2 text-sm text-zinc-500">
              ← Previous
            </span>
          )}
          {data.donghuaSlug ? (
            <Link
              href={`/donghua/${data.donghuaSlug}`}
              className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
            >
              Episode List
            </Link>
          ) : null}
          {data.nextEpisodeSlug ? (
            <Link
              href={`/donghua/watch/${data.nextEpisodeSlug}`}
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
                key={ep.slug}
                href={`/donghua/watch/${ep.slug}`}
                aria-current={ep.slug === episodeSlug ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
                  ep.slug === episodeSlug
                    ? "bg-accent-500/15 text-accent-500"
                    : "bg-surface-900 text-zinc-200 hover:bg-surface-800"
                }`}
              >
                <span className="line-clamp-2 min-w-0">
                  {episodeLabel(ep.title, ep.title)}
                  {ep.isFinal ? (
                    <span className="ml-1.5 text-xs text-accent-500">END</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
