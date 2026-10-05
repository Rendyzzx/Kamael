"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Tombol favorite untuk halaman detail. Guest -> arahkan ke /login.
 * State tidak persist di URL; detail page tetap server-rendered.
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

  if (status === "loading") {
    return <div className="h-[42px] w-36 animate-pulse rounded-md bg-surface-800" aria-hidden="true" />;
  }

  if (status !== "authenticated") {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-2 rounded-md bg-surface-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-surface-700"
      >
        <HeartIcon filled={false} /> Login untuk Favorite
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
        : await fetch(`/api/favorites?type=${type}&contentId=${encodeURIComponent(contentId)}`, {
            method: "DELETE",
          });
      if (res.ok) setIsFavorite(next);
    } catch {
      // abaikan; jangan crash halaman
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFavorite}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
        isFavorite
          ? "bg-accent-500/15 text-accent-500 hover:bg-accent-500/25"
          : "bg-surface-800 text-zinc-200 hover:bg-surface-700"
      }`}
    >
      <HeartIcon filled={isFavorite} />
      {isFavorite ? "Added to Favorites" : "Add to Favorites"}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M12 20.3l-1.4-1.3C6.1 15 3.5 12.7 3.5 9.6c0-2.5 2-4.5 4.5-4.5 1.6 0 3.1.8 4 2.1.9-1.3 2.4-2.1 4-2.1 2.5 0 4.5 2 4.5 4.5 0 3.1-2.6 5.4-7.1 9.4L12 20.3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
