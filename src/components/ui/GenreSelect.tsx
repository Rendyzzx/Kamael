import Link from "next/link";

interface Genre {
  id: string;
  title: string;
}

/**
 * Filter genre sebagai chip (bukan dropdown) — Server Component, URL-driven.
 * Chip genre: tinggi 32px, pill, border 1.5px --chip-border, bg maroon tipis.
 */
export default function GenreSelect({
  genres,
  basePath,
  activeGenre,
}: {
  genres: Genre[];
  basePath: string;
  activeGenre?: string;
}) {
  return (
    <div className="flex flex-wrap" style={{ gap: "12px 10px" }}>
      <Link
        href={basePath}
        className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-white transition-smooth"
        style={{
          height: 32,
          border: !activeGenre ? "1.5px solid var(--blue)" : "1.5px solid var(--chip-border)",
          background: !activeGenre ? "rgba(33,150,243,.15)" : "rgba(90,26,32,.15)",
        }}
      >
        Semua
      </Link>
      {genres.map((g) => {
        const active = activeGenre === g.id;
        return (
          <Link
            key={g.id}
            href={`${basePath}?genre=${encodeURIComponent(g.id)}`}
            className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-white transition-smooth"
            style={{
              height: 32,
              border: active ? "1.5px solid var(--blue)" : "1.5px solid var(--chip-border)",
              background: active ? "rgba(33,150,243,.15)" : "rgba(90,26,32,.15)",
            }}
          >
            {g.title}
          </Link>
        );
      })}
    </div>
  );
}
