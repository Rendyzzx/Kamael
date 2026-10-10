/**
 * Deteksi otomatis anime BARU (judul baru masuk katalog ongoing), lalu
 * broadcast ke semua device yang mengizinkan kategori "newanime".
 *
 * Sengaja TIDAK memproses episode baru — user bisa kebanjiran notifikasi.
 * Ini hanya judul yang belum pernah terlihat sebelumnya.
 *
 * Baseline Redis:
 *   notify:newanime:seen -> hash animeId -> JSON { title, poster, seenAt }
 *   Run PERTAMA hanya menanam baseline (tidak mengirim apa pun), supaya
 *   seluruh katalog lama tidak di-broadcast sekonyong-konyong.
 */
import "server-only";
import { getOngoingAnime } from "@/lib/api/anime";
import { dispatchBroadcast } from "./dispatch";
import { getRedis, isRedisConfigured, safeRedis } from "@/lib/redis/client";

const SEEN_KEY = "notify:newanime:seen";
/** Batas judul per run — anti spam jika upstream tiba-tiba ganti skema ID. */
const MAX_PER_RUN = 3;

interface SeenRecord {
  title: string;
  poster: string;
  seenAt: number;
}

export interface NewAnimeCheckResult {
  redisActive: boolean;
  /** True bila run ini hanya menanam baseline pertama (tidak mengirim). */
  baselineSeeded: boolean;
  detected: number;
  broadcasted: { title: string; targets: number; sent: number; failed: number }[];
}

/** Cek anime baru & broadcast. Idempoten; aman dipanggil berkali-kali. */
export async function checkNewAnimeNotifications(): Promise<NewAnimeCheckResult> {
  const result: NewAnimeCheckResult = {
    redisActive: isRedisConfigured(),
    baselineSeeded: false,
    detected: 0,
    broadcasted: [],
  };
  if (!result.redisActive) return result;

  // Ambil daftar ongoing halaman 1 (cukup untuk mendeteksi judul baru).
  const page = await getOngoingAnime(1);
  const items = (page?.items ?? []).filter((x) => x.animeId && x.title);

  return safeRedis(async () => {
    const redis = getRedis();
    const seenRaw = await redis.hgetall<Record<string, unknown>>(SEEN_KEY);
    const isFirstRun = !seenRaw || Object.keys(seenRaw).length === 0;

    if (isFirstRun) {
      // Tanam baseline; jangan broadcast katalog yang sudah ada.
      const now = Date.now();
      const seed: Record<string, string> = {};
      for (const item of items) {
        seed[item.animeId] = JSON.stringify({
          title: item.title,
          poster: item.poster ?? "",
          seenAt: now,
        } satisfies SeenRecord);
      }
      if (Object.keys(seed).length > 0) await redis.hset(SEEN_KEY, seed);
      result.baselineSeeded = true;
      return result;
    }

    // Cari judul yang belum pernah terlihat.
    const fresh = items.filter(
      (item) => !(item.animeId in seenRaw)
    );
    result.detected = fresh.length;
    if (fresh.length === 0) return result;

    // Catat SEMUA judul baru ke baseline, tapi broadcast maksimal MAX_PER_RUN
    // (sisanya sudah tercatat — tidak diulang di run berikutnya).
    const now = Date.now();
    const seed: Record<string, string> = {};
    for (const item of fresh) {
      seed[item.animeId] = JSON.stringify({
        title: item.title,
        poster: item.poster ?? "",
        seenAt: now,
      } satisfies SeenRecord);
    }
    await redis.hset(SEEN_KEY, seed);

    for (const item of fresh.slice(0, MAX_PER_RUN)) {
      const res = await dispatchBroadcast({
        title: `Anime baru: ${item.title}`.slice(0, 120),
        body: `${item.title} sudah bisa ditonton di Cyronime. Yuk cek sekarang!`,
        category: "newanime",
        targetPlatform: "all",
        createdBy: "auto:new-anime",
        image: item.poster || null,
        data: { deepLink: `anime/${item.animeId}` },
      });
      result.broadcasted.push({ title: item.title, targets: res.targets, sent: res.sent, failed: res.failed });
    }
    return result;
  }, result);
}
