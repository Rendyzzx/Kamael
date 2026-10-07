import type { MetadataRoute } from "next";

/**
 * Web App Manifest — PWA installable (Lighthouse PWA).
 * Icon "any" (rounded, transparan di luar) + "maskable" (square penuh,
 * glyph dalam safe zone 80%) + favicon. Splash iOS lihat metadata layout
 * (appleWebApp.startupImage).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cyronime: streaming anime dan donghua",
    short_name: "Cyronime",
    description:
      "Nonton anime dan donghua subtitle Indonesia. Lanjut dari episode terakhir dan simpan serial favorit.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "id",
    dir: "ltr",
    categories: ["entertainment", "video"],
    theme_color: "#2A1B25",
    background_color: "#2A1B25",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
