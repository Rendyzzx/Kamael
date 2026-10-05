"use client";

import { useState } from "react";

/**
 * Sinopsis dengan potong N baris + toggle "Selengkapnya / Lebih sedikit".
 * Default 5 baris (detail anime/donghua); halaman watch memakai 3 baris
 * dengan aksen glacier dan lebar baca maks 60 karakter.
 */
export default function Synopsis({
  text,
  lines = 5,
  accent = "var(--blue)",
  maxCh,
}: {
  text: string;
  lines?: number;
  accent?: string;
  maxCh?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const clampClass = lines === 3 ? "line-clamp-3" : "line-clamp-5";

  return (
    <div>
      <p
        className={expanded ? "" : clampClass}
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--muted)",
          whiteSpace: "pre-line",
          maxWidth: maxCh ? `${maxCh}ch` : undefined,
        }}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-[15px] font-semibold"
        style={{ color: accent }}
      >
        {expanded ? "Lebih sedikit" : "Selengkapnya"}
      </button>
    </div>
  );
}
