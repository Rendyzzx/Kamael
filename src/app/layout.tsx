import type { Metadata } from "next";
import { Bricolage_Grotesque, Roboto } from "next/font/google";
import BottomNav from "@/components/navbar/BottomNav";
import SettingsFab from "@/components/navbar/SettingsFab";
import SplashScreen from "@/components/ui/SplashScreen";
import AuthProvider from "@/components/providers/AuthProvider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "Cyronime";
const DEFAULT_TITLE = "Cyronime — Streaming Anime & Donghua";
const DEFAULT_DESC =
  "Nonton anime dan donghua subtitle Indonesia dengan tampilan modern, cepat, dan ringan — Anime dan Donghua dua area terpisah dalam satu platform.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  applicationName: SITE_NAME,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`dark ${bricolage.variable} ${roboto.variable}`}>
      <body>
        <AuthProvider>
          <SplashScreen />
          {/* Shell mobile-first (min 360px); di layar lebar dibungkus 480px
              di tengah dengan background gelap pekat di luarnya (lihat body/html). */}
          <div className="app-shell flex min-h-screen flex-col">
            <main className="flex-1 pb-24">{children}</main>
          </div>
          <SettingsFab />
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
