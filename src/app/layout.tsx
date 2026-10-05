import type { Metadata } from "next";
import Navbar from "@/components/navbar/Navbar";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Streaming Anime & Donghua",
    template: "%s | ShinStream",
  },
  description:
    "Platform streaming anime dan donghua dengan tampilan sederhana dan nyaman.",
  openGraph: {
    title: "Streaming Anime & Donghua",
    description:
      "Platform streaming anime dan donghua dengan tampilan sederhana dan nyaman.",
    type: "website",
    siteName: "ShinStream",
  },
  twitter: {
    card: "summary_large_image",
    title: "Streaming Anime & Donghua",
    description:
      "Platform streaming anime dan donghua dengan tampilan sederhana dan nyaman.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark">
      <body>
        <Navbar />
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-surface-800 py-6 text-center text-xs text-zinc-600">
          Data bersumber dari API publik. ShinStream tidak menyimpan video di server.
        </footer>
      </body>
    </html>
  );
}
