import Image from "next/image";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SearchBox from "@/components/navbar/SearchBox";
import PortalSwitch from "@/components/portal/PortalSwitch";
import type { Portal } from "@/components/portal/portal-events";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { getAnimeHome, getCompletedAnime, getOngoingAnime } from "@/lib/api/anime";
import { getLatestDonghua, getOngoingDonghua } from "@/lib/api/donghua";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getOnboardingStatus } from "@/lib/redis/onboarding";
import { readVisitorId } from "@/lib/visitor";
import { listProgress, type WatchProgress } from "@/lib/redis/watching";
import type { DonghuaListItem } from "@/types/donghua";

/**
 * "/" punya DUA peran, dibedakan oleh state onboarding (Redis
 * onboarding:{id}, lihat src/lib/redis/onboarding.ts):
 *
 * 1. Onboarding BELUM selesai (completed && type belum terpenuhi) -> render
 *    <OnboardingFlow /> (splash -> disclaimer -> intro -> carousel ->
 *    LOGIN Google wajib -> pilih tontonan), fullscreen, TANPA redirect ke
 *    route lain. Alur ala aplikasi native: masuk dulu, baru pilih.
 * 2. Onboarding SUDAH selesai -> dashboard trending sesuai `type` yang
 *    dipilih (hero, lanjut nonton, rail, ranking) — keputusan user Okt
 *    2026 bahwa Home harus tetap jadi dashboard, bukan sekadar gerbang.
 *
 * Redis TIDAK terjangkau saat membaca status -> fail-open ke dashboard
 * portal "anime" (TIDAK memaksa onboarding tampil) supaya web tidak macet
 * saat Redis down.
 */
export const revalidate = 600;

export default async function HomePage() {
  const userId = await getAuthenticatedUserId();
  const visitorId = userId ? null : await readVisitorId();
  const id = userId ?? visitorId;
  let status = id
    ? await getOnboardingStatus(id)
    : { value: { accepted: false, completed: false, type: null as Portal | null }, redisOk: true };

  // User yang BARU login: checkpoint "accept disclaimer" mungkin masih
  // tersimpan di bawah visitor ID (dari sesi pra-login). Merge supaya
  // mereka resume di langkah Pilih Tontonan, bukan mengulang disclaimer.
  if (userId && status.redisOk) {
    const preLogin = await readVisitorId();
    if (preLogin) {
      const visitorStatus = await getOnboardingStatus(preLogin);
      if (visitorStatus.redisOk && visitorStatus.value.accepted) {
        status = { ...status, value: { ...status.value, accepted: true } };
      }
    }
  }

  const onboardingDone = status.redisOk ? Boolean(status.value.completed && status.value.type) : true;

  if (!onboardingDone) {
    // Poster latar kartu "Pilih Tontonan" (langkah 5): 1 poster terbaru
    // tiap kategori. Gagal -> kartu tetap tampil dengan gradient saja.
    const [animePoster, donghuaPoster] = await Promise.all([
      getOngoingAnime(1)
        .then((res) => res.items[0]?.poster ?? null)
        .catch(() => null),
      getLatestDonghua(1)
        .then((items) => items[0]?.poster ?? null)
        .catch(() => null),
    ]);

    return (
      <OnboardingFlow
        initial={{
          accepted: status.value.accepted,
          completed: status.value.completed,
          type: status.value.type,
        }}
        authed={Boolean(userId)}
        animePoster={animePoster}
        donghuaPoster={donghuaPoster}
      />
    );
  }

  const portal: Portal = status.value.type ?? "anime";

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
      <div className="relative" style={{ paddingTop: 16 }}>
        {/* Header: brand + akses profil */}
        <header className="flex items-center justify-between" style={{ padding: "0 var(--page-x)" }}>
          <Link href="/" className="font-display flex items-center gap-2 text-[21px] font-bold tracking-tight text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {/* Logo: matahari senja di garis horizon — digambar tangan, tidak simetris */}
              <path d="M4.5 17.6h15.2" stroke="var(--peach)" stroke-width="1.75" stroke-linecap="round"/>
              <path d="M12 4.9c3.9 0 6.7 2.7 6.7 6.4 0 2.5-1.6 4.7-3.9 5.7" stroke="var(--amber)" stroke-width="1.75" stroke-linecap="round" fill="none"/>
              <path d="M12 4.9c-3.9 0-6.7 2.7-6.7 6.4 0 2.5 1.6 4.7 3.9 5.7" stroke="var(--sunset)" stroke-width="1.75" stroke-linecap="round" fill="none"/>
              <path d="M12 13.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z" fill="var(--amber)"/>
            </svg>
            Cyronime
          </Link>
          <div className="flex items-center gap-2.5">
            <PortalSwitch portal={portal} />
            <Link
              href="/profile"
              aria-label="Profil"
              className="flex h-11 w-11 items-center justify-center transition-smooth"
              style={{ background: "var(--surface)", borderRadius: "var(--radius-md)" }}
            >
              <Icon name="profile" size={22} />
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
                  {donghuaOngoing.slice(0, 15).map((d) => (
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

        {/* Cahaya senja: hangat di bawah, bukan abu-abu */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%]"
          style={{ background: "linear-gradient(180deg, transparent, rgba(42,27,37,.82) 62%, #2A1B25 100%)" }}
          aria-hidden="true"
        />

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
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.episode ? `Episode ${item.episode}` : "Lanjutkan dari terakhir kali"}
            {percent !== null ? `, sudah ${percent}%` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Button
              variant="play"
              href={`/${item.type}/watch/${item.episodeId}`}
              aria-label={`Lanjut nonton episode ${item.episode ?? ""}`}
            >
              <Icon name="play" size={20} />
              {item.episode ? `Lanjut nonton eps ${item.episode}` : "Lanjut nonton"}
            </Button>
            <Link
              href={`/${item.type}/${item.contentId}`}
              aria-label={`Detail ${item.title}`}
              className="flex h-11 w-11 items-center justify-center transition-smooth"
              style={{ background: "rgba(31,18,25,.55)", backdropFilter: "blur(8px)", borderRadius: "var(--radius-md)" }}
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%]"
          style={{ background: "linear-gradient(180deg, transparent, rgba(42,27,37,.82) 62%, #2A1B25 100%)" }}
          aria-hidden="true"
        />

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
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.score ? `Skor ${item.score}` : "Tonton sekarang"}
            {item.episodes ? `, ${item.episodes} eps` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Button variant="play" href={`/anime/${item.animeId}`}>
              <Icon name="play" size={20} />
              Tonton sekarang
            </Button>
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%]"
          style={{ background: "linear-gradient(180deg, transparent, rgba(42,27,37,.82) 62%, #2A1B25 100%)" }}
          aria-hidden="true"
        />

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
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.status ?? "Donghua"}
            {item.sub ? `, ${item.sub}` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Button variant="play" href={`/donghua/${item.slug}`}>
              <Icon name="play" size={20} />
              Tonton sekarang
            </Button>
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
          <Link href={href} className="text-[13px] font-semibold underline" style={{ color: "var(--peach)", textUnderlineOffset: 3, textDecorationColor: "rgba(255,211,161,.4)" }}>
            Lihat semua
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
