import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { DonghuaListItem } from "@/types/donghua";

/**
 * Card donghua. Poster + judul + meta (episode terbaru/status).
 * `href` menentukan target card (detail atau watch) sesuai konteks listing.
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
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-800">
        {donghua.poster ? (
          <Image
            src={donghua.poster}
            alt={donghua.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
          {donghua.currentEpisode ? (
            <Badge tone="muted">{donghua.currentEpisode}</Badge>
          ) : null}
          {donghua.status ? (
            <Badge
              tone={donghua.status.toLowerCase().startsWith("ongo") ? "success" : "default"}
            >
              {donghua.status}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition-colors group-hover:text-accent-500">
          {donghua.title}
        </h3>
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          {donghua.type ? <span>{donghua.type}</span> : null}
          {donghua.sub ? <span>{donghua.sub}</span> : null}
        </p>
      </div>
    </Link>
  );
}
