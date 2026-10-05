/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "otakudesu.blog" },
      { protocol: "https", hostname: "anichin.moe" },
      { protocol: "https", hostname: "www.otakudesu.blog" },
      { protocol: "https", hostname: "www.anichin.moe" },
    ],
    // Poster dari API kadang besar & berat; optimasi tetap diaktifkan.
    formats: ["image/webp"],
  },
};

export default nextConfig;
