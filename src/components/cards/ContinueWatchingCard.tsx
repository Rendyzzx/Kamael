import Image from "next/image";
import Link from "next/link";
import type { WatchProgress } from "@/lib/redis/watching";

/**
 * Card "Continue Watching": poster + episode terakhir.
 * Progress bar hanya ditampilkan bila position/duration diketahui player;
 * player embed tidak mengeksposnya, jadi jangan tampilkan persen palsu.
 */
export default function ContinueWatchingCard({ item }: { item: WatchProgress }) {
  const known =
    typeof item.position === "number" &&
    typeof item.duration === "number" &&
    item.duration > 0;
  const percent = known
    ? Math.min(100, Math.round(((item.position as number) / (item.duration as number)) * 100))
    : 0;
  const href = `/${item.type}/watch/${item.episodeId}`;

  return (
    <Link href={href} className="group block w-36 shrink-0 sm:w-40" aria-label={`Lanjutkan ${item.title}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-800">
        {item.poster ? (
          <Image
            src={item.poster}
            alt={item.title}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-surface-850 text-xl font-black text-zinc-700">
            {item.title?.charAt(0).toUpperCase() ?? "?"}
          </span>
        )}
        {known ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div className="h-full bg-accent-500" style={{ width: `${percent}%` }} />
          </div>
        ) : (
          <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">
            Lanjut
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition-colors group-hover:text-accent-500">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-500">
          {item.episode ? `Episode ${item.episode}` : "Lanjutkan"}
          {known ? ` \u00b7 ${percent}%` : ""}
        </p>
      </div>
    </Link>
  );
}
