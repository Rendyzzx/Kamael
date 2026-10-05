import Image from "next/image";
import Link from "next/link";
import type { DonghuaListItem } from "@/types/donghua";

/**
 * Card donghua: poster + chip episode terkini (kiri bawah) + judul.
 * Tidak ada chip rating di sini — listing donghua dari API tidak membawa
 * skor (hanya DonghuaDetail yang punya `rating`), jadi tidak dibuat-buat.
 */
export default function DonghuaCard({
  donghua,
  href,
  priority = false,
}: {
  donghua: DonghuaListItem;
  href: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="group block" aria-label={donghua.title}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-card" style={{ background: "var(--surface)" }}>
        {donghua.poster ? (
          <Image
            src={donghua.poster}
            alt={donghua.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            className="object-cover transition-smooth group-hover:scale-105"
            priority={priority}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {donghua.currentEpisode ? (
          <span
            className="absolute bottom-1.5 left-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium text-white"
            style={{ background: "rgba(30,33,40,.85)" }}
          >
            {donghua.currentEpisode}
          </span>
        ) : null}
      </div>
      <h3
        className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-white transition-smooth"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        {donghua.title}
      </h3>
    </Link>
  );
}
