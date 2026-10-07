"use client";

import { useState } from "react";
import Link from "next/link";

interface Genre {
  id: string;
  title: string;
}

/** Daftar genre penuh + tombol "Show More" (collapse 12 chip pertama). */
export default function ShowMoreChips({ genres, basePath }: { genres: Genre[]; basePath: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? genres : genres.slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap" style={{ gap: "12px 10px" }}>
        {visible.map((g) => (
          <Link
            key={g.id}
            href={`${basePath}?genre=${encodeURIComponent(g.id)}`}
            className="inline-flex items-center rounded-chip px-4 text-[14px] font-medium text-[var(--text)] transition-smooth"
            style={{ height: 32, border: "1.5px solid var(--chip-border)", background: "rgba(90,26,32,.15)" }}
          >
            {g.title}
          </Link>
        ))}
      </div>
      {genres.length > 12 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[14px] font-bold text-[var(--text)]"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      ) : null}
    </div>
  );
}
