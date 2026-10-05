# ShinStream — Streaming Anime & Donghua

Website streaming anime dan donghua dengan dua ekosistem yang benar-benar
terpisah, dibangun untuk deploy ke Vercel.

- **Anime** → data dari Otakudesu (via Sanka Vollerei Anime API)
- **Donghua** → data dari Anichin (via Sanka Vollerei Anime API, modul donghua)

Hasil inspeksi API terdokumentasi lengkap di [`docs/API-INSPECTION.md`](docs/API-INSPECTION.md).

## Stack

- Next.js 15 (App Router) + TypeScript
- React 19, Server Components untuk semua halaman (client component hanya
  untuk navbar/search/player)
- Tailwind CSS (dark mode default)
- Route Handlers sebagai proxy API (menghindari CORS, rate limit, dan
  anti-bot pada API sumber)

## Struktur

```
src/
├── app/
│   ├── page.tsx                  # Home: hero + Anime Terbaru + Donghua Terbaru
│   ├── anime/
│   │   ├── page.tsx              # Listing anime (tab, genre, pagination)
│   │   ├── [slug]/page.tsx       # Detail anime + daftar episode
│   │   └── watch/[episode]/      # Player + prev/next + episode list
│   ├── donghua/
│   │   ├── page.tsx              # Listing donghua (tab, genre, pagination)
│   │   ├── [slug]/page.tsx       # Detail donghua + daftar episode
│   │   └── watch/[episode]/      # Player + prev/next + episode list
│   ├── search/                   # Hasil pencarian dipisah Anime/Donghua
│   └── api/
│       ├── search/               # Proxy pencarian gabungan (debounced client)
│       └── anime/server/[id]/    # Proxy resolve serverId → URL embed
├── components/                   # navbar, cards, player, ui
├── lib/api/                      # client.ts + adapter otakudesu.ts + donghua.ts
├── lib/utils/                    # validasi input (slug, page, query)
└── types/                        # tipe hasil normalisasi adapter
```

## Menjalankan

```bash
cp .env.example .env.local   # opsional; default sudah berfungsi
npm install
npm run dev
```

## Environment variables

| Variable | Keterangan |
|---|---|
| `API_BASE_URL` | Base URL API sumber (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | URL publik situs, untuk metadata canonical/OG |

Tidak ada API key yang dibutuhkan; API sumber gratis.

## Deploy ke Vercel

1. Push project ke GitHub/GitLab/Bitbucket.
2. Import di Vercel, framework **Next.js** terdeteksi otomatis.
3. (Opsional) set `NEXT_PUBLIC_SITE_URL` ke domain produksi.
4. Deploy. Tidak butuh server/VPS/database — semua data diambil dari API
   eksternal dan di-cache oleh Next.js.

## Catatan penting

- **Rate limit API sumber: 30 req/menit.** Semua fetch lewat adapter dengan
  `next: { revalidate }` agar tidak menghujani API (cache 5–60 menit,
  genre 24 jam).
- **Anti-bot API sumber**: fetch tanpa User-Agent browser ditolak. Adapter
  selalu mengirim UA browser — ini juga alasan semua request harus lewat
  server/proxy, bukan langsung dari browser user.
- **Streaming = URL embed pihak ketiga** (vidhide, ok.ru, rumble, dll), bukan
  file video langsung. Player memakai iframe dengan fallback "Server tidak
  dapat diputar / Coba lagi / Server lain". Video tidak pernah diunduh atau
  disimpan di server.
