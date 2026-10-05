"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Genre {
  id: string;
  title: string;
}

/**
 * Dropdown filter genre. Client component karena butuh interaksi;
 * hasilnya tetap URL-driven (Server Component yang fetch data).
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
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // ganti genre = reset halaman
    if (value) params.set("genre", value);
    else params.delete("genre");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-400">
      Genre
      <select
        value={activeGenre ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md bg-surface-800 px-2.5 py-1.5 text-sm text-zinc-100 outline-none ring-accent-500/50 focus:ring-2"
      >
        <option value="">Semua</option>
        {genres.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
    </label>
  );
}
