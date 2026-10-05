# Cyronime — Streaming Anime & Donghua

Aplikasi streaming anime & donghua mobile-first yang dibangun dengan Next.js 15
(App Router), TypeScript, Tailwind CSS, dan siap deploy ke Vercel.

- **Anime** → data dari Otakudesu (via Sanka Vollerei Anime API)
- **Donghua** → data dari Anichin (via Sanka Vollerei Anime API, modul donghua)
- **Akun & aktivitas** → Google Login (Auth.js) + Redis (Upstash) untuk
  Continue Watching, Watch History, Favorites, dan cache API

Hasil inspeksi API terdokumentasi lengkap di [`docs/API-INSPECTION.md`](docs/API-INSPECTION.md).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript — Server Components untuk semua halaman
- Tailwind CSS — dark theme, desain compact & cinematic
- Auth.js (NextAuth v5) — Google OAuth, session JWT
- Upstash Redis (HTTP, serverless-friendly) — data user + cache API
- Route Handlers sebagai proxy API (menghindari CORS dan rate limit API sumber)

## Struktur

```
src/
├── app/
│   ├── page.tsx                  # Home: featured, continue watching, rows horizontal
│   ├── anime/                    # Listing, detail, watch
│   ├── donghua/                  # Listing, detail, watch
│   ├── search/                   # Hasil pencarian dipisah Anime/Donghua
│   ├── login/  profile/  settings/  history/  favorites/
│   ├── sitemap.ts  robots.ts
│   └── api/
│       ├── auth/[...nextauth]/   # Auth.js (Google)
│       ├── watch/progress/       # Continue watching + history (protected)
│       ├── history/  favorites/ # Protected
│       └── search/  anime/server/
├── components/                   # navbar (top + bottom mobile), cards, player, auth
├── lib/
│   ├── api/                      # client.ts + adapter anime.ts + donghua.ts
│   ├── auth/                     # konfigurasi Auth.js + helper session
│   ├── redis/                    # client, cache, watching, history, favorites
│   └── utils/                    # validasi input
└── types/
```

## Menjalankan

```bash
cp .env.example .env.local   # isi minimal AUTH_SECRET; Redis & Google opsional
npm install
npm run dev
```

Tanpa Redis dan Google credential, website tetap berjalan penuh untuk
browsing; fitur akun (history/favorites/continue watching) otomatis
nonaktif dan cache memakai Next.js saja.

## Environment variables

| Variable | Keterangan |
|---|---|
| `API_BASE_URL` | Base URL API sumber (server-side only) |
| `REDIS_URL` / `REDIS_TOKEN` | Upstash Redis REST (server-side only) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (server-side only) |
| `AUTH_SECRET` | Secret penandatangan session Auth.js |
| `NEXT_PUBLIC_SITE_URL` | URL publik situs, untuk metadata canonical/OG/sitemap |

Lihat `.env.example` untuk contoh dan catatan redirect URI Google.

## Deploy ke Vercel

1. Import repo di Vercel (framework Next.js terdeteksi otomatis).
2. Set environment variables sesuai tabel di atas.
3. Google OAuth: tambahkan `https://<domain>/api/auth/callback/google` ke
   authorized redirect URI, lalu set `AUTH_TRUST_HOST=true`.
4. Deploy.

## Catatan penting

- **Rate limit API sumber: 30 req/menit** (ban permanen jika dilanggar). Semua
  fetch lewat adapter dengan dua lapis cache: Redis (jika dikonfigurasi, TTL
  2-15 menit sesuai jenis data) lalu cache Next.js.
- **Anti-bot API sumber**: semua request server mengirim User-Agent browser.
- **Streaming = URL embed pihak ketiga** (vidhide, ok.ru, dll) di dalam iframe.
  Karena itu posisi video tidak dapat dibaca; Continue Watching merekam
  episode terakhir, bukan detik ke berapa. API progress tetap menerima
  `position`/`duration` penuh untuk player native di masa depan.
- **Isolasi data user**: semua endpoint activity mengambil userId dari session
  server-side, tidak pernah dari body client.
- **Portal pembuka**: `/portal` adalah halaman TERPISAH untuk memilih Anime/Donghua pertama kali (bukan bagian dari Home). Pilihan disimpan di Redis (`pref:{id}`; identitas = user ID login atau visitor ID di cookie httpOnly, 1 tahun) via `/api/preference`. `/` (Home) mengecek Redis di server: belum pernah memilih -> redirect ke `/portal`; sudah pernah -> Home langsung menampilkan dashboard trending (hero, lanjut nonton, rail, ranking) sesuai portal itu. Jika Redis tak terjangkau, Home fail-open ke "anime" (tidak bolak-balik ke /portal). Bottom nav hanya menampilkan tab portal aktif (Anime ATAU Donghua, tidak pernah berdua); ganti portal lewat tombol swap di header atau Settings > "Tampilkan portal lagi". URL dalam seperti /anime/xxx tidak pernah terhalang.
- **Ketahanan**: jika Redis error/down, halaman utama, anime, donghua, dan
  search tetap berfungsi; hanya fitur akun yang menampilkan fallback.
