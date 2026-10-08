import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic, Figtree } from "next/font/google";
import BottomNav from "@/components/navbar/BottomNav";
import SplashScreen from "@/components/ui/SplashScreen";
import AuthProvider from "@/components/providers/AuthProvider";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import SwUpdateReload from "@/components/pwa/SwUpdateReload";
import PageTransition from "@/components/nav/PageTransition";
import ScrollRestore from "@/components/nav/ScrollRestore";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getOnboardingStatus } from "@/lib/redis/onboarding";
import { readOnbCookie } from "@/lib/onboarding-cookie";
import { readVisitorId } from "@/lib/visitor";
import type { Portal } from "@/components/portal/portal-events";
import "./globals.css";

// Zen Maru Gothic: judul — ujung huruf membulat hangat, cocok tema senja.
const display = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

// Figtree: teks — jelas & ramah di ukuran kecil, panjang baris nyaman.
const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cyronime.web.id";
const SITE_NAME = "Cyronime";
const DEFAULT_TITLE = "Cyronime: streaming anime dan donghua sub Indonesia";
const DEFAULT_DESC =
  "Nonton anime dan donghua subtitle Indonesia. Lanjut dari episode terakhir, simpan serial favorit, dan kelola dua portal dalam satu aplikasi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-96.png", type: "image/png", sizes: "96x96" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Meta iOS: web app installable full screen + status bar translucent
  // (Next men-generate apple-mobile-web-app-capable dsb. dari sini).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cyronime",
    // Splash screen iOS (ukuran perangkat umum; bg gelap + logo di tengah).
    startupImage: [
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    type: "website",
    siteName: SITE_NAME,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
  },
};

/* viewport: cover notch (safe-area dipakai header/nav via env()). */
export const viewport: Viewport = {
  themeColor: "#212237",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Status onboarding dipakai dua hal:
  // 1. `portal` -> tab tunggal yang ditampilkan BottomNav di halaman netral
  //    (Search/Profil/Settings/Favorit/History).
  // 2. `onboardingDone` -> BottomNav disembunyikan di "/" selama alur
  //    first-time masih berjalan di sana.
  //
  // PERFORMA (revisi Okt 2026): cookie penanda `onb` (disetel oleh POST
  // /api/onboarding saat `type` tersimpan) membuat navigasi berikutnya
  // TIDAK membaca Redis sama sekali. Redis hanya dibaca saat kunjungan
  // pertama / setelah cookie dihapus (logout, ulangi onboarding).
  // Redis tak terjangkau -> fail-open (onboardingDone=true, portal="anime")
  // supaya nav tidak hilang/macet saat Redis down.
  const onbCookie = await readOnbCookie();
  let portal: Portal = "anime";
  let onboardingDone = true;
  if (onbCookie) {
    portal = onbCookie;
  } else {
    const userId = await getAuthenticatedUserId();
    const id = userId ?? (await readVisitorId());
    const status = id
      ? await getOnboardingStatus(id)
      : { value: { accepted: false, completed: false, type: null as Portal | null }, redisOk: true };
    portal = status.value.type ?? "anime";
    onboardingDone = status.redisOk ? Boolean(status.value.completed && status.value.type) : true;
  }

  return (
    <html lang="id" className={`dark ${display.variable} ${body.variable}`}>
      <body>
        <AuthProvider>
          <SplashScreen />
          <ScrollRestore />
          {/* Shell mobile-first (min 360px); di layar lebar dibungkus 480px
              di tengah dengan background gelap pekat di luarnya (lihat body/html). */}
          <div className="app-shell flex min-h-screen flex-col">
            <main className="flex-1 pb-24">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          <BottomNav defaultPortal={portal} onboardingDone={onboardingDone} />
          <InstallPrompt />
          <SwUpdateReload />
        </AuthProvider>
      </body>
    </html>
  );
}
