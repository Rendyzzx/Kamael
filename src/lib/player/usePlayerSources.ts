"use client";

/**
 * usePlayerSources — state machine sumber player per episode.
 *
 * Model "race" server (bukan coba satu-satu berurutan):
 * - Semua server kualitas aktif di-resolve (serverId → URL) SEKALIGUS secara
 *   paralel lewat backend sendiri (aman, bukan ke situs sumber langsung).
 * - Setiap URL yang sudah didapat langsung dimasukkan ke "race pool" dan
 *   dimuat diam-diam (iframe/video tersembunyi, lihat ServerRace.tsx) untuk
 *   diuji siapa yang BENAR-BENAR siap main lebih dulu — bukan cuma siapa
 *   yang resolve-nya duluan. Pemenang (siap pertama) langsung ditampilkan;
 *   kandidat lain yang belum selesai langsung dihentikan (hemat kuota/iklan).
 * - Server yang gagal (resolve gagal / timeout saat race / gagal saat main)
 *   dicatat per episode dan tidak diikutkan lagi di race berikutnya.
 * - Pemilihan server manual (menu pengaturan) melewati race — langsung
 *   dipakai sesuai pilihan pengguna.
 * - Tanpa preferensi kualitas tersimpan: race dilakukan LINTAS SEMUA kualitas
 *   sekaligus (bukan dikunci ke satu kualitas default seperti 480p) — siapa
 *   pun yang paling cepat siap (di kualitas apa pun) langsung dipakai, demi
 *   menghindari delay loading. Begitu pengguna memilih kualitas secara
 *   manual, preferensi itu dikunci dan race berikutnya (termasuk saat ganti
 *   episode & retry otomatis) dibatasi ke kualitas tersebut saja.
 *
 * Preferensi kualitas HANYA ditulis saat pengguna memilih manual.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerSource, QualityGroup } from "@/types/player";
import { sourceKey } from "@/types/player";
import { pickInitialQuality } from "./sources";

const QUALITY_LS_KEY = "cyronime:quality";

export interface RaceEntry {
  source: PlayerSource;
  url: string;
}

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
  /** True selagi resolve/race berjalan dan belum ada pemenang. */
  resolving: boolean;
  /** Kandidat yang sedang di-race diam-diam (dipakai ServerRace). */
  racePool: RaceEntry[];
  /** Generasi race saat ini — dipakai sebagai React key agar ServerRace remount bersih. */
  raceGeneration: number;
  allFailed: boolean;
  failedKeys: Set<string>;
  /** True bila server aktif dipilih manual (bukan hasil race otomatis). */
  manualServer: boolean;
  /** Toast awal bila kualitas preferensi tidak tersedia (sekali per episode). */
  initialNotice: string | null;
  /** Pesan status non-blokir ("Memuat 5 server, menampilkan yang tercepat…"). */
  statusMessage: string | null;
  setStatusMessage: (msg: string | null) => void;
  setQuality: (quality: string, opts?: { manual?: boolean }) => void;
  /** Pilih server tertentu secara manual — melewati race. */
  pickSource: (source: PlayerSource) => void;
  /** Kembali ke mode otomatis (race) untuk kualitas aktif. */
  goAutomatic: () => void;
  /** Tandai sumber gagal saat SEDANG DIPUTAR → race ulang sisa server. */
  markFailed: (source: PlayerSource) => void;
  /** Dipanggil ServerRace saat satu kandidat siap duluan. */
  handleRaceWin: (source: PlayerSource, url: string) => void;
  /** Dipanggil ServerRace saat satu kandidat gagal/timeout. */
  handleRaceEntryFailed: (source: PlayerSource) => void;
  /** Reset daftar gagal + race ulang dari awal (tombol "Coba lagi"). */
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
  const [activeSource, setActiveSource] = useState<PlayerSource | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [racePool, setRacePool] = useState<RaceEntry[]>([]);
  const [raceGeneration, setRaceGeneration] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());
  const [manualServer, setManualServer] = useState(false);
  const [initialNotice, setInitialNotice] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const failedRef = useRef<Set<string>>(new Set());
  const urlCacheRef = useRef<Record<string, string>>({});
  const raceSeqRef = useRef(0);
  const poolKeysRef = useRef<Set<string>>(new Set());
  const pendingResolvesRef = useRef(0);
  /** True setelah pengguna memilih kualitas manual — mengunci race ke kualitas itu saja. */
  const qualityLockedRef = useRef(false);

  const checkExhausted = useCallback((seq: number) => {
    if (raceSeqRef.current !== seq) return;
    if (pendingResolvesRef.current <= 0 && poolKeysRef.current.size === 0) {
      setAllFailed(true);
      setResolving(false);
      setStatusMessage(null);
    }
  }, []);

  const addToPool = useCallback((source: PlayerSource, url: string, seq: number) => {
    if (raceSeqRef.current !== seq) return;
    const key = sourceKey(source);
    if (poolKeysRef.current.has(key)) return;
    poolKeysRef.current.add(key);
    setRacePool((p) => [...p, { source, url }]);
  }, []);

  /** Mulai race paralel untuk semua kandidat (belum gagal) di satu grup kualitas. */
  const race = useCallback(
    (group: QualityGroup | null) => {
      const seq = ++raceSeqRef.current;
      setRaceGeneration(seq);
      setActiveSource(null);
      setActiveUrl(null);
      setAllFailed(false);
      setRacePool([]);
      poolKeysRef.current = new Set();

      const candidates = group ? group.sources.filter((s) => !failedRef.current.has(sourceKey(s))) : [];
      if (!candidates.length) {
        setResolving(false);
        setAllFailed(true);
        setStatusMessage(null);
        return;
      }

      setResolving(true);
      setStatusMessage(
        candidates.length > 1 ? `Memuat ${candidates.length} server, menampilkan yang tercepat…` : null
      );
      pendingResolvesRef.current = candidates.length;

      for (const source of candidates) {
        const key = sourceKey(source);
        const direct = source.url ?? urlCacheRef.current[key];
        if (direct) {
          pendingResolvesRef.current -= 1;
          addToPool(source, direct, seq);
          continue;
        }
        if (!source.serverId || !resolveEndpoint) {
          pendingResolvesRef.current -= 1;
          failedRef.current.add(key);
          setFailedKeys(new Set(failedRef.current));
          checkExhausted(seq);
          continue;
        }
        fetch(`${resolveEndpoint}/${encodeURIComponent(source.serverId)}`)
          .then((res) => {
            if (!res.ok) throw new Error("resolve-failed");
            return res.json() as Promise<{ url?: string }>;
          })
          .then((data) => {
            if (raceSeqRef.current !== seq) return;
            if (!data.url) throw new Error("no-url");
            urlCacheRef.current[key] = data.url;
            pendingResolvesRef.current -= 1;
            addToPool(source, data.url, seq);
          })
          .catch(() => {
            if (raceSeqRef.current !== seq) return;
            pendingResolvesRef.current -= 1;
            failedRef.current.add(key);
            setFailedKeys(new Set(failedRef.current));
            checkExhausted(seq);
          });
      }
    },
    [resolveEndpoint, addToPool, checkExhausted]
  );

  /**
   * Grup kandidat untuk race otomatis.
   * - Terkunci (ada preferensi kualitas manual): kembalikan grup kualitas itu
   *   saja — hormati pilihan pengguna.
   * - Tidak terkunci: gabungkan sumber dari SEMUA grup kualitas jadi satu
   *   pool race — siapa pun yang tercepat (di kualitas apa pun) yang menang.
   */
  const raceCandidateGroup = useCallback(
    (targetQuality: string | null): QualityGroup | null => {
      if (qualityLockedRef.current) {
        return groups.find((g) => g.quality === targetQuality) ?? groups[0] ?? null;
      }
      const sources = groups.flatMap((g) => g.sources);
      return sources.length ? { quality: "__mixed__", sources } : null;
    },
    [groups]
  );

  // Inisialisasi kualitas sesuai aturan preferensi (sekali per episode) + race.
  useEffect(() => {
    failedRef.current = new Set();
    urlCacheRef.current = {};
    setFailedKeys(new Set());
    setManualServer(false);
    const storedPref = readStoredQuality();
    qualityLockedRef.current = Boolean(storedPref);
    const { quality: q, notice } = pickInitialQuality(groups, storedPref);
    setInitialNotice(notice);
    const initialQuality = q || groups[0]?.quality || "";
    setQualityState(initialQuality);
    race(raceCandidateGroup(initialQuality));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeKey]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.quality === quality) ?? groups[0] ?? null,
    [groups, quality]
  );

  const handleRaceWin = useCallback(
    (source: PlayerSource, url: string) => {
      setActiveSource(source);
      setActiveUrl(url);
      // Race lintas-kualitas: pil kualitas di UI mengikuti kualitas pemenang asli
      // (bisa berbeda dari "quality" sebelum race selesai).
      setQualityState(source.quality);
      setResolving(false);
      setStatusMessage(null);
    },
    []
  );

  const handleRaceEntryFailed = useCallback(
    (source: PlayerSource) => {
      const key = sourceKey(source);
      if (failedRef.current.has(key)) return;
      failedRef.current.add(key);
      setFailedKeys(new Set(failedRef.current));
      poolKeysRef.current.delete(key);
      setRacePool((p) => p.filter((e) => sourceKey(e.source) !== key));
      checkExhausted(raceSeqRef.current);
    },
    [checkExhausted]
  );

  const markFailed = useCallback(
    (failed: PlayerSource) => {
      const key = sourceKey(failed);
      if (failedRef.current.has(key)) return;
      failedRef.current.add(key);
      setFailedKeys(new Set(failedRef.current));
      setManualServer(false);
      setStatusMessage(`Server ${failed.server} bermasalah. Mencoba server lain…`);
      race(raceCandidateGroup(failed.quality));
    },
    [race, raceCandidateGroup]
  );

  const retry = useCallback(() => {
    failedRef.current = new Set();
    setFailedKeys(new Set());
    race(raceCandidateGroup(quality));
  }, [quality, race, raceCandidateGroup]);

  const setQuality = useCallback(
    (q: string, opts?: { manual?: boolean }) => {
      if (opts?.manual) {
        writeStoredQuality(q);
        qualityLockedRef.current = true;
      }
      setManualServer(false);
      const group = groups.find((g) => g.quality === q) ?? null;
      setQualityState(q);
      race(group);
    },
    [groups, race]
  );

  const goAutomatic = useCallback(() => {
    setManualServer(false);
    const group = groups.find((g) => g.quality === quality) ?? groups[0] ?? null;
    race(group);
  }, [groups, quality, race]);

  const pickSource = useCallback(
    (source: PlayerSource) => {
      const seq = ++raceSeqRef.current;
      setRaceGeneration(seq);
      setRacePool([]);
      poolKeysRef.current = new Set();
      setManualServer(true);
      setAllFailed(false);
      setActiveSource(null);
      setActiveUrl(null);
      setResolving(true);
      setStatusMessage(`Memuat server ${source.server}…`);
      setQualityState(source.quality);

      const key = sourceKey(source);
      const direct = source.url ?? urlCacheRef.current[key];

      const finish = (url: string) => {
        if (raceSeqRef.current !== seq) return;
        setActiveSource(source);
        setActiveUrl(url);
        setResolving(false);
        setStatusMessage(null);
      };
      const fail = () => {
        if (raceSeqRef.current !== seq) return;
        failedRef.current.add(key);
        setFailedKeys(new Set(failedRef.current));
        setManualServer(false);
        const group = groups.find((g) => g.quality === source.quality) ?? null;
        race(group);
      };

      if (direct) {
        finish(direct);
        return;
      }
      if (!source.serverId || !resolveEndpoint) {
        fail();
        return;
      }
      fetch(`${resolveEndpoint}/${encodeURIComponent(source.serverId)}`)
        .then((res) => {
          if (!res.ok) throw new Error("resolve-failed");
          return res.json() as Promise<{ url?: string }>;
        })
        .then((data) => {
          if (!data.url) throw new Error("no-url");
          urlCacheRef.current[key] = data.url;
          finish(data.url);
        })
        .catch(fail);
    },
    [groups, resolveEndpoint, race]
  );

  return {
    groups,
    quality,
    activeGroup,
    activeSource,
    activeUrl,
    resolving,
    racePool,
    raceGeneration,
    allFailed,
    failedKeys,
    manualServer,
    initialNotice,
    statusMessage,
    setStatusMessage,
    setQuality,
    pickSource,
    goAutomatic,
    markFailed,
    handleRaceWin,
    handleRaceEntryFailed,
    retry,
  };
}
