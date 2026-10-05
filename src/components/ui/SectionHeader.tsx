import Link from "next/link";

/** Header section: judul 24px/500 kiri, link kanan 16px/600 --blue ("Lihat Lainnya >"). */
export default function SectionHeader({
  title,
  href,
  hrefLabel = "Lihat Lainnya",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-[24px] font-medium leading-tight text-white">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 text-[16px] font-semibold transition-smooth"
          style={{ color: "var(--blue)" }}
        >
          {hrefLabel} &gt;
        </Link>
      ) : null}
    </div>
  );
}
