import Link from "next/link";
import BlurImage from "@/components/ui/BlurImage";
import type { AnimeListItem } from "@/types/anime";

/**
 * Card anime: poster + chip rating (kanan atas, blur) + chip "Eps N" (kiri bawah)
 * + judul 16px/600 di bawah poster. Status "Completed" ditandai badge "New"
 * biru hanya bila memang item baru selesai (data asli dari API, bukan dibuat-buat).
 */
export default function AnimeCard({
  anime,
  priority = false,
}: {
  anime: AnimeListItem;
  priority?: boolean;
}) {
  return (
    <Link href={`/anime/${anime.animeId}`} className="block" aria-label={anime.title}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-card" style={{ background: "var(--surface)" }}>
        {anime.poster ? (
          <span className="absolute inset-0">
            <BlurImage
              src={anime.poster}
              alt={anime.title}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              priority={priority}
              className="h-full w-full"
              rounded="rounded-card"
              imgClassName="object-cover"
            />
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {anime.score ? (
          <span
            className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-chip px-2 text-[14px] font-medium text-[var(--text)]"
            style={{ height: 24, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 14, color: "var(--yellow)" }}>
              star
            </span>
            {anime.score}
          </span>
        ) : null}

        {anime.episodes ? (
          <span
            className="absolute bottom-1.5 left-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium text-[var(--text)]"
            style={{ background: "rgba(30,33,40,.85)" }}
          >
            Eps {anime.episodes}
          </span>
        ) : null}
      </div>
      <h3
        className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--text)] transition-smooth"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {anime.title}
      </h3>
    </Link>
  );
}
