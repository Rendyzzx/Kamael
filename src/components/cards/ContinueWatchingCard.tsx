import Image from "next/image";
import Link from "next/link";
import type { WatchProgress } from "@/lib/redis/watching";

/**
 * Card "Terakhir Ditonton": landscape 130x76, radius 16px.
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
    <Link href={href} className="group block shrink-0 snap-start" style={{ width: 130 }} aria-label={`Lanjutkan ${item.title}`}>
      <div className="relative overflow-hidden rounded-app" style={{ width: 130, height: 76, background: "var(--surface)" }}>
        {item.poster ? (
          <Image src={item.poster} alt={item.title} fill sizes="130px" className="object-cover transition-smooth group-hover:scale-105" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-black" style={{ color: "var(--text-2)" }}>
            {item.title?.charAt(0).toUpperCase() ?? "?"}
          </span>
        )}
        {known ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div className="h-full" style={{ width: `${percent}%`, background: "var(--blue)" }} />
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute bottom-1 left-1.5 line-clamp-1 max-w-[90%] text-[11px] font-semibold text-white">
          {item.episode ? `Episode ${item.episode}` : "Lanjutkan"}
        </span>
      </div>
      <h3 className="mt-1.5 line-clamp-1 text-[13px] font-medium leading-snug text-white">{item.title}</h3>
    </Link>
  );
}
