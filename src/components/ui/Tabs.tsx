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
    <div className="flex flex-wrap gap-1 rounded-lg bg-surface-900 p-1">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            t.active
              ? "bg-accent-500 text-white"
              : "text-zinc-400 hover:bg-surface-800 hover:text-zinc-100"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
