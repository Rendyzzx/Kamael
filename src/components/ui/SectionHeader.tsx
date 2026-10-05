import Link from "next/link";

/** Header section + link "Lihat semua" opsional. */
export default function SectionHeader({
  title,
  href,
  hrefLabel = "Lihat semua",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-sm text-zinc-400 transition-colors hover:text-accent-500"
        >
          {hrefLabel} &rarr;
        </Link>
      ) : null}
    </div>
  );
}
