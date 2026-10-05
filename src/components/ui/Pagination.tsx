import Link from "next/link";

/**
 * Pagination berbasis link (Server Components friendly).
 * `buildHref` menerima nomor halaman; null = tombol nonaktif.
 */
export default function Pagination({
  currentPage,
  hasPrev,
  hasNext,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  hasPrev: boolean;
  hasNext: boolean | null;
  totalPages: number | null;
  buildHref: (page: number) => string;
}) {
  if (!hasPrev && hasNext === false) return null;

  const btn = "rounded-chip px-4 py-2 text-sm font-semibold transition-smooth";

  return (
    <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Navigasi halaman">
      {hasPrev ? (
        <Link href={buildHref(Math.max(currentPage - 1, 1))} className={btn} style={{ background: "var(--surface-3)", color: "var(--text)" }}>
          &larr; Sebelumnya
        </Link>
      ) : (
        <span className={`${btn} cursor-not-allowed`} style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
          &larr; Sebelumnya
        </span>
      )}

      <span style={{ color: "var(--text-2)" }}>
        Halaman {currentPage}
        {totalPages ? ` dari ${totalPages}` : ""}
      </span>

      {hasNext !== false ? (
        <Link href={buildHref(currentPage + 1)} className={btn} style={{ background: "var(--surface-3)", color: "var(--text)" }}>
          Selanjutnya &rarr;
        </Link>
      ) : (
        <span className={`${btn} cursor-not-allowed`} style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
          Selanjutnya &rarr;
        </span>
      )}
    </nav>
  );
}
