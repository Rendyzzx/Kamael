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

const nextConfig = {
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
