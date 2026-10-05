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
- **Onboarding first-time experience ala aplikasi native**: alur (Splash -> Disclaimer -> Intro maskot -> Carousel 3 fitur -> **LOGIN Google WAJIB** -> Pilih Tontonan) dirender INLINE di "/" lewat `<OnboardingFlow />` (`src/components/onboarding/`), state machine client-side dengan transisi fade/slide (menghormati `prefers-reduced-motion`) dan dukungan swipe di carousel. TIDAK ADA opsi tamu — semua pengguna wajib punya akun Google. Login SELALU sebelum pilihan anime/donghua. Progres tersimpan di Redis `onboarding:{id}` (`{ accepted, completed, type }`; identitas = user ID login atau visitor ID di cookie httpOnly, 1 tahun) via `/api/onboarding` (GET/POST/DELETE, validasi strict). Checkpoint yang disimpan: accept disclaimer dan pilihan tontonan (= selesai). User yang baru login otomatis merge checkpoint visitor pra-login -> langsung resume di langkah Pilih Tontonan. User yang sudah login tidak pernah melihat splash/signin lagi.
- **Gerbang auth global (`src/middleware.ts`)**: semua halaman app (/anime, /donghua, /favorites, /history, /profile, /settings, /search) hanya bisa diakses setelah login — belum login redirect ke "/" (yang menampilkan alur onboarding). "/" sendiri, /privacy, /login, /api, dan aset PWA di luar gerbang.
- **Logout reset total (Settings)**: tombol Logout menghapus state onboarding Redis (user ID + visitor ID) DAN cookie visitor sebelum `signOut({ redirectTo: "/" })` — login berikutnya melewati alur lengkap dari awal (splash -> disclaimer -> ... -> pilih tontonan).
  - "/" mengecek status onboarding di server: belum `completed && type` -> render `<OnboardingFlow />` (fullscreen, bottom nav & FAB disembunyikan). Sudah selesai -> "/" langsung jadi dashboard trending (hero, lanjut nonton, rail, ranking) sesuai `type`.
  - Redis tak terjangkau saat membaca status -> fail-open ke dashboard portal "anime" (tidak memaksa onboarding tampil ulang).
  - Bottom nav hanya menampilkan tab portal aktif (Anime ATAU Donghua, tidak pernah berdua); ganti portal lewat tombol swap di header atau Settings > "Ulangi Onboarding" (hapus key, onboarding tampil dari splash lagi). URL dalam seperti /anime/xxx tidak pernah terhalang oleh onboarding.
  - Ilustrasi maskot & fitur (`public/onboarding/*.png`) adalah aset original milik Cyronime, bukan aset aplikasi lain.
- **PWA installable + rasa aplikasi native**:
  - **Manifest** (`src/app/manifest.ts` -> `/manifest.webmanifest`): standalone, portrait, theme/background `#121316`, ikon 192/512 "any" + 192/512 "maskable" (safe zone 80%) + apple-touch-icon 180 — semua aset original di `public/icons/` (dibuat via SVG+sharp, tidak dari aplikasi lain). Splash screen iOS (`public/splash/*.png`, 6 ukuran perangkat umum) lewat `metadata.appleWebApp.startupImage`.
  - **Service worker** (Serwist v9): `src/app/sw.ts` di-build jadi `public/sw.js` (TIDAK di-commit, ada di .gitignore). Precache aset build & seluruh `/public`, runtime caching default @serwist/next (navigasi network-first, statis cache-first), offline fallback `public/offline.html` untuk request dokumen. SW nonaktif di dev (`disable: NODE_ENV === "development"`).
  - **Tanpa kesan browser**: `viewport-fit=cover` + safe-area (`env(safe-area-inset-*)`) untuk bottom nav/FAB/banner install; `100dvh` untuk tinggi viewport dinamis; overscroll/pull-to-refresh dimatikan (`overscroll-behavior-y: none`); tap highlight transparan; `touch-action: manipulation` (double-tap zoom off, pinch tetap boleh); `user-select: none` untuk elemen kontrol (konten teks tetap bisa di-copy); efek press `scale: .97` pada tombol/link di perangkat sentuh; skeleton shimmer + `BlurImage` (blur 12px -> tajam saat onLoad) untuk poster kartu.
  - **Navigasi ala native**: transisi antarhalaman slide+fade (`.page-enter`, key=pathname di `<PageTransition>`); posisi scroll tiap tab tersimpan (in-memory map di `<ScrollRestore>`, rute watch selalu mulai dari atas); bottom nav & tombol sheet memberi haptic ringan (`navigator.vibrate`, diam di iOS/reduced-motion); filter genre (`GenreSheet`) dan daftar episode (`EpisodeSheet`) dibuka sebagai bottom sheet yang bisa di-drag ke bawah untuk menutup (`BottomSheet`); prefetch link default App Router.
  - **Halaman watch**: player 16:9 sticky di atas (konten men-scroll di bawahnya) — `.app-shell` pakai `overflow-x: clip` supaya sticky tidak rusak; saat fullscreen: orientasi dikunci landscape (`screen.orientation.lock`, bila tersedia) + Screen Wake Lock agar layar tidak mati, keduanya dilepas otomatis saat keluar (`useFullscreenLock` di `PlayerShell`); atribut iframe embed tetap minimal: `allow="autoplay; fullscreen; encrypted-media; picture-in-picture"` + `referrerPolicy="no-referrer"`.
  - **Banner install**: `<InstallPrompt>` menangkap `beforeinstallprompt` (Android) dan menampilkan panduan manual Share -> "Tambahkan ke Layar Utama" (iOS); sekali ditolak, hilang selama sesi.
  - **Aksesibilitas & performa**: semua animasi (page-enter, sheet, press) mati otomatis di `prefers-reduced-motion`; Lighthouse PWA: manifest valid + SW dengan precache & offline fallback -> installable & offline-ready.
- **Ketahanan**: jika Redis error/down, halaman utama, anime, donghua, dan
  search tetap berfungsi; hanya fitur akun yang menampilkan fallback.
