"use client";

/**
 * ServerRace — "lomba" diam-diam antar kandidat server untuk satu kualitas.
 *
 * Dirender tersembunyi (opacity 0, 1x1px, tak bisa diklik) di belakang
 * spinner/pil status milik PlayerShell. Setiap kandidat benar-benar dimuat
 * seperti pemutar asli (iframe untuk embed, <video>/hls.js untuk hls/mp4)
 * supaya sinyal "siap" valid — bukan sekadar tebakan. Begitu satu kandidat
 * siap lebih dulu, itu dipakai sebagai pemenang dan kandidat lain langsung
 * dihentikan (iframe/video dilepas) agar tidak menghabiskan kuota/memicu
 * iklan dari server yang tidak dipakai. Kandidat yang timeout (8 dtk) ditandai
 * gagal dan tidak diikutkan lagi untuk episode ini.
 */
import { useEffect, useRef } from "react";
import type Hls from "hls.js";
import type { PlayerSource } from "@/types/player";
import { detectSourceType } from "@/lib/player/sources";
import type { RaceEntry } from "@/lib/player/usePlayerSources";

const ENTRY_TIMEOUT_MS = 8000;

export default function ServerRace({
  pool,
  onWin,
  onEntryFailed,
}: {
  pool: RaceEntry[];
  onWin: (source: PlayerSource, url: string) => void;
  onEntryFailed: (source: PlayerSource) => void;
}) {
  // Dibagi ke semua entry: begitu satu menang, entry lain berhenti melapor.
  // ServerRace di-remount (key=raceGeneration) tiap race baru, jadi ref ini
  // otomatis segar lagi tanpa effect tambahan.
  const wonRef = useRef(false);

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
    >
      {pool.map(({ source, url }) => (
        <RaceEntryProbe
          key={`${source.quality}|${source.server}|${source.serverId ?? url}`}
          source={source}
          url={url}
          wonRef={wonRef}
          onWin={onWin}
          onEntryFailed={onEntryFailed}
        />
      ))}
    </div>
  );
}

function RaceEntryProbe({
  source,
  url,
  wonRef,
  onWin,
  onEntryFailed,
}: {
  source: PlayerSource;
  url: string;
  wonRef: React.MutableRefObject<boolean>;
  onWin: (source: PlayerSource, url: string) => void;
  onEntryFailed: (source: PlayerSource) => void;
}) {
  const settledRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const settle = (ok: boolean) => {
    if (settledRef.current || wonRef.current) return;
    settledRef.current = true;
    if (ok) {
      wonRef.current = true;
      onWin(source, url);
    } else {
      onEntryFailed(source);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => settle(false), ENTRY_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const type = detectSourceType(url);

  // HLS: pakai hls.js, sinyal siap = manifest ter-parse.
  useEffect(() => {
    if (type !== "hls") return;
    const video = videoRef.current;
    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onMeta = () => settle(true);
      video.addEventListener("loadedmetadata", onMeta);
      return () => video.removeEventListener("loadedmetadata", onMeta);
    }
    let cancelled = false;
    import("hls.js").then(({ default: HlsCtor }) => {
      if (cancelled) return;
      if (!HlsCtor.isSupported()) {
        settle(false);
        return;
      }
      const hls = new HlsCtor({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(HlsCtor.Events.MANIFEST_PARSED, () => settle(true));
      hls.on(HlsCtor.Events.ERROR, (_e, data) => {
        if (data.fatal) settle(false);
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, url]);

  if (type === "embed") {
    return (
      <iframe
        src={url}
        tabIndex={-1}
        title=""
        style={{ width: 1, height: 1, border: 0 }}
        onLoad={() => settle(true)}
        onError={() => settle(false)}
      />
    );
  }

  if (type === "mp4") {
    return (
      <video
        ref={videoRef}
        src={url}
        muted
        preload="auto"
        style={{ width: 1, height: 1 }}
        onLoadedMetadata={() => settle(true)}
        onError={() => settle(false)}
      />
    );
  }

  // hls → video kosong, src diisi via effect di atas.
  return <video ref={videoRef} muted preload="auto" style={{ width: 1, height: 1 }} onError={() => settle(false)} />;
}
