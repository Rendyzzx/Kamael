# API Inspection Report

Dokumentasi hasil inspeksi langsung (bukan asumsi). Semua endpoint di bawah sudah diuji pada 5 Okt 2026.

## Sumber: Sanka Vollerei Anime API (https://www.sankavollerei.web.id/anime/)

Base URL: `https://www.sankavollerei.web.id`

### Catatan penting (terverifikasi)

- **Rate limit: 30 request/menit.** Melebihi batas = warning, lalu BAN PERMANEN. Karena itu semua fetch harus di-cache/di-revalidate, dan client tidak boleh menghujani API langsung.
- **Anti-bot:** request tanpa User-Agent browser ditolak oleh sistem "Plana AI Detector" (response HTML peringatan + ancaman ban IP). Semua fetch dari server HARUS mengirim User-Agent browser.
- Envelope umum response Otakudesu: `{ status, creator, statusCode, statusMessage, message, ok, data, pagination }`. `pagination` = `{ currentPage, hasPrevPage, prevPage, hasNextPage, nextPage, totalPages }` (kadang null).
- Response Donghua (Anichin) TIDAK punya envelope `data` seragam; key bervariasi per endpoint (`latest_release`, `completed_donghua`, `ongoing_donghua`, `latest_donghua`, atau `data` array mentah).
- `href` pada item Donghua TIDAK menyertakan prefix `/anime` (contoh: `/donghua/detail/x`), padahal route API sebenarnya `/anime/donghua/detail/x`. Perlu normalisasi di adapter. `href` Otakudesu sudah menyertakan `/anime/...`.

### Otakudesu (Anime) — base `/anime`

| Endpoint | Response terverifikasi |
|---|---|
| `GET /anime/home` | `data.ongoing.animeList[15]`, `data.completed.animeList[10]`. Item: `{title, poster, episodes, releaseDay, latestReleaseDate, animeId, href, otakudesuUrl}` (+`score`, `lastReleaseDate` untuk completed) |
| `GET /anime/ongoing-anime?page=N` | `data.animeList[25]` + `pagination` (totalPages 5 saat test) |
| `GET /anime/complete-anime?page=N` | `data.animeList` + `pagination` |
| `GET /anime/genre` | `data.genreList[36]` `{title, genreId, href}` |
| `GET /anime/genre/:slug?page=N` | `data.animeList[15]` (+`studios`, `season`, `synopsis.paragraphs`, `genreList`) + `pagination` |
| `GET /anime/search/:keyword` | `data.animeList[]` `{title, poster, status, score, animeId, genreList[]}` — TANPA pagination |
| `GET /anime/anime/:slug` | Detail: `{title, poster, japanese, score, producers, type, status, episodes, duration, aired, studios, batch, synopsis:{paragraphs[],connections[]}, genreList[], episodeList[{title,eps,date,episodeId,href}], recommendedAnimeList[]}` |
| `GET /anime/episode/:slug` | `{title, animeId, releaseTime, defaultStreamingUrl, hasPrevEpisode, prevEpisode, hasNextEpisode, nextEpisode, server:{qualities:[{title, serverList:[{title, serverId, href}]}]}, downloadUrl:{qualities:[]}, info:{credit,encoder,duration,type,genreList[],episodeList[]}}` |
| `GET /anime/server/:serverId` | `data.url` → URL embed (contoh: `https://odvidhide.com/embed/...`) |
| `GET /anime/schedule` | Jadwal per hari (tidak dipakai di v1) |
| `GET /anime/batch/:slug` | Link download batch (tidak dipakai di v1) |

Field penting pada item list anime bervariasi antar endpoint (ongoing punya `releaseDay`, genre-listing punya `season`/`synopsis`) → adapter harus union type + optional fields.

### Donghua (Anichin) — base `/anime/donghua`

| Endpoint | Response terverifikasi |
|---|---|
| `GET /anime/donghua/home/:page?` | `latest_release[20]` (item episode: `{title, slug, poster, status, type, current_episode, href→episode}`), `completed_donghua[48]` (href→detail) |
| `GET /anime/donghua/ongoing/:page?` | `ongoing_donghua[30]` `{title, slug, poster, status, type, sub, href→detail, anichinUrl}` |
| `GET /anime/donghua/completed/:page?` | `completed_donghua[30]` (sama) |
| `GET /anime/donghua/latest/:page?` | `latest_donghua[30]` (sama) |
| `GET /anime/donghua/search/:keyword/:page?` | `data[]` array mentah `{title, slug, poster, status, type, sub, href→detail, anichinUrl}` |
| `GET /anime/donghua/genres` | `data[102]` `{name, slug, href, anichinUrl}` |
| `GET /anime/donghua/genres/:slug/:page?` | `data[10]` array mentah (item sama dengan listing) |
| `GET /anime/donghua/detail/:slug` | `{title, alter_title, poster, cover, trailer, rating, followers, studio, network, released, duration, type, episodes_count, season, country, subber, author, released_on, updated_on, first_episode{}, latest_episode{}, genres[], tags[], synopsis, batch_download, recommendations[], episodes_list[40] {episode, episode_number, sub, release_date, slug, href→episode}}` |
| `GET /anime/donghua/episode/:slug` | `{episode, streaming:{main_url:{name,url}, servers:[{name,url}]}, download_url{360p/480p/720p/1080p:{Mirrored}}, donghua_details{}, navigation:{all_episodes, previous_episode, next_episode}, episodes_list[]}` |
| `GET /anime/donghua/az-list/:slug/:page?` | Donghua per huruf |
| `GET /anime/donghua/seasons/:year?` | Per tahun |
| `GET /anime/donghua/schedule` | Jadwal |

Tidak ada field `pagination` pada endpoint Donghua — navigasi halaman hanya lewat path `/:page` (page berikut tidak diketahui pasti; UI harus pakai "Next" saja dengan cek hasil kosong).

### Streaming (terverifikasi)

- Otakudesu: episode → `defaultStreamingUrl` (embed langsung) + `server.qualities[].serverList[]` → wajib resolve via `GET /anime/server/:serverId` → `data.url` (URL embed: vidhide, mega, odcdn, dst). Bukan file video langsung → player = iframe embed.
- Donghua: episode → `streaming.servers[{name,url}]` URL embed langsung (ok.ru, rumble, rpmvid, short.icu, rubyvidhub, listeamed, videoplayer.vip). Juga iframe embed.
- Tidak ada direct .mp4/.m3u8 dari kedua sumber → implementasi player: iframe + fallback UI "Server tidak dapat diputar / Coba lagi / Server lain".

### Sumber Otakudesu alternatif

API Sanga ini sendiri SUDAH menjadi scraper Otakudesu (data dari otakudesu.blog, terlihat dari field `otakudesuUrl`). Tidak perlu sumber Otakudesu terpisah; endpoint root `/anime/...` = Otakudesu.

## Keputusan adapter

1. `lib/api/client.ts` — fetch wrapper: User-Agent browser, timeout 15s, revalidate per-endpoint, error bertipe.
2. `lib/api/otakudesu.ts` — adapter anime, normalisasi union fields.
3. `lib/api/donghua.ts` — adapter donghua, normalisasi href (`/donghua/x` → API path), mapping field beda nama (rating/score, episodeList/episodes_list, dll).
4. Semua perubahan struktur API cukup diperbaiki di adapter — UI hanya mengenal type hasil normalisasi.
