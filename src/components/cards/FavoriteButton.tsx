"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Tombol favorite (gaya tombol sekunder spec: tinggi 44px, pill, bg --surface-3,
 * ikon + teks 18px/700). Guest -> arahkan ke /login.
 */
export default function FavoriteButton({
  type,
  contentId,
  title,
  poster,
}: {
  type: "anime" | "donghua";
  contentId: string;
  title: string;
  poster: string;
}) {
  const { status } = useSession();
  const [isFavorite, setIsFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/favorites?type=${type}`)
      .then((res) => (res.ok ? res.json() : { favorites: [] }))
      .then((data: { favorites?: { contentId: string }[] }) => {
        if (cancelled) return;
        setIsFavorite(Boolean(data.favorites?.some((f) => f.contentId === contentId)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, type, contentId]);

  const base = "inline-flex flex-1 items-center justify-center gap-2 rounded-chip font-bold transition-smooth disabled:opacity-60";
  const style: React.CSSProperties = { height: 44, fontSize: 16, background: "var(--surface-3)", color: "var(--text)" };

  if (status === "loading") {
    return <div className="flex-1 animate-pulse rounded-chip" style={{ height: 44, background: "var(--surface-3)" }} aria-hidden="true" />;
  }

  if (status !== "authenticated") {
    return (
      <Link href="/login" className={base} style={style}>
        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>
          favorite
        </span>
        Login untuk Favorite
      </Link>
    );
  }

  async function toggle() {
    setBusy(true);
    const next = !isFavorite;
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, contentId, title, poster }),
          })
        : await fetch(`/api/favorites?type=${type}&contentId=${encodeURIComponent(contentId)}`, { method: "DELETE" });
      if (res.ok) setIsFavorite(next);
    } catch {
      // abaikan; jangan crash halaman
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={isFavorite} className={base} style={style}>
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 22, fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
      >
        favorite
      </span>
      {isFavorite ? "Favorit" : "Favorite"}
    </button>
  );
}
