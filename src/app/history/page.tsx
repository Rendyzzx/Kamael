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
        <h1 className="text-lg font-semibold">Login untuk melihat history</h1>
        <p className="text-sm text-zinc-400">
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Watch History</h1>
        {history.length > 0 ? <ClearHistoryButton /> : null}
      </div>

      {history.length === 0 ? (
        <p className="rounded-lg bg-surface-900 p-4 text-sm text-zinc-500">
          Belum ada riwayat tontonan. Mulai nonton episode untuk mengisi history-mu.
        </p>
      ) : (
        <ul className="divide-y divide-surface-800 overflow-hidden rounded-lg bg-surface-900">
          {history.map((h) => (
            <li key={`${h.type}-${h.contentId}`}>
              <Link
                href={`/${h.type}/${h.contentId}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-800"
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-800">
                  {h.poster ? (
                    <Image src={h.poster} alt={h.title} fill sizes="44px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{h.title}</p>
                  <p className="text-xs text-zinc-500">
                    {h.episode ? `Episode ${h.episode}` : h.type === "anime" ? "Anime" : "Donghua"}
                    {" \u00b7 "}
                    {new Date(h.watchedAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span aria-hidden="true" className="text-zinc-600">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
