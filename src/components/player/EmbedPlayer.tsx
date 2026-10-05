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
  initialServer: PlayerServer | null;
  servers: PlayerServer[];
  resolveEndpoint: string | null;
}) {
  const [active, setActive] = useState<PlayerServer | null>(initialServer);
  const [activeUrl, setActiveUrl] = useState<string | null>(initialServer?.url ?? null);
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
        const res = await fetch(`${resolveEndpoint}/${encodeURIComponent(server.serverId)}`);
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
      <div className="relative aspect-video w-full overflow-hidden bg-black" style={{ borderRadius: 0 }}>
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
              <p className="text-sm" style={{ color: "var(--text-2)" }}>
                Menyiapkan server…
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Server tidak dapat diputar.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-chip px-5 py-2.5 text-sm font-bold text-white transition-smooth"
                    style={{ background: "var(--blue-grad)" }}
                  >
                    Coba lagi
                  </button>
                  {servers.filter((s) => s !== active).length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = servers.find((s) => s !== active) ?? null;
                        if (next) void selectServer(next);
                      }}
                      className="rounded-chip px-5 py-2.5 text-sm font-semibold text-white transition-smooth"
                      style={{ background: "var(--surface-3)" }}
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
        <div className="flex items-center gap-2 overflow-x-auto px-0 pb-1" style={{ paddingInline: "var(--page-x-detail)", paddingTop: 12 }}>
          <span className="shrink-0 text-xs font-bold" style={{ color: "var(--text-2)" }}>
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
                className="shrink-0 rounded-chip px-3 py-1.5 text-xs font-semibold transition-smooth disabled:opacity-50"
                style={
                  isActiveServer
                    ? { background: "var(--blue)", color: "#fff" }
                    : { background: "var(--surface-3)", color: "var(--text)" }
                }
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
