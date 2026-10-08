import withSerwistInit from "@serwist/next";

/**
 * @type {import('next').NextConfig}
 *
 * Serwist: SW di-build dari src/app/sw.ts -> public/sw.js (jangan di-commit;
 * sudah di .gitignore). Dev mode: SW otomatis nonaktif (disable di dev) supaya
 * tidak meng-cache perubahan lokal.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/**
 * Security headers — dipasang untuk SEMUA route.
 *
 * CSP disusun hati-hati agar TIDAK merusak fitur yang ada:
 * - frame-src https:  → player memakai iframe embed pihak ketiga (vidhide,
 *   ok.ru, dsb.) yang host-nya dinamis per episode; tidak bisa di-whitelist
 *   statis. Ini kompromi yang disadari (documented trade-off).
 * - img-src https:    → poster dimuat langsung dari CDN eksternal berbagai
 *   host (optimasi dimatikan karena Cloudflare memblokir Vercel).
 * - connect-src https:→ hls.js mengambil segmen .m3u8/.ts lintas origin.
 * - script/style 'unsafe-inline' → Next.js menyuntik bootstrap inline;
 *   tanpa nonce per-request ini konsekuensi standar (nonce bisa jadi
 *   penyempurnaan berikutnya, tapi berisiko merusak hidrasi bila salah).
 * - frame-ancestors 'self' → situs ini TIDAK bisa di-iframe situs lain
 *   (clickjacking protection).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      // Font ikon Material Symbols dimuat via stylesheet Google Fonts
      // (lihat src/app/layout.tsx) — izin sempit dua domain resminya.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' blob: https:",
      "frame-src https:",
      "frame-ancestors 'self'",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()" },
  // HSTS hanya berdampak lewat HTTPS — aman untuk dev http lokal.
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const nextConfig = {
  // Hilangkan X-Powered-By (pengungkapan teknologi, tidak ada manfaat).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "otakudesu.blog" },
      { protocol: "https", hostname: "anichin.moe" },
      { protocol: "https", hostname: "www.otakudesu.blog" },
      { protocol: "https", hostname: "www.anichin.moe" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    // Aset lokal sudah webp teroptimasi manual. Poster eksternal TIDAK boleh
    // lewat optimizer Vercel: server Vercel diblokir Cloudflare otakudesu.blog
    // (403 -> 502 semua poster). Dengan unoptimized, poster dimuat langsung
    // oleh browser user (IP rumahan) yang tidak diblokir.
    formats: ["image/avif", "image/webp"],
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
