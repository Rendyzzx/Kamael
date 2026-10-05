"use client";

/**
 * Player native (<video> + hls.js untuk m3u8) — dipakai saat sumber bertipe
 * hls/mp4. Fitur: seek, ±10 dtk, kecepatan (via menu), putar otomatis, simpan
 * progres tiap 5 dtk, lanjutkan dari posisi terakhir, ganti kualitas tanpa
 * reload (posisi dipertahankan), fallback otomatis antar server di kualitas
 * sama, pintasan keyboard, tap dua kali untuk lompat 10 detik.
 *
 * Komponen ini dirender DI DALAM container 16:9 milik PlayerShell (absolute
 * inset-0); pil status / spinner / overlay error dirender oleh PlayerShell.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type Hls from "hls.js";
import type { PlayerSourcesApi } from "@/lib/player/usePlayerSources";
import { detectSourceType, qualityLabel } from "@/lib/player/sources";

const AUTONEXT_KEY = "cyronime:autonext";
const AUTO_RESUME_KEY = "cyronime_auto_resume";
const SEEK_STEP = 10;
const LOAD_TIMEOUT_MS = 10_000;
const STALL_TIMEOUT_MS = 15_000;

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export interface NativePlayerProps {
  api: PlayerSourcesApi;
  url: string;
  poster: string | null;
  episodeShortLabel: string;
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
  onOpenSettings: () => void;
  /** Kecepatan playback dari menu pengaturan. */
  speed: number;
  /** Untuk simpan progres (position/duration) ke /api/watch/progress. */
  track?: {
    type: "anime" | "donghua";
    contentId: string;
    episodeId: string;
    episode: number | null;
    title: string;
    poster: string;
  } | null;
}

export default function NativePlayer(props: NativePlayerProps) {
  const { api, url, poster, track, onOpenSettings, speed } = props;
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [spin, setSpin] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [autonext, setAutonext] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [skipFlash, setSkipFlash] = useState<"l" | "r" | null>(null);
  const [resumeChip, setResumeChip] = useState<string | null>(null);

  // Keadaan lintas-render/effect.
  const lastTimeRef = useRef(0);
  const playingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const resumePositionRef = useRef<number | null>(null);
  const autoResumeRef = useRef(true);
  const retriedRef = useRef(false);
  const failedRef = useRef(false);
  const progressSaveOkRef = useRef(true);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const lastTapSideRef = useRef<"l" | "r" | "">("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- Putar otomatis (pref localStorage, default aktif) ---------- */
  useEffect(() => {
    const v = localStorage.getItem(AUTONEXT_KEY) !== "0";
    setAutonext(v);
    autoResumeRef.current = localStorage.getItem(AUTO_RESUME_KEY) !== "0";
  }, []);

  const toggleAutonext = useCallback(() => {
    setAutonext((v) => {
      const next = !v;
      try {
        localStorage.setItem(AUTONEXT_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  /* ---------- Gagal memuat → fallback server berikutnya (kualitas sama) ---------- */
  const handleSourceFailure = useCallback(() => {
    const src = api.activeSource;
    if (!src || failedRef.current) return;
    failedRef.current = true;
    // Coba ulang sumber yang sama sekali (di waktu terakhir) sebelum pindah server.
    if (!retriedRef.current) {
      retriedRef.current = true;
      videoRef.current?.load();
      return;
    }
    api.markFailed(src);
  }, [api]);

  /* ---------- Lanjutkan dari posisi terakhir (data Redis) ---------- */
  useEffect(() => {
    if (!track?.contentId || !track?.episodeId) return;
    let cancelled = false;
    fetch(`/api/watch/progress?contentId=${encodeURIComponent(track.contentId)}`)
      .then((res) => (res.ok ? res.json() : { progress: null }))
      .then(
        (
          data: {
            progress?: { episodeId?: string; position?: number; duration?: number } | null;
          }
        ) => {
          if (cancelled) return;
          const p = data.progress;
          if (
            p &&
            p.episodeId === track.episodeId &&
            typeof p.position === "number" &&
            typeof p.duration === "number" &&
            p.duration > 0 &&
            p.position > 10 &&
            p.position < p.duration - 30
          ) {
            resumePositionRef.current = p.position;
            if (autoResumeRef.current) {
              pendingSeekRef.current = p.position;
            } else {
              setResumeChip(fmt(p.position));
            }
          }
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [track?.contentId, track?.episodeId]);

  /* ---------- Muat sumber aktif (dipanggil saat url berubah) ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    failedRef.current = false;
    retriedRef.current = false;
    setSpin(true);

    // Ganti kualitas/server tanpa reload: simpan currentTime & status play.
    if (lastTimeRef.current > 1) {
      pendingSeekRef.current = lastTimeRef.current;
    }
    const shouldPlay = playingRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) {
        handleSourceFailure();
      }
    }, LOAD_TIMEOUT_MS);

    const type = detectSourceType(url);
    if (type === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      let cancelled = false;
      import("hls.js")
        .then(({ default: HlsCtor }) => {
          if (cancelled) return;
          if (!HlsCtor.isSupported()) {
            video.src = url;
            return;
          }
          const hls = new HlsCtor({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
            handleSourceFailure();
          });
        })
        .catch(() => handleSourceFailure());
      return () => {
        cancelled = true;
      };
    }

    video.src = url;
    video.load();
    if (shouldPlay) {
      video.play().catch(() => setPlaying(false));
    }

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  /* ---------- Simpan progres tiap 5 detik (jika fitur riwayat aktif) ---------- */
  useEffect(() => {
    if (!track || !progressSaveOkRef.current) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || !video.duration) return;
      fetch("/api/watch/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...track,
          position: Math.floor(video.currentTime),
          duration: Math.floor(video.duration),
        }),
      }).catch(() => {
        progressSaveOkRef.current = false;
      });
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.episodeId]);

  /* ---------- Kecepatan playback (dari menu pengaturan) ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed, url]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /* ---------- Kontrol tampil/hilang (3 detik saat berjalan) ---------- */
  const wake = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const video = videoRef.current;
    if (video && !video.paused) {
      idleTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.min(
        Math.max(0, video.currentTime + delta),
        video.duration || Number.MAX_SAFE_INTEGER
      );
      setSkipFlash(delta < 0 ? "l" : "r");
      setTimeout(() => setSkipFlash(null), 450);
      wake();
    },
    [wake]
  );

  const goEpisode = useCallback(
    (href: string | null) => {
      if (!href) return;
      router.push(href);
    },
    [router]
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  /* ---------- Pintasan keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") {
        e.preventDefault();
        togglePlay();
      } else if (k === "j") skip(-SEEK_STEP);
      else if (k === "l") skip(SEEK_STEP);
      else if (k === "f") toggleFullscreen();
      else if (e.shiftKey && k === "n") goEpisode(props.nextHref);
      else if (e.shiftKey && k === "p") goEpisode(props.prevHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, toggleFullscreen, goEpisode, props.nextHref, props.prevHref]);

  /* ---------- Putar otomatis episode berikutnya ---------- */
  const startCountdown = useCallback(() => {
    if (!props.nextHref || localStorage.getItem(AUTONEXT_KEY) === "0") return;
    setCountdown(5);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          router.push(props.nextHref!);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }, [props.nextHref, router]);

  /* ---------- Handler <video> ---------- */
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
    lastTimeRef.current = video.currentTime;
    if (video.duration && video.buffered.length) {
      const end = video.buffered.end(video.buffered.length - 1);
      setBufferedPct(Math.min(100, (end / video.duration) * 100));
    }
    // Ada progres → reset deteksi stall 15 dtk.
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && v.readyState < 3) {
        handleSourceFailure();
      }
    }, STALL_TIMEOUT_MS);
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    if (pendingSeekRef.current != null && pendingSeekRef.current < (video.duration || Infinity)) {
      video.currentTime = pendingSeekRef.current;
    }
    pendingSeekRef.current = null;
  };

  const onCanPlay = () => {
    setSpin(false);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  };

  const onPlay = () => {
    playingRef.current = true;
    setPlaying(true);
    wake();
  };

  const onPause = () => {
    playingRef.current = false;
    setPlaying(false);
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  const onEnded = () => {
    playingRef.current = false;
    setPlaying(false);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    startCountdown();
  };

  const onError = () => handleSourceFailure();

  /* ---------- Seek bar ---------- */
  const onSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const sliderEl = e.currentTarget;
    const rect = sliderEl.getBoundingClientRect();
    const seekTo = (clientX: number) => {
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const video = videoRef.current;
      if (video && video.duration) {
        video.currentTime = ratio * video.duration;
      }
    };
    seekTo(e.clientX);
    const move = (ev: PointerEvent) => seekTo(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      wake();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------- Tap dua kali sisi kiri/kanan = ±10 dtk ---------- */
  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, [role='slider'], a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2 ? "l" : "r";
    const now = Date.now();
    if (now - lastTapRef.current < 320 && side === lastTapSideRef.current) {
      skip(side === "l" ? -SEEK_STEP : SEEK_STEP);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    lastTapSideRef.current = side;
    if (controlsVisible && playingRef.current) setControlsVisible(false);
    else wake();
  };

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;
  const idle = !controlsVisible && playing;
  const centerBtn = "flex h-11 w-11 items-center justify-center rounded-full";
  const smallBtn = "flex h-9 w-9 items-center justify-center rounded-full";
  const centerBtnStyle = { color: "var(--frost)" } as const;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none overflow-hidden"
      onPointerMove={wake}
      onClick={onSurfaceClick}
      role="region"
      aria-label={`Pemutar video ${props.episodeShortLabel}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        playsInline
        poster={poster ?? undefined}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onPlaying={() => setSpin(false)}
        onWaiting={() => setSpin(true)}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onError={onError}
        aria-label={`Video ${props.episodeShortLabel}`}
      />

      {/* Spinner kecil di tengah saat buffering/memuat sumber */}
      {spin ? (
        <div
          role="status"
          aria-label="Memuat video"
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        >
          <i
            className="block h-9 w-9 rounded-full"
            style={{
              border: "3px solid rgba(234,246,250,.2)",
              borderTopColor: "var(--glacier)",
              animation: "player-spin .8s linear infinite",
            }}
            aria-hidden="true"
          />
        </div>
      ) : null}

      {/* Gradient gelap atas & bawah (ink 85% → transparan) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30%]"
        style={{
          background: "linear-gradient(180deg, rgba(13,19,32,.85), transparent)",
          opacity: idle ? 0 : 1,
          transition: "opacity .2s",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]"
        style={{
          background: "linear-gradient(0deg, rgba(13,19,32,.85), transparent)",
          opacity: idle ? 0 : 1,
          transition: "opacity .2s",
        }}
      />

      {/* Indikator skip 10 dtk */}
      {skipFlash ? (
        <div
          aria-hidden="true"
          className={`absolute top-[44%] rounded-pill px-4 py-2.5 text-[14px] font-bold ${
            skipFlash === "l" ? "left-[12%]" : "right-[12%]"
          }`}
          style={{ background: "rgba(13,19,32,.65)", color: "var(--frost)" }}
        >
          {skipFlash === "l" ? "-10 dtk" : "+10 dtk"}
        </div>
      ) : null}

      {/* Chip "terakhir di MM:SS" (bila auto-resume mati) */}
      {resumeChip ? (
        <div
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-pill px-3 py-2"
          style={{ background: "rgba(13,19,32,.88)", border: "1px solid var(--deep-2)" }}
        >
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>
            Terakhir di {resumeChip}
          </span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              const p = resumePositionRef.current;
              if (video && p) video.currentTime = p;
              resumePositionRef.current = null;
              setResumeChip(null);
            }}
            className="text-[13px] font-bold"
            style={{ color: "var(--glacier)" }}
          >
            Lanjutkan
          </button>
        </div>
      ) : null}

      {/* Kontrol (hilang otomatis saat video berjalan) — satu panel bawah,
          simetris: transport di tengah, lalu seekbar, lalu baris sekunder.
          Tidak ada tombol play dobel seperti sebelumnya. */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-3 pb-2.5"
        style={{ opacity: idle ? 0 : 1, pointerEvents: idle ? "none" : "auto", transition: "opacity .2s" }}
      >
        {/* Baris 1: Prev / -10 / Play / +10 / Next — simetris, gap rata */}
        <div className="mb-2.5 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => goEpisode(props.prevHref)}
            disabled={!props.prevHref}
            aria-label={
              props.prevHref
                ? `Episode sebelumnya${props.prevLabel ? ` (${props.prevLabel})` : ""}`
                : "Episode pertama"
            }
            aria-disabled={!props.prevHref}
            className={`${centerBtn} flex-col disabled:opacity-30`}
            style={centerBtnStyle}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>skip_previous</span>
            {props.prevLabel ? (
              <span className="text-[9px] leading-none" style={{ color: "var(--muted)" }}>{props.prevLabel}</span>
            ) : null}
          </button>
          <button type="button" onClick={() => skip(-SEEK_STEP)} aria-label="Mundur 10 detik" className={centerBtn} style={centerBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>replay_10</span>
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Jeda" : "Putar"}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--frost)", color: "var(--ink)" }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 30 }}>
              {playing ? "pause" : "play_arrow"}
            </span>
          </button>
          <button type="button" onClick={() => skip(SEEK_STEP)} aria-label="Maju 10 detik" className={centerBtn} style={centerBtnStyle}>
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>forward_10</span>
          </button>
          <button
            type="button"
            onClick={() => goEpisode(props.nextHref)}
            disabled={!props.nextHref}
            aria-label={
              props.nextHref
                ? `Episode berikutnya${props.nextLabel ? ` (${props.nextLabel})` : ""}`
                : "Episode terakhir"
            }
            aria-disabled={!props.nextHref}
            className={`${centerBtn} flex-col disabled:opacity-30`}
            style={centerBtnStyle}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>skip_next</span>
            {props.nextLabel ? (
              <span className="text-[9px] leading-none" style={{ color: "var(--muted)" }}>{props.nextLabel}</span>
            ) : null}
          </button>
        </div>

        {/* Baris 2: Otomatis (kiri) — kualitas / kecepatan / layar penuh (kanan).
            Sesuai mockup: tidak ada ikon gear terpisah — pill kualitas & kecepatan
            langsung membuka menu pengaturan (yang juga memuat pilihan server/lapor). */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            role="switch"
            aria-checked={autonext}
            aria-label="Putar otomatis episode berikutnya"
            onClick={toggleAutonext}
            className="flex h-9 items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: "var(--muted)" }}
          >
            Otomatis
            <span className="relative block h-4 w-8 rounded-full" style={{ background: autonext ? "var(--glacier)" : "rgba(234,246,250,.28)" }}>
              <span
                className="absolute top-0.5 h-3 w-3 rounded-full"
                style={{ left: autonext ? "18px" : "2px", background: autonext ? "var(--ink)" : "var(--frost)" }}
              />
            </span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Pilih kualitas"
              className="flex h-9 items-center rounded-chip px-2.5 text-[12px] font-semibold"
              style={{ color: "var(--frost)", background: "rgba(234,246,250,.1)" }}
            >
              {qualityLabel(api.quality)}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Pilih kecepatan"
              className="flex h-9 items-center rounded-chip px-2.5 text-[12px] font-semibold"
              style={{ color: "var(--frost)", background: "rgba(234,246,250,.1)" }}
            >
              {speed}x
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label="Layar penuh" className={smallBtn} style={centerBtnStyle}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>fullscreen</span>
            </button>
          </div>
        </div>

        {/* Baris 3: waktu + seekbar */}
        <div>
          <span className="block text-[12px] tabular-nums" style={{ color: "var(--frost)" }}>
            {fmt(current)} / {fmt(duration)}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Posisi video"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration) || 0}
            aria-valuenow={Math.floor(current)}
            className="relative mt-1 h-5 cursor-pointer touch-none"
            onPointerDown={onSeekPointerDown}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") skip(-5);
              if (e.key === "ArrowRight") skip(5);
            }}
          >
            <div className="absolute left-0 right-0 top-[9px] h-[3px] rounded" style={{ background: "rgba(234,246,250,.25)" }} />
            <div className="absolute left-0 top-[9px] h-[3px] rounded" style={{ width: `${bufferedPct}%`, background: "rgba(234,246,250,.4)" }} />
            <div className="absolute left-0 top-[9px] h-[3px] rounded" style={{ width: `${progressPct}%`, background: "var(--glacier)" }} />
            <div className="absolute top-[6px] h-3.5 w-3.5 rounded-full" style={{ left: `calc(${progressPct}% - 7px)`, background: "var(--glacier)" }} />
          </div>
        </div>
      </div>

      {/* Overlay putar otomatis: "Episode berikutnya mulai dalam 5" */}
      {countdown !== null ? (
        <div
          role="dialog"
          aria-label="Putar episode berikutnya"
          className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(13,19,32,.92)", border: "1px solid var(--deep-2)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--frost)" }}>
            Episode berikutnya mulai dalam <b style={{ color: "var(--glacier)" }}>{countdown}</b>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setCountdown(null);
              }}
              className="rounded-pill px-3.5 text-[13px] font-semibold"
              style={{ height: 34, color: "var(--frost)" }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => goEpisode(props.nextHref)}
              className="rounded-pill px-3.5 text-[13px] font-bold"
              style={{ height: 34, background: "var(--frost)", color: "var(--ink)" }}
            >
              Putar sekarang
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
