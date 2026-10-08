import Image from "next/image";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SearchBox from "@/components/navbar/SearchBox";
import PortalSwitch from "@/components/portal/PortalSwitch";
import type { Portal } from "@/components/portal/portal-events";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import Icon from "@/components/ui/Icon";
import BrandLogo from "@/components/ui/BrandLogo";
import { getAnimeHome, getPopularAnime, getOngoingAnime } from "@/lib/api/anime";
import type { AnimeListItem } from "@/types/anime";
import { getLatestDonghua, getOngoingDonghua } from "@/lib/api/donghua";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getOnboardingStatus } from "@/lib/redis/onboarding";
import { readOnbCookie } from "@/lib/onboarding-cookie";
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
  // PERFORMA: cookie `onb` -> onboarding pasti selesai, portal = nilai
  // cookie, TANPA round-trip Redis (lihat lib/onboarding-cookie).
  const onbCookie = await readOnbCookie();
  if (onbCookie) return <DashboardPage portal={onbCookie} gate={null} />;

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

  return (
    <DashboardPage
      portal={portal}
      gate={
        status.redisOk
          ? null
          : {
              initial: {
                accepted: status.value.accepted,
                completed: status.value.completed,
                type: status.value.type,
              },
              authed: Boolean(userId),
            }
      }
    />
  );
}

/* Dashboard "/" — dipakai jalur cookie (cepat, tanpa Redis) dan jalur
   kunjungan pertama (baca Redis, lihat atas). `gate` != null hanya saat
   Redis down pada kunjungan pertama: OnboardingGate memeriksa mirror
   localStorage dan memaksa alur onboarding bagi user yang belum selesai
   (bug Okt 2026: user nyangkut di home anime saat Redis down). */
async function DashboardPage({
  portal,
  gate,
}: {
  portal: Portal;
  gate: {
    initial: { accepted: boolean; completed: boolean; type: Portal | null };
    authed: boolean;
  } | null;
}) {
  const userId = await getAuthenticatedUserId();

  // Hanya fetch data portal aktif; portal lain dilewati (Promise.resolve(null)).
  const skip = () => Promise.resolve(null);
  const [animeHomeRes, animePopularRes, donghuaLatestRes, donghuaOngoingRes, continueRes] =
    await Promise.allSettled([
      portal === "anime" ? getAnimeHome() : skip(),
      portal === "anime" ? getPopularAnime(1) : skip(),
      portal === "donghua" ? getLatestDonghua(1) : skip(),
      portal === "donghua" ? getOngoingDonghua(1) : skip(),
      userId ? listProgress(userId) : Promise.resolve([] as WatchProgress[]),
    ]);

  const animeHome =
    portal === "anime" && animeHomeRes.status === "fulfilled" ? animeHomeRes.value : null;
  const animePopular =
    portal === "anime" && animePopularRes.status === "fulfilled" ? animePopularRes.value : null;
  const donghuaLatest: DonghuaListItem[] =
    portal === "donghua" && donghuaLatestRes.status === "fulfilled"
      ? (donghuaLatestRes.value ?? [])
      : [];
  const donghuaOngoing: DonghuaListItem[] =
    portal === "donghua" && donghuaOngoingRes.status === "fulfilled"
      ? (donghuaOngoingRes.value ?? [])
      : [];
  const animeOngoing = animeHome?.ongoing ?? [];
  // Terpopuler: sudah terurut views dari AnimeIn (skor tidak tersedia di provider).
  const popularAnime: AnimeListItem[] = animePopular?.items ?? [];
  const continueWatching = continueRes.status === "fulfilled" ? continueRes.value : [];

  // Hero: lanjut nonton (data Redis, difilter per portal) atau unggulan portal.
  const resume = continueWatching.find((p) => p.type === portal) ?? null;
  const fallbackAnime = popularAnime[0] ?? animeOngoing[0] ?? null;
  const fallbackDonghua = donghuaLatest[0] ?? donghuaOngoing[0] ?? null;

  const content = (
    <>
    <div className="relative">
      <div className="relative" style={{ paddingTop: 16 }}>
        {/* Header: brand + akses profil */}
        <header className="flex items-center justify-between" style={{ padding: "0 var(--page-x)" }}>
          <Link href="/" aria-label="Cyronime">
            <BrandLogo size={21} />
          </Link>
          <div className="flex items-center gap-2.5">
            <PortalSwitch portal={portal} />
            <Link
              href="/profile"
              aria-label="Profil"
              className="flex h-11 w-11 items-center justify-center transition-smooth"
              style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", color: "var(--text-2)" }}
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
    </>
  );

  if (!gate) return content;

  return (
    <OnboardingGate
      redisOk={false}
      initial={gate.initial}
      authed={gate.authed}
      animePoster={animeOngoing[0]?.poster ?? popularAnime[0]?.poster ?? null}
      donghuaPoster={donghuaLatest[0]?.poster ?? donghuaOngoing[0]?.poster ?? null}
    >
      {content}
    </OnboardingGate>
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
          style={{ background: "linear-gradient(180deg, rgba(33,34,55,0) 0%, rgba(33,34,55,.6) 50%, rgba(33,34,55,.96) 100%)" }}
          aria-hidden="true"
        />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-[var(--text)]"
          style={{ padding: "7px 14px", background: "rgba(33,34,55,.88)", border: "1px solid var(--line-strong)" }}
        >
          Lanjut nonton
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-[var(--text)]">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.episode ? `Episode ${item.episode}` : "Lanjutkan dari terakhir kali"}
            {percent !== null ? `, sudah ${percent}%` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <Link
              href={`/${item.type}/watch/${item.episodeId}`}
              aria-label={`Lanjut nonton episode ${item.episode ?? ""}`}
              className="btn-hero"
            >
              <span className="btn-hero-circle" aria-hidden="true">
                <Icon name="play" size={17} />
              </span>
              {item.episode ? `Lanjut eps ${item.episode}` : "Lanjut nonton"}
            </Link>
            <Link
              href={`/${item.type}/${item.contentId}`}
              aria-label={`Detail ${item.title}`}
              className="flex h-10 w-10 items-center justify-center transition-smooth"
              style={{ background: "rgba(33,34,55,.88)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", color: "var(--text-2)" }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>
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
          style={{ background: "linear-gradient(180deg, rgba(33,34,55,0) 0%, rgba(33,34,55,.6) 50%, rgba(33,34,55,.96) 100%)" }}
          aria-hidden="true"
        />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-[var(--text)]"
          style={{ padding: "7px 14px", background: "rgba(33,34,55,.88)", border: "1px solid var(--line-strong)" }}
        >
          Sedang populer
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-[var(--text)]">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.score ? `Skor ${item.score}` : "Tonton sekarang"}
            {item.episodes ? `, ${item.episodes} eps` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <Link href={`/anime/${item.animeId}`} className="btn-hero">
              <span className="btn-hero-circle" aria-hidden="true">
                <Icon name="play" size={17} />
              </span>
              Tonton sekarang
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[62%]"
          style={{ background: "linear-gradient(180deg, rgba(33,34,55,0) 0%, rgba(33,34,55,.6) 50%, rgba(33,34,55,.96) 100%)" }}
          aria-hidden="true"
        />

        <span
          className="absolute left-4 top-4 z-[5] rounded-chip text-[12px] font-semibold text-[var(--text)]"
          style={{ padding: "7px 14px", background: "rgba(33,34,55,.88)", border: "1px solid var(--line-strong)" }}
        >
          Donghua terbaru
        </span>

        <div className="absolute inset-x-5 bottom-5 z-[5]">
          <h1 className="font-display line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-tight text-[var(--text)]">
            {item.title}
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--peach)" }}>
            {item.status ?? "Donghua"}
            {item.sub ? `, ${item.sub}` : ""}
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <Link href={`/donghua/${item.slug}`} className="btn-hero">
              <span className="btn-hero-circle" aria-hidden="true">
                <Icon name="play" size={17} />
              </span>
              Tonton sekarang
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
        <h2 className="font-display text-[20px] font-bold tracking-tight text-[var(--text)]">{title}</h2>
        {href ? (
          <Link href={href} className="text-[13px] font-semibold underline" style={{ color: "var(--peach)", textUnderlineOffset: 3, textDecorationColor: "var(--line-strong)" }}>
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
  items: AnimeListItem[];
}) {
  return (
    <section aria-label="Terpopuler" style={{ padding: "0 var(--page-x)" }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <h2 className="font-display text-[20px] font-bold tracking-tight text-[var(--text)]">Terpopuler</h2>
      </div>
      <p className="mb-3 text-[12px]" style={{ color: "var(--text-2)" }}>
        {items[0]?.views != null
          ? "Diurutkan dari jumlah penonton."
          : "Diurutkan dari skor tertinggi."}
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
                <span className="block truncate text-[14px] font-semibold text-[var(--text)]">{a.title}</span>
                <span className="mt-0.5 block text-[12px]" style={{ color: "var(--text-2)" }}>
                  {a.views
                    ? `${formatViews(a.views)} tayangan`
                    : a.score
                      ? `Skor ${a.score}`
                      : "Populer"}
                  {a.episodes ? `, ${a.episodes} eps` : ""}
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

/** 15834723 -> "15,8 jt". Data asli views AnimeIn, bukan skor karangan. */
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return String(n);
}

function EmptyFallback() {
  return (
    <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
      Data sedang tidak tersedia. Silakan coba beberapa saat lagi.
    </p>
  );
}
