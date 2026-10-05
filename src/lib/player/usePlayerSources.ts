"use client";

/**
 * usePlayerSources — state machine sumber player per episode.
 *
 * Tanggung jawab:
 * - memilih kualitas awal (preferensi localStorage + aturan fallback terdekat),
 * - me-resolve URL server anime (lazy, cache per episode),
 * - mencatat server gagal dan berpindah ke server berikutnya DI KUALITAS SAMA,
 * - mengekspos state "semua server gagal" untuk UI error buatan.
 *
 * Preferensi kualitas HANYA ditulis saat pengguna memilih manual.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerSource, QualityGroup } from "@/types/player";
import { sourceKey } from "@/types/player";
import { pickInitialQuality, qualityLabel } from "./sources";

const QUALITY_LS_KEY = "cyronime:quality";

export function readStoredQuality(): string | null {
  try {
    return localStorage.getItem(QUALITY_LS_KEY);
  } catch {
    return null;
  }
}

function writeStoredQuality(quality: string): void {
  try {
    localStorage.setItem(QUALITY_LS_KEY, quality);
  } catch {
    // localStorage penuh/dimatikan — abaikan.
  }
}

export interface PlayerSourcesApi {
  groups: QualityGroup[];
  quality: string;
  activeGroup: QualityGroup | null;
  activeSource: PlayerSource | null;
  activeUrl: string | null;
  resolving: boolean;
  allFailed: boolean;
  failedKeys: Set<string>;
  /** Toast awal bila kualitas preferensi tidak tersedia (sekali per episode). */
  initialNotice: string | null;
  /** Pesan status non-blokir ("Server vidhide gagal. Mencoba mega (720p)…"). */
  statusMessage: string | null;
  setStatusMessage: (msg: string | null) => void;
  setQuality: (quality: string, opts?: { manual?: boolean }) => void;
  pickSource: (source: PlayerSource) => void;
  /** Tandai sumber gagal → otomatis pindah ke server berikutnya di kualitas sama. */
  markFailed: (source: PlayerSource) => void;
  /** Reset daftar gagal + coba ulang sumber pertama (tombol "Coba lagi"). */
  retry: () => void;
}

export function usePlayerSources(args: {
  groups: QualityGroup[];
  resolveEndpoint: string | null;
  /** Berubah = episode lain → reset daftar server gagal + pilih ulang kualitas. */
  episodeKey: string;
}): PlayerSourcesApi {
  const { groups, resolveEndpoint, episodeKey } = args;

  const [quality, setQualityState] = useState<string>(groups[0]?.quality ?? "");
  const [serverIndex, setServerIndex] = useState(0);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());
  const [initialNotice, setInitialNotice] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resolveNonce, setResolveNonce] = useState(0);

  const failedRef = useRef<Set<string>>(new Set());
  const urlCacheRef = useRef<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  /** Pindah ke server berikutnya (belum gagal) di kualitas sama, atau tandai semua gagal. */
  const advanceOnFailure = useCallback(
    (failed: PlayerSource) => {
      const group = groups.find((g) => g.quality === failed.quality);
      if (!group) {
        setAllFailed(true);
        return;
      }
      const failedIdx = group.sources.findIndex((s) => sourceKey(s) === sourceKey(failed));
      const candidate = group.sources
        .slice(failedIdx + 1)
        .find((s) => !failedRef.current.has(sourceKey(s)));
      if (candidate) {
        setStatusMessage(
          `Server ${failed.server} gagal. Mencoba ${candidate.server} (${qualityLabel(failed.quality)})…`
        );
        setServerIndex(group.sources.indexOf(candidate));
      } else {
        setAllFailed(true);
        setStatusMessage(null);
      }
    },
    [groups]
  );

  // Inisialisasi kualitas sesuai aturan preferensi (sekali per episode).
  useEffect(() => {
    const { quality: q, notice } = pickInitialQuality(groups, readStoredQuality());
    failedRef.current = new Set();
    urlCacheRef.current = {};
    setFailedKeys(new Set());
    setAllFailed(false);
    setStatusMessage(null);
    setInitialNotice(notice);
    setQualityState(q || groups[0]?.quality || "");
    setServerIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeKey]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.quality === quality) ?? groups[0] ?? null,
    [groups, quality]
  );

  const activeSource = useMemo(() => {
    if (!activeGroup || !activeGroup.sources.length) return null;
    return activeGroup.sources[Math.min(serverIndex, activeGroup.sources.length - 1)];
  }, [activeGroup, serverIndex]);

  /** Resolve URL sumber aktif (anime: serverId → embed URL; lainnya: url final). */
  useEffect(() => {
    if (!activeSource) {
      setActiveUrl(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const key = sourceKey(activeSource);
    const direct = activeSource.url;
    if (direct) {
      setActiveUrl(direct);
      setResolving(false);
      return;
    }
    const cached = urlCacheRef.current[key];
    if (cached) {
      setActiveUrl(cached);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    setActiveUrl(null);

    (async () => {
      if (!activeSource.serverId || !resolveEndpoint) {
        setResolving(false);
        failedRef.current.add(key);
        setFailedKeys(new Set(failedRef.current));
        advanceOnFailure(activeSource);
        return;
      }
      try {
        const res = await fetch(
          `${resolveEndpoint}/${encodeURIComponent(activeSource.serverId)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("resolve failed");
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("no url");
        if (cancelled) return;
        urlCacheRef.current[key] = data.url;
        setActiveUrl(data.url);
        setResolving(false);
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setResolving(false);
        failedRef.current.add(key);
        setFailedKeys(new Set(failedRef.current));
        advanceOnFailure(activeSource);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, resolveNonce, episodeKey]);

  const markFailed = useCallback(
    (failed: PlayerSource) => {
      const key = sourceKey(failed);
      failedRef.current.add(key);
      setFailedKeys(new Set(failedRef.current));
      advanceOnFailure(failed);
    },
    [advanceOnFailure]
  );

  const retry = useCallback(() => {
    failedRef.current = new Set();
    setFailedKeys(new Set());
    setAllFailed(false);
    setStatusMessage(null);
    setServerIndex(0);
    setResolveNonce((n) => n + 1);
  }, []);

  const setQuality = useCallback(
    (q: string, opts?: { manual?: boolean }) => {
      if (opts?.manual) writeStoredQuality(q);
      setAllFailed(false);
      setStatusMessage(null);
      if (q === quality) {
        setResolveNonce((n) => n + 1);
        return;
      }
      const group = groups.find((g) => g.quality === q);
      const candidate = group?.sources.find((s) => !failedRef.current.has(sourceKey(s)));
      setQualityState(q);
      setServerIndex(candidate && group ? group.sources.indexOf(candidate) : 0);
    },
    [groups, quality]
  );

  const pickSource = useCallback(
    (source: PlayerSource) => {
      setAllFailed(false);
      setStatusMessage(null);
      const group = groups.find((g) => g.quality === source.quality);
      if (!group) return;
      setQualityState(source.quality);
      setServerIndex(group.sources.indexOf(source));
      setResolveNonce((n) => n + 1);
    },
    [groups]
  );

  return {
    groups,
    quality,
    activeGroup,
    activeSource,
    activeUrl,
    resolving,
    allFailed,
    failedKeys,
    initialNotice,
    statusMessage,
    setStatusMessage,
    setQuality,
    pickSource,
    markFailed,
    retry,
  };
}
