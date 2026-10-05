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
  // Tidak ada apa pun untuk dinavigasi
  if (!hasPrev && hasNext === false) return null;

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-3 text-sm"
      aria-label="Navigasi halaman"
    >
      {hasPrev ? (
        <Link
          href={buildHref(Math.max(currentPage - 1, 1))}
          className="rounded-md bg-surface-800 px-4 py-2 font-medium transition-colors hover:bg-surface-700"
        >
          ← Sebelumnya
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-md bg-surface-800/50 px-4 py-2 text-zinc-500">
          ← Sebelumnya
        </span>
      )}

      <span className="text-zinc-400">
        Halaman {currentPage}
        {totalPages ? ` dari ${totalPages}` : ""}
      </span>

      {hasNext !== false ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded-md bg-surface-800 px-4 py-2 font-medium transition-colors hover:bg-surface-700"
        >
          Selanjutnya →
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-md bg-surface-800/50 px-4 py-2 text-zinc-500">
          Selanjutnya →
        </span>
      )}
    </nav>
  );
}
