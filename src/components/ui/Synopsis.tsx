"use client";

import { useState } from "react";

/** Sinopsis dengan potong 5 baris + toggle "Selengkapnya / Lebih sedikit". */
export default function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={expanded ? "" : "line-clamp-5"}
        style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-2)", whiteSpace: "pre-line" }}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-[15px] font-semibold"
        style={{ color: "var(--blue)" }}
      >
        {expanded ? "Lebih sedikit ▲" : "Selengkapnya ▼"}
      </button>
    </div>
  );
}
