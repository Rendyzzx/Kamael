"use client";

/**
 * PlayerShell — satu pintu player untuk halaman watch.
 *
 * - Menjalankan usePlayerSources (pemilihan kualitas, fallback server, resolve).
 * - Mode native (<video> + hls.js) untuk sumber hls/mp4; mode embed (iframe)
 *   untuk sumber pihak ketiga. Kontrol transport hanya ada di mode native —
 *   mode embed tidak berpura-pura bisa mengendalikan player pihak ketiga.
 * - Me-render pil status, spinner tengah, overlay error buatan, toast, dan
 *   menu pengaturan (bottom sheet ala YouTube) bersama untuk kedua mode.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSource, QualityGroup } from "@/types/player";
import { sourceKey } from "@/types/player";
import { usePlayerSources } from "@/lib/player/usePlayerSources";
import { detectSourceType, qualityLabel } from "@/lib/player/sources";
import NativePlayer from "./NativePlayer";
import EmbedPlayerV2 from "./EmbedPlayerV2";
import SettingsSheet from "./SettingsSheet";
import { CenterSpinner, ErrorOverlay, PlayerToast, StatusPill } from "./PlayerChrome";

export interface PlayerShellProps {
  groups: QualityGroup[];
  /** Endpoint resolve serverId (anime) atau null (donghua: URL sudah final). */
  resolveEndpoint: string | null;
  /** Berubah = episode lain. */
  episodeKey: string;
  episodeShortLabel: string;
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
  poster: string | null;
  /** Data untuk simpan progres tiap 5 dtk (mode native, user login). */
  track?: {
    type: "anime" | "donghua";
    contentId: string;
    episodeId: string;
    episode: number | null;
    title: string;
    poster: string;
  } | null;
}

export default function PlayerShell(props: PlayerShellProps) {
  const { groups, resolveEndpoint, episodeKey, poster, track } = props;

  const api = usePlayerSources({ groups, resolveEndpoint, episodeKey });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ms = 3000) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  // Toast awal: kualitas preferensi tidak tersedia di episode ini.
  useEffect(() => {
    if (api.initialNotice) showToast(api.initialNotice);
  }, [api.initialNotice, episodeKey, showToast]);

  const activeSource = api.activeSource;
  const activeUrl = api.activeUrl;
  const mode: "native" | "embed" =
    activeUrl && (detectSourceType(activeUrl) === "hls" || detectSourceType(activeUrl) === "mp4")
      ? "native"
      : "embed";

  /* ---------- Aksi ---------- */
  const handleSelectQuality = useCallback(
    (quality: string) => {
      api.setQuality(quality, { manual: true });
      showToast(`${qualityLabel(quality)} akan dipakai di episode berikutnya`);
    },
    [api, showToast]
  );

  const handleUseQualityFromError = useCallback(
    (quality: string) => {
      api.setQuality(quality, { manual: false });
      showToast(`Mencoba ${qualityLabel(quality)}`);
    },
    [api, showToast]
  );

  const handleSelectAutoServer = useCallback(() => {
    // Kembali ke server pertama yang belum gagal di kualitas aktif.
    const group = api.activeGroup;
    if (!group) return;
    const candidate = group.sources.find((s) => !api.failedKeys.has(sourceKey(s)));
    if (candidate) api.pickSource(candidate);
  }, [api]);

  const autoServerActive = (() => {
    const group = api.activeGroup;
    if (!group || !activeSource) return true;
    const firstOk = group.sources.find((s) => !api.failedKeys.has(sourceKey(s)));
    return firstOk === activeSource || firstOk === undefined;
  })();

  const handleReport = useCallback(() => {
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: track?.type ?? null,
        contentId: track?.contentId ?? null,
        episodeId: track?.episodeId ?? episodeKey,
        quality: api.quality,
        server: activeSource?.server ?? null,
      }),
    })
      .then(() => showToast("Laporan terkirim. Terima kasih."))
      .catch(() => showToast("Laporan gagal terkirim. Coba lagi nanti."));
  }, [track, episodeKey, api.quality, activeSource, showToast]);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {mode === "native" && activeUrl ? (
        <NativePlayer
          api={api}
          url={activeUrl}
          poster={poster}
          episodeShortLabel={props.episodeShortLabel}
          prevHref={props.prevHref}
          prevLabel={props.prevLabel}
          nextHref={props.nextHref}
          nextLabel={props.nextLabel}
          onOpenSettings={() => setSettingsOpen(true)}
          track={track}
          speed={speed}
        />
      ) : (
        <EmbedPlayerV2
          api={api}
          url={activeUrl}
          episodeShortLabel={props.episodeShortLabel}
          prevHref={props.prevHref}
          nextHref={props.nextHref}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <StatusPill message={api.statusMessage} />
      {!api.allFailed ? <CenterSpinner show={api.resolving && !api.statusMessage} /> : null}

      {api.allFailed ? (
        <ErrorOverlay
          quality={api.quality}
          groups={api.groups}
          poster={poster}
          onRetry={api.retry}
          onUseQuality={handleUseQualityFromError}
          onReport={handleReport}
        />
      ) : null}

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        groups={api.groups}
        activeQuality={api.quality}
        activeSource={activeSource}
        autoServerActive={autoServerActive}
        failedKeys={api.failedKeys}
        speed={speed}
        onSelectQuality={handleSelectQuality}
        onSelectServer={(s: PlayerSource) => api.pickSource(s)}
        onSelectAutoServer={handleSelectAutoServer}
        onSelectSpeed={setSpeed}
        onReport={() => {
          setSettingsOpen(false);
          handleReport();
        }}
      />

      <PlayerToast message={toast} />
    </div>
  );
}
