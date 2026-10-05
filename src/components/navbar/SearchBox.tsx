"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchHit {
  anime: { title: string; animeId: string }[];
  donghua: { title: string; slug: string }[];
}

/**
 * Search box global dengan debounce 500ms.
 * Hasil dipisah Anime / Donghua lewat proxy /api/search (cache di server).
 */
export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce request
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error();
        setHits(await res.json());
      } catch {
        setHits({ anime: [], donghua: [] });
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  const q = query.trim();
  const showDropdown = open && q.length >= 2;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <form onSubmit={submit}>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Cari anime atau donghua..."
          aria-label="Cari anime atau donghua"
          className="w-full rounded-md bg-surface-800 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent-500/50 transition-shadow focus:ring-2"
        />
      </form>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-surface-700 bg-surface-850 p-2 shadow-xl">
          {loading ? (
            <p className="px-2 py-3 text-sm text-zinc-500">Mencari…</p>
          ) : hits && (hits.anime.length || hits.donghua.length) ? (
            <>
              {hits.anime.length > 0 ? (
                <div className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Anime
                  </p>
                  {hits.anime.slice(0, 5).map((a) => (
                    <Link
                      key={a.animeId}
                      href={`/anime/${a.animeId}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-surface-700 hover:text-zinc-100"
                    >
                      {a.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              {hits.donghua.length > 0 ? (
                <div>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Donghua
                  </p>
                  {hits.donghua.slice(0, 5).map((d) => (
                    <Link
                      key={d.slug}
                      href={`/donghua/${d.slug}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-surface-700 hover:text-zinc-100"
                    >
                      {d.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-2 py-3 text-sm text-zinc-500">
              Tidak ada hasil untuk “{q}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
