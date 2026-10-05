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
    <div ref={boxRef} className="relative" style={{ margin: "8px 12px" }}>
      <form onSubmit={submit}>
        <div className="relative flex items-center">
          <span
            className="material-symbols-rounded absolute pointer-events-none"
            style={{ left: 24, fontSize: 20, color: "var(--text-2)" }}
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Cari Anime Di Sini"
            aria-label="Cari anime atau donghua"
            className="w-full rounded-chip outline-none"
            style={{
              height: 48,
              background: "#1E1F23",
              color: "var(--text)",
              paddingLeft: 58,
              paddingRight: 16,
              fontSize: 15,
            }}
          />
        </div>
      </form>

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-app p-2 shadow-xl"
          style={{ background: "var(--surface-2)" }}
        >
          {loading ? (
            <p className="px-2 py-3 text-sm" style={{ color: "var(--text-2)" }}>
              Mencari…
            </p>
          ) : hits && (hits.anime.length || hits.donghua.length) ? (
            <>
              {hits.anime.length > 0 ? (
                <div className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                    Anime
                  </p>
                  {hits.anime.slice(0, 5).map((a) => (
                    <Link
                      key={a.animeId}
                      href={`/anime/${a.animeId}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-app px-2 py-1.5 text-sm transition-smooth hover:bg-app-surface-3"
                      style={{ color: "var(--text)" }}
                    >
                      {a.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              {hits.donghua.length > 0 ? (
                <div>
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                    Donghua
                  </p>
                  {hits.donghua.slice(0, 5).map((d) => (
                    <Link
                      key={d.slug}
                      href={`/donghua/${d.slug}`}
                      onClick={() => setOpen(false)}
                      className="block truncate rounded-app px-2 py-1.5 text-sm transition-smooth hover:bg-app-surface-3"
                      style={{ color: "var(--text)" }}
                    >
                      {d.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-2 py-3 text-sm" style={{ color: "var(--text-2)" }}>
              Tidak ada hasil untuk "{q}".
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
