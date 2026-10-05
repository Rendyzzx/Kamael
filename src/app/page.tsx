import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SearchBox from "@/components/navbar/SearchBox";
import PortalSwitch from "@/components/portal/PortalSwitch";
import type { Portal } from "@/components/portal/portal-events";
import { getAnimeHome, getCompletedAnime } from "@/lib/api/anime";
import { getLatestDonghua, getOngoingDonghua } from "@/lib/api/donghua";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getPreferenceStatus } from "@/lib/redis/preference";
import { readVisitorId } from "@/lib/visitor";
import { listProgress, type WatchProgress } from "@/lib/redis/watching";
import type { DonghuaListItem } from "@/types/donghua";

/**
 * Home ("/") = dashboard trending sesuai portal yang SUDAH dipilih di
 * "/portal" (halaman terpisah, bukan bagian dari Home — keputusan user
 * Okt 2026). Preferensi dari Redis pref:{id} (user ID login atau visitor ID
 * cookie httpOnly).
 *
 * - Belum pernah memilih (Redis terjangkau & kosong) -> redirect("/portal").
 * - Redis TIDAK terjangkau -> fail-open ke "anime" (dashboard tetap tampil,
 *   TIDAK redirect) agar web tidak macet bolak-balik "/" <-> "/portal" saat
 *   Redis down (lihat getPreferenceStatus).
 * - portal anime: hero lanjut nonton / populer -> rail Anime Terbaru
 *   -> ranking Terpopuler (khusus anime).
 * - portal donghua: hero lanjut nonton / terbaru -> rail Donghua
 *   Terbaru -> rail Donghua Ongoing (khusus donghua).
 * Data yang tidak disediakan API (jadwal tayang, countdown, jumlah
 * penonton) tidak dipalsukan; ranking diurutkan dari skor asli.
 */
export const revalidate = 600;

export default async function HomePage() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());
  const status = id ? await getPreferenceStatus(id) : { value: null, redisOk: true };
  if (status.redisOk && !status.value) redirect("/portal");
  const portal: Portal = status.value ?? "anime";

  // Hanya fetch data portal aktif; portal lain dilewati (Promise.resolve(null)).
  const skip = () => Promise.resolve(null);
  const [animeHomeRes, animeCompletedRes, donghuaLatestRes, donghuaOngoingRes, continueRes] =
    await Promise.allSettled([
      portal === "anime" ? getAnimeHome() : skip(),
      portal === "anime" ? getCompletedAnime(1) : skip(),
      portal === "donghua" ? getLatestDonghua(1) : skip(),
      portal === "donghua" ? getOngoingDonghua(1) : skip(),
      userId ? listProgress(userId) : Promise.resolve([] as WatchProgress[]),
    ]);

  const animeHome =
    portal === "anime" && animeHomeRes.status === "fulfilled" ? animeHomeRes.value : null;
  const animeCompleted =
    portal === "anime" && animeCompletedRes.status === "fulfilled" ? animeCompletedRes.value : null;
  const donghuaLatest: DonghuaListItem[] =
    portal === "donghua" && donghuaLatestRes.status === "fulfilled"
      ? (donghuaLatestRes.value ?? [])
      : [];
  const donghuaOngoing: DonghuaListItem[] =
    portal === "donghua" && donghuaOngoingRes.status === "fulfilled"
      ? (donghuaOngoingRes.value ?? [])
      : [];
  const animeOngoing = animeHome?.ongoing ?? [];
  const popularAnime = animeCompleted
    ? [...animeCompleted.items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    : [];
  const continueWatching = continueRes.status === "fulfilled" ? continueRes.value : [];

  // Hero: lanjut nonton (data Redis, difilter per portal) atau unggulan portal.
  const resume = continueWatching.find((p) => p.type === portal) ?? null;
  const fallbackAnime = popularAnime[0] ?? animeOngoing[0] ?? null;
  const fallbackDonghua = donghuaLatest[0] ?? donghuaOngoing[0] ?? null;

  return (
    <div className="relative">
      {/* Gradient biru lembut di area atas (mengikuti mood mockup, tema Cyronime) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(120% 40% at 50% 0%, rgba(33,150,243,.14), transparent 70%), var(--bg)",
        }}
        aria-hidden="true"
      />

      <div className="relative" style={{ paddingTop: 16 }}>
        {/* Header: brand + akses profil */}
        <header className="flex items-center justify-between" style={{ padding: "0 var(--page-x)" }}>
          <Link href="/" className="font-display flex items-center gap-2 text-[22px] font-bold tracking-tight text-white">
            <span className="material-symbols-rounded" style={{ fontSize: 26, color: "var(--blue)" }}>
              movie
            </span>
            Cyro<span style={{ color: "var(--blue)" }}>nime</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <PortalSwitch portal={portal} />
            <Link
              href="/profile"
              aria-label="Profil"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-smooth"
              style={{ background: "var(--surface)" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: "var(--text)" }}>
                person
              </span>
            </Link>
          </div>
        </header>

        <div style={{ marginTop: 14 }}>
          <SearchBox />
        </div>

        <div className="space-y-8" style={{ marginTop: "var(--section-gap)" }}>
          {/* ===== HERO: Lanjut nonton / unggulan portal ===== */}
          {resume ? (
            <HomeHeroResume item={resume} />
          ) : portal === "anime" && fallbackAnime ? (
            <HomeHeroFeatured item={fallbackAnime} />
          ) : portal === "donghua" && fallbackDonghua ? (
            <HomeHeroFeaturedDonghua item={fallbackDonghua} />
          ) : null}

          {portal === "anime" ? (
            <>
              {/* ===== Anime Terbaru ===== */}
              {animeOngoing.length ? (
                <HomeRail
                  title="Anime Terbaru"
                  note="Episode terbaru yang sedang tayang."
                  href="/anime"
                >
                  {animeOngoing.slice(0, 15).map((a, i) => (
                    <div key={a.animeId} className="shrink-0 snap-start" style={{ width: 128 }}>
                      <AnimeCard anime={a} priority={i < 4} />
                    </div>
                  ))}
                </HomeRail>
              ) : (
                <EmptyFallback />
              )}

              {/* ===== Terpopuler: ranking by skor asli ===== */}
              {popularAnime.length ? <HomeRanking items={popularAnime.slice(0, 5)} /> : null}
            </>
          ) : (
            <>
              {/* ===== Donghua Terbaru ===== */}
              {donghuaLatest.length ? (
                <HomeRail title="Donghua Terbaru" note="Rilisan donghua terbaru." href="/donghua">
                  {donghuaLatest.slice(0, 15).map((d, i) => (
                    <div key={d.slug} className="shrink-0 snap-start" style={{ width: 128 }}>
                      <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} priority={i < 4} />
                    </div>
                  ))}
                </HomeRail>
              ) : (
                <EmptyFallback />
              )}

              {/* ===== Donghua Ongoing ===== */}
              {donghuaOngoing.length ? (
                <HomeRail title="Donghua Ongoing" note="Donghua yang masih tayang." href="/donghua">
                  {donghuaOngoing.slice(0, 15).map((d, i) => (
                    <div key={d.slug} className="shrink-0 snap-start" style={{ width: 128 }}>
                      <DonghuaCard donghua={d} href={`/donghua/${d.slug}`} />
                    </div>
                  ))}
                </HomeRail>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- HERO: lanjut nonton (data asli Redis) ---------- */
function HomeHeroResume({ item }: { item: WatchProgress }) {
  const known =
    typeof item.position === "number" && typeof item.duration === "number" && item.duration > 0;
  const percent = known
    ? Math.min(100, Math.round(((item.position as number) / (item.duration as number)) * 100))
    : null;

  return (
    <section aria-label="Lanjut nonton" style={{ padding: "0 var(--page-x)" }}>
      <div className="relative overflow-hidden rounded-card" style={{ height: 330, background: "var(--surface)" }}>
        {item.poster ? (
          <Image src={item.poster} alt={item.title} fill priority sizes="480px" className="object-cover" />
        ) : null}

        {/* Es mencair (dekoratif, tema blue) */}
        <div className="hero-ice" aria-hidden="true" />
        <div className="hero-edge" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="38,0 43,9 39,18 45,29 41,41 47,52 42,63 48,74 43,86 46,100" />
          </svg>
          {item.episode ? (
            <span
              className="absolute rounded-chip font-bold"
              style={{ left: "48%", top: "44%", padding: "4px 10px", fontSize: 12, background: "var(--blue)", color: "#fff" }}
            >
              EP {item.episode}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%] bg-gradient-to-t from-black/95 to-transparent" />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-white"
          style={{ padding: "7px 14px", background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
        >
          Lanjut nonton
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-white">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "#C9D4E6" }}>
            {item.episode ? `Episode ${item.episode}` : "Lanjutkan dari terakhir kali"}
            {percent !== null ? ` · ${percent}% ditonton` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Link
              href={`/${item.type}/watch/${item.episodeId}`}
              className="flex h-11 items-center gap-2 rounded-chip pl-4 pr-5 text-[15px] font-bold text-white transition-smooth active:scale-95"
              style={{ background: "var(--blue-grad)" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 22 }}>
                play_arrow
              </span>
              Lanjutkan
            </Link>
            <Link
              href={`/${item.type}/${item.contentId}`}
              aria-label="Detail"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-smooth"
              style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
            >
              <span className="material-symbols-rounded text-white" style={{ fontSize: 22 }}>
                info
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HERO: unggulan (anime populer) bila belum ada history ---------- */
function HomeHeroFeatured({
  item,
}: {
  item: { animeId: string; title: string; poster: string; score: string | null; episodes: number | null };
}) {
  return (
    <section aria-label="Sedang populer" style={{ padding: "0 var(--page-x)" }}>
      <div className="relative overflow-hidden rounded-card" style={{ height: 330, background: "var(--surface)" }}>
        {item.poster ? (
          <Image src={item.poster} alt={item.title} fill priority sizes="480px" className="object-cover" />
        ) : null}

        <div className="hero-ice" aria-hidden="true" />
        <div className="hero-edge" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="38,0 43,9 39,18 45,29 41,41 47,52 42,63 48,74 43,86 46,100" />
          </svg>
          {item.score ? (
            <span
              className="absolute rounded-chip font-bold"
              style={{ left: "48%", top: "44%", padding: "4px 10px", fontSize: 12, background: "var(--blue)", color: "#fff" }}
            >
              {item.score}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%] bg-gradient-to-t from-black/95 to-transparent" />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-white"
          style={{ padding: "7px 14px", background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
        >
          Sedang populer
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-white">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "#C9D4E6" }}>
            {item.score ? `Skor ${item.score}` : "Tonton sekarang"}
            {item.episodes ? ` · ${item.episodes} eps` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Link
              href={`/anime/${item.animeId}`}
              className="flex h-11 items-center gap-2 rounded-chip pl-4 pr-5 text-[15px] font-bold text-white transition-smooth active:scale-95"
              style={{ background: "var(--blue-grad)" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 22 }}>
                play_arrow
              </span>
              Mulai Nonton
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HERO: unggulan donghua (portal donghua) ---------- */
function HomeHeroFeaturedDonghua({ item }: { item: DonghuaListItem }) {
  return (
    <section aria-label="Donghua terbaru" style={{ padding: "0 var(--page-x)" }}>
      <div className="relative overflow-hidden rounded-card" style={{ height: 330, background: "var(--surface)" }}>
        {item.poster ? (
          <Image src={item.poster} alt={item.title} fill priority sizes="480px" className="object-cover" />
        ) : null}

        <div className="hero-ice" aria-hidden="true" />
        <div className="hero-edge" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="38,0 43,9 39,18 45,29 41,41 47,52 42,63 48,74 43,86 46,100" />
          </svg>
          {item.currentEpisode ? (
            <span
              className="absolute rounded-chip font-bold"
              style={{ left: "48%", top: "44%", padding: "4px 10px", fontSize: 12, background: "var(--maroon)", color: "#fff" }}
            >
              {item.currentEpisode}
            </span>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%] bg-gradient-to-t from-black/95 to-transparent" />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-white"
          style={{ padding: "7px 14px", background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)" }}
        >
          Donghua terbaru
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-white">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "#C9D4E6" }}>
            {item.status ?? "Donghua"}
            {item.sub ? ` · ${item.sub}` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Link
              href={`/donghua/${item.slug}`}
              className="flex h-11 items-center gap-2 rounded-chip pl-4 pr-5 text-[15px] font-bold text-white transition-smooth active:scale-95"
              style={{ background: "var(--blue-grad)" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 22 }}>
                play_arrow
              </span>
              Mulai Nonton
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section rail dengan judul gaya mockup ---------- */
function HomeRail({
  title,
  note,
  href,
  children,
}: {
  title: string;
  note?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between" style={{ padding: "0 var(--page-x)", marginBottom: 4 }}>
        <h2 className="font-display text-[20px] font-bold tracking-tight text-white">{title}</h2>
        {href ? (
          <Link href={href} className="text-[13px] font-semibold" style={{ color: "var(--blue)" }}>
            Lihat Semua
          </Link>
        ) : null}
      </div>
      {note ? (
        <p className="mb-3 text-[12px]" style={{ padding: "0 var(--page-x)", color: "var(--text-2)" }}>
          {note}
        </p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: "none", scrollSnapType: "x proximity" }}>
        {children}
      </div>
    </section>
  );
}

/* ---------- Ranking "Terpopuler" (skor asli, bukan viewers palsu) ---------- */
function HomeRanking({
  items,
}: {
  items: { animeId: string; title: string; poster: string; score: string | null; episodes: number | null }[];
}) {
  return (
    <section aria-label="Terpopuler" style={{ padding: "0 var(--page-x)" }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <h2 className="font-display text-[20px] font-bold tracking-tight text-white">Terpopuler</h2>
      </div>
      <p className="mb-3 text-[12px]" style={{ color: "var(--text-2)" }}>
        Diurutkan dari skor tertinggi.
      </p>
      <ol className="grid gap-2.5">
        {items.map((a, i) => (
          <li key={a.animeId}>
            <Link
              href={`/anime/${a.animeId}`}
              className="grid items-center gap-3 rounded-app transition-smooth"
              style={{
                gridTemplateColumns: "44px 56px 1fr auto",
                background: "var(--surface)",
                padding: "10px 14px 10px 6px",
              }}
            >
              <span className={`rank-num ${i === 0 ? "top" : ""}`}>{i + 1}</span>
              <span className="relative overflow-hidden rounded-app" style={{ width: 56, height: 74, background: "var(--surface-3)" }}>
                {a.poster ? (
                  <Image src={a.poster} alt={a.title} fill sizes="56px" className="object-cover" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-white">{a.title}</span>
                <span className="mt-0.5 block text-[12px]" style={{ color: "var(--text-2)" }}>
                  {a.score ? `Skor ${a.score}` : "Tamat"}
                  {a.episodes ? ` · ${a.episodes} eps` : ""}
                </span>
              </span>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: "var(--text-2)" }} aria-hidden="true">
                chevron_right
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EmptyFallback() {
  return (
    <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
      Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
    </p>
  );
}
