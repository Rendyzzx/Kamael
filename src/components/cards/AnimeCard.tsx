import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { AnimeListItem } from "@/types/anime";

/**
 * Card anime. Poster + judul + meta (episode/status/skor).
 * Link ke /anime/[animeId].
 */
export default function AnimeCard({
  anime,
  priority = false,
}: {
  anime: AnimeListItem;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/anime/${anime.animeId}`}
      className="group block"
      aria-label={anime.title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-800">
        {anime.poster ? (
          <Image
            src={anime.poster}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
          {anime.episodes ? <Badge tone="muted">{anime.episodes} Eps</Badge> : null}
          {anime.status ? (
            <Badge tone={anime.status.toLowerCase().startsWith("ongo") ? "success" : "default"}>
              {anime.status}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition-colors group-hover:text-accent-500">
          {anime.title}
        </h3>
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          {anime.score ? <span>★ {anime.score}</span> : null}
          {anime.latestReleaseDate ? <span>{anime.latestReleaseDate}</span> : null}
        </p>
      </div>
    </Link>
  );
}
