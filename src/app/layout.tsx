import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import BottomNav from "@/components/navbar/BottomNav";
import SplashScreen from "@/components/ui/SplashScreen";
import AuthProvider from "@/components/providers/AuthProvider";
import "./globals.css";

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
    <html lang="id" className="dark">
      <body>
        <AuthProvider>
          <SplashScreen />
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-4 py-6 pb-20 sm:py-8 md:pb-8">
            {children}
          </main>
          <footer className="hidden border-t border-surface-800 py-6 text-center text-xs text-zinc-600 md:block">
            Data bersumber dari API publik. Cyronime tidak menyimpan video di server.
          </footer>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
