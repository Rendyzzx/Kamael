import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { listHistory } from "@/lib/redis/history";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import ClearHistoryButton from "@/components/history/ClearHistoryButton";

export const metadata: Metadata = {
  title: "Watch History",
  description: "Riwayat anime dan donghua yang sudah kamu tonton di Cyronime.",
};

export default async function HistoryPage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="font-display text-[18px] font-semibold text-white">Login untuk melihat history</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Watch history tersimpan di akun kamu, bukan hanya di browser ini.
        </p>
        <div className="w-full">
          <GoogleLoginButton callbackUrl="/history" />
        </div>
      </div>
    );
  }

  const history = await listHistory(userId);

  return (
    <div style={{ padding: "0 var(--page-x)" }} className="mx-auto max-w-md space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[18px] font-bold text-white">Watch History</h1>
        {history.length > 0 ? <ClearHistoryButton /> : null}
      </div>

      {history.length === 0 ? (
        <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
          Belum ada riwayat tontonan. Mulai nonton episode untuk mengisi history-mu.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-card" style={{ background: "var(--surface)" }}>
          {history.map((h) => (
            <li key={`${h.type}-${h.contentId}`}>
              <Link
                href={`/${h.type}/${h.contentId}`}
                className="flex items-center gap-3 px-4 py-3 transition-smooth hover:bg-app-surface-3"
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-app" style={{ background: "var(--surface-3)" }}>
                  {h.poster ? (
                    <Image src={h.poster} alt={h.title} fill sizes="44px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    {h.episode ? `Episode ${h.episode}` : h.type === "anime" ? "Anime" : "Donghua"}
                    {" \u00b7 "}
                    {new Date(h.watchedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--text-2)" }} aria-hidden="true">
                  chevron_right
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
