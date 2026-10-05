"use client";

/**
 * Baris aksi di bawah judul episode: suka, simpan (favorit), unduh.
 * Tombol kecil tanpa background besar; "Lapor" ada di menu ⚙ player.
 * - Suka: preferensi lokal per episode (localStorage) — data sumber tidak
 *   menyediakan jumlah like, jadi tidak ada angka palsu.
 * - Simpan: favorit Redis (login) — guest diarahkan ke /login.
 * - Unduh: membuka sheet kecil berisi link download hasil normalisasi.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { DownloadOption } from "@/types/player";

export default function WatchActions({
  type,
  contentId,
  episodeKey,
  title,
  poster,
  downloads,
}: {
  type: "anime" | "donghua";
  contentId: string;
  /** Key unik episode untuk like lokal. */
  episodeKey: string;
  title: string;
  poster: string;
  downloads: DownloadOption[];
}) {
  const { status } = useSession();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(`cyronime:like:${episodeKey}`) === "1");
  }, [episodeKey]);

  // Status favorit (login).
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/favorites?type=${type}`)
      .then((res) => (res.ok ? res.json() : { favorites: [] }))
      .then((data: { favorites?: { contentId: string }[] }) => {
        if (cancelled) return;
        setSaved(Boolean(data.favorites?.some((f) => f.contentId === contentId)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, type, contentId]);

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    try {
      localStorage.setItem(`cyronime:like:${episodeKey}`, next ? "1" : "0");
    } catch {}
  }

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    fetch(
      next
        ? "/api/favorites"
        : `/api/favorites?type=${type}&contentId=${encodeURIComponent(contentId)}`,
      next
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, contentId, title, poster }),
          }
        : { method: "DELETE" }
    )
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => setSaved(!next));
  }

  const btn =
    "flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-smooth";
  const btnStyle = { color: "var(--muted)" } as const;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Batalkan suka" : "Suka episode ini"}
          className={btn}
          style={{ ...btnStyle, color: liked ? "var(--glacier)" : "var(--muted)" }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{liked ? "thumb_up" : "thumb_up_off_alt"}</span>
          Suka
        </button>

        {status === "authenticated" ? (
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? "Hapus dari simpanan" : "Simpan anime ini"}
            className={btn}
            style={{ color: saved ? "var(--glacier)" : "var(--muted)" }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{saved ? "bookmark" : "bookmark_border"}</span>
            Simpan
          </button>
        ) : (
          <Link href="/login" className={btn} style={btnStyle} aria-label="Masuk untuk menyimpan">
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>bookmark_border</span>
            Simpan
          </Link>
        )}

        {downloads.length ? (
          <button
            type="button"
            onClick={() => setShowDownloads((v) => !v)}
            aria-expanded={showDownloads}
            aria-label="Unduh episode ini"
            className={btn}
            style={btnStyle}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>download</span>
            Unduh
          </button>
        ) : null}
      </div>

      {/* Sheet kecil daftar link download */}
      {showDownloads ? (
        <div
          className="mt-3 rounded-xl p-2"
          style={{ background: "var(--deep)", border: "1px solid var(--deep-2)" }}
        >
          {downloads.map((d) => (
            <a
              key={`${d.quality}-${d.provider}`}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-between px-3 py-2.5 text-[14px]"
              style={{ color: "var(--frost)" }}
            >
              <span>{d.provider}</span>
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                {d.quality}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
