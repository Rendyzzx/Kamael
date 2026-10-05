import Link from "next/link";

export interface TabItem {
  key: string;
  label: string;
  href: string;
  active: boolean;
}

/** Tab navigasi berbasis link — cocok untuk Server Components. */
export default function Tabs({ items }: { items: TabItem[] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-app p-1" style={{ background: "var(--surface)" }}>
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className="rounded-chip px-3.5 py-1.5 text-sm font-semibold transition-smooth"
          style={
            t.active
              ? { background: "var(--blue)", color: "#fff" }
              : { color: "var(--text-2)" }
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
