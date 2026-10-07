import Link from "next/link";

/** Header section: judul kiri, link tersier kanan (peach, underline). */
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
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-[17px] font-medium leading-tight text-[var(--text)]">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[14px] font-semibold underline"
          style={{ color: "var(--peach)", textUnderlineOffset: 3, textDecorationColor: "rgba(255,211,161,.4)" }}
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
