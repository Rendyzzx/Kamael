import type { MetadataRoute } from "next";

/**
 * Sitemap Cyronime. Hanya route publik statis — daftar slug dinamis sengaja
 * tidak dimasukkan karena mengambil seluruh slug dari API sumber ber-arti
 * ratusan request yang membahayakan rate limit 30 req/menit (ban permanen).
 * Watch URL juga tidak dimasukkan (prompt #23: jangan membabi buta).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const now = new Date();

  return ["", "/anime", "/donghua", "/search"].map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "hourly" : "daily",
    priority: route === "" ? 1 : 0.8,
  }));
}
