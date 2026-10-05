"use client";

import { useCallback, useEffect, useState } from "react";

export interface PlayerServer {
  /** Label tampilan, mis. "720p · vidhide". */
  label: string;
  /** URL embed langsung (donghua). Untuk anime, serverId dipakai via resolveEndpoint. */
  url?: string;
  serverId?: string;
}

/**
 * Player embed streaming.
 *
 * Sumber API (terinspeksi) hanya menyediakan URL embed pihak ketiga
 * (vidhide, ok.ru, rumble, dst) — bukan file video langsung — maka player
 * berbasis iframe. Jika resolusi server gagal, tampilkan fallback UI
 * "Server tidak dapat diputar" + Coba lagi + server lain.
 */
export default function EmbedPlayer({
  initialServer,
  servers,
  resolveEndpoint,
}: {
  /** Server aktif pertama (mis. defaultStreamingUrl). */
  initialServer: PlayerServer | null;
  /** Semua pilihan server. */
  servers: PlayerServer[];
  /** Endpoint proxy untuk resolve serverId anime, mis. "/api/anime/server". Null untuk donghua (URL langsung). */
  resolveEndpoint: string | null;
}) {
  const [active, setActive] = useState<PlayerServer | null>(initialServer);
  const [activeUrl, setActiveUrl] = useState<string | null>(
    initialServer?.url ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    setActive(initialServer);
    setActiveUrl(initialServer?.url ?? null);
    setError(false);
    setFrameKey((k) => k + 1);
  }, [initialServer]);

  const selectServer = useCallback(
    async (server: PlayerServer) => {
      setActive(server);
      setError(false);
      if (server.url) {
        setActiveUrl(server.url);
        setFrameKey((k) => k + 1);
        return;
      }
      if (!server.serverId || !resolveEndpoint) {
        setError(true);
        setActiveUrl(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${resolveEndpoint}/${encodeURIComponent(server.serverId)}`
        );
        if (!res.ok) throw new Error("resolve failed");
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("no url");
        setActiveUrl(data.url);
        setFrameKey((k) => k + 1);
      } catch {
        setError(true);
        setActiveUrl(null);
      } finally {
        setLoading(false);
      }
    },
    [resolveEndpoint]
  );

  const retry = () => {
    setFrameKey((k) => k + 1);
    if (active) void selectServer(active);
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {activeUrl && !error ? (
          <iframe
            key={frameKey}
            src={activeUrl}
            title="Video player"
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
            {loading ? (
              <p className="text-sm text-zinc-400">Menyiapkan server…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-300">
                  Server tidak dapat diputar.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
                  >
                    Coba lagi
                  </button>
                  {servers.filter((s) => s !== active).length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          servers.find((s) => s !== active) ?? null;
                        if (next) void selectServer(next);
                      }}
                      className="rounded-md bg-surface-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-surface-800"
                    >
                      Server lain
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pilihan server */}
      {servers.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-zinc-500">
            Server:
          </span>
          {servers.map((s) => {
            const isActiveServer = active === s;
            return (
              <button
                key={`${s.label}-${s.serverId ?? s.url ?? ""}`}
                type="button"
                onClick={() => void selectServer(s)}
                disabled={loading && !isActiveServer}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isActiveServer
                    ? "bg-accent-500 text-white"
                    : "bg-surface-800 text-zinc-300 hover:bg-surface-700"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
