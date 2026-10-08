# ANDROID_SETUP — Cyronime Android App

Panduan arsitektur, setup, dan build aplikasi Android Cyronime. Aplikasi
Android memakai **backend/API yang sama dengan Web** — tidak ada backend
streaming kedua, tidak ada database terpisah.

```
                    CYRONIME BACKEND (Next.js / Vercel)
                    - Route Handlers API (/api/*)
                    - Upstash Redis (user, prefs, device, maintenance)
                    - Scaper provider (AnimeIn / Anichin) — TIDAK diubah
                           |
              +------------+------------+
              |                         |
         CYRONIME WEB             ANDROID APP (native)
         (existing, tidak         - login Google (session Auth.js)
          diubah drastis)         - data via API yang sama
                                   - FCM untuk notification
                                   - maintenance & versi via API
                                   - Telegram bot = admin control (backend)
```

## Keputusan arsitektur (hasil inspeksi, bukan asumsi)

Project Web sudah punya: Next.js 15 App Router, API Route Handlers berbentuk
JSON murni, Auth.js session JWT stateless, Redis untuk data user, PWA dengan
service worker. Dua opsi client Android:

| | TWA / WebView wrapper | **Native Kotlin + Compose (DIPILIH)** |
|---|---|---|
| Streaming embed (vidhide dll.) | jalan apa adanya | WebView khusus untuk sumber embed; Media3 ExoPlayer untuk HLS/MP4 |
| Notifikasi FCM native | tidak praktis | ya (Firebase) |
| Deep link cyronime:// + App Links | terbatas | ya |
| Rasa aplikasi native | terbatas | penuh |
| Duplikasi logika | tidak | **tidak juga** — logika tetap di backend; client hanya UI + API call |

**Keputusan: native app (Kotlin, Jetpack Compose) yang konsumsi API yang
sama.** Alasan utama: streaming = embed pihak ketiga di iframe; di Android,
sumber embed tetap harus dirender WebView (tak bisa "dimurnikan" native),
sedangkan sumber HLS/MP4 langsung jalan di ExoPlayer. Logika streaming,
scraping, cache, dan authorization SEMUA tetap di backend — app hanya
menampilkan hasil API. Web tidak diubah.

Ketentuan dari inspeksi yang WAJIB dipegang client:

1. **Jangan pernah hardcode API sumber** (AnimeIn/Anichin). Semua lewat
   `/api/*` milik backend (rate limit 30 req/menit di sumber dilindungi
   dua lapis cache di backend).
2. **Session = cookie Auth.js.** Login Google dilakukan lewat Chrome Custom
   Tab ke `/api/auth/signin/google`, cookie session disimpan di
   CookieManager app. Logout = `signOut` + hapus cookie.
3. **Register tidak ada** — auth existing hanya Google OAuth (+ provider
   tester QA yang nonaktif di produksi). App tidak menambah registrasi.
4. **Maintenance** dicek via `/api/system/status?platform=android` saat
   startup & kembali ke foreground — JANGAN polling tiap detik.
5. **Versi** dicek via `/api/app/version` saat startup.

## Package name

**`id.my.id.cyronime.app`**

Jangan dibuat random. Jika Anda sudah punya project Android dengan package
name berbeda, JANGAN langsung mengganti: package name mempengaruhi
`applicationId` Gradle, namespace Kotlin, class `R`, `google-services.json`
(terikat pada package name di Firebase), dan App Links. Migrasi urutannya:
(1) buat project Firebase baru / tambah Android app dengan package final,
(2) rename `applicationId` + `namespace` + package folder, (3) regenerasi
`google-services.json`, (4) uninstall app lama dari device sebelum install
build baru (signature beda package = dua app terpisah).

## Setup Firebase Cloud Messaging (FCM)

1. **Buat Firebase project**: [console.firebase.google.com](https://console.firebase.google.com) → *Add project* (nama bebas, mis. `cyronime`).
2. **Tambahkan Android app**: ikon Android → package name **`id.my.id.cyronime.app`** (harus sama persis dengan `applicationId`).
3. **Download `google-services.json`** → letakkan di `android/app/` (folder module utama). File ini aman di dalam APK (hanya berisi ID publik project), tapi jangan di-commit ke repo publik; tambahkan ke `.gitignore` bila repo publik.
4. **Aktifkan Firebase Cloud Messaging**: Project settings → Cloud Messaging → pastikan *Firebase Cloud Messaging API (V1)* aktif (API legacy sudah deprecated).
5. **Firebase Admin SDK untuk backend** (yang mengirim push): Project settings → *Service accounts* → **Generate new private key** → file JSON berisi `project_id`, `client_email`, `private_key`.
6. Set environment variables **backend** (Vercel — bukan APK):
   ```
   FIREBASE_PROJECT_ID=cyronime        # dari file JSON
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@cyronime.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Karakter `\n` dalam private key ditulis literal `"\n"` (sudah ditangani
   backend). Backend Cyronime memanggil FCM HTTP v1 langsung — TIDAK
   memakai firebase-admin SDK, jadi tidak ada dependency tambahan.
7. **Jangan pernah** menaruh private key Admin SDK di dalam APK — kunci itu
   bisa mengirim push ke SEMUA user. Hanya `google-services.json` (public)
   yang masuk APK.

## Client Android (sudah dibuat)

Repo client native: **[Rendyzzx/Cyronime-Android](https://github.com/Rendyzzx/Cyronime-Android)** (Kotlin + Jetpack Compose, package `id.my.id.cyronime.app`). Client mengikuti semua kontrak di bawah; endpoint detail/episode/me ditambahkan di commit `ece204c`:

- `GET /api/anime/{slug}` — detail anime (JSON)
- `GET /api/anime/episode/{episode}` — episode anime (kualitas + serverId)
- `GET /api/donghua/{slug}` dan `GET /api/donghua/episode/{slug}` — padanan donghua
- `GET /api/me` — info akun dari session

## Endpoint yang dipakai Android (kontrak backend, semua sudah aktif)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/auth/signin/google` (Custom Tab) | GET | Login Google → cookie session |
| `/api/auth/signout` | GET/POST | Logout |
| `/api/system/status?platform=android` | GET | Maintenance Android + pesan + perkiraan selesai |
| `/api/app/version` | GET | latestVersion / minimumVersion / downloadUrl / forceUpdate |
| `/api/search?q=...&type=...` | GET | Pencarian anime/donghua |
| `/api/anime/list`, `/api/donghua/list` | GET | Listing + pagination |
| `/api/anime/server/[serverId]` | GET | Resolve server player (embed/HLS) |
| `/api/watch/progress` | GET/POST/DELETE | Continue watching + history |
| `/api/history`, `/api/favorites` | GET/POST/DELETE | History & favorite |
| `/api/devices` | POST/PATCH/DELETE | Registrasi/update/hapus FCM token |
| `/api/notifications/prefs` | GET/PUT | Preferensi notifikasi user (sinkron Web/Android) |

Alur device token FCM di app:

1. Setelah login + dapat FCM token → `POST /api/devices` `{platform:"android", token, deviceId}`.
2. `onNewToken` (token berubah) → POST lagi yang sama (upsert, tidak duplikat).
3. Logout → `DELETE /api/devices?deviceId=...` (opsional; token user lain tidak terganggu).
4. App kembali foreground → `PATCH /api/devices` (refresh lastSeenAt).

## Payload notification (FCM)

```json
{
  "message": {
    "notification": { "title": "Episode Baru!", "body": "One Piece episode terbaru sudah tersedia." },
    "data": { "type": "episode", "animeId": "one-piece", "deepLink": "https://cyronime.web.id/anime/one-piece" },
    "android": { "priority": "high" }
  }
}
```

App membaca `data` (bukan mempercayai isi title/body untuk logika):
`type`, `animeId`, `episodeId`, `deepLink`, `image`. Deep link TIDAK pernah
melewati authorization — membuka halaman tetap butuh session login; payload
hanya alamat tujuan.

## Deep linking

Dua bentuk, keduanya menuju route Web yang sama:

- Custom scheme: `cyronime://anime/{slug}` (intent-filter `android:scheme="cyronime"`)
- App Links (disarankan): `https://cyronime.web.id/anime/{slug}` dengan
  `android:autoVerify="true"` + asset statements file `/.well-known/assetlinks.json`
  (tambahkan di backend saat app rilis). Terinstall → buka app; tidak → buka website.

## Build

```bash
# Debug APK (test device fisik — FCM tidak jalan di emulator tanpa Play Services)
./gradlew assembleDebug          # -> app/build/outputs/apk/debug/app-debug.apk

# Release APK (distribusi langsung)
./gradlew assembleRelease        # perlu signingConfig keystore sendiri

# AAB untuk Play Store
./gradlew bundleRelease          # -> app/build/outputs/bundle/release/app-release.aab
```

## Update aplikasi (cara admin)

1. Naikkan `APP_LATEST_VERSION` (dan bila wajib, `APP_MINIMUM_VERSION`) di
   Vercel environment variables — tidak perlu deploy ulang code.
2. Behavior app saat startup (sudah dikontrak di `/api/app/version`):
   - `currentVersion < minimumVersion` → "Versi aplikasi Anda sudah tidak
     didukung." + tombol **Update Sekarang** (tidak bisa dipakai tanpa update).
   - `currentVersion < latestVersion` → "Update tersedia." (opsional, bisa ditutup).
   - `forceUpdate: true` → paksa update untuk semua versi (KEADAAN DARURAT saja).
3. Kirim pengumuman lewat bot Telegram `/notify` → kategori "Update aplikasi"
   (user yang mematikan preferensi ini tidak menerima — sesuai setting user).

## Ganti Firebase project

1. Buat project baru, tambahkan Android app (package name sama), download
   `google-services.json` baru.
2. Ganti `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
   di Vercel.
3. Device harus re-register token (app lama token lama otomatis dibersihkan
   backend saat FCM menolak token lama).

## Offline & error handling yang WAJIB ada di app

- Tanpa internet → "Tidak ada koneksi internet." + tombol coba lagi.
- API timeout / server down → "Server Cyronime sedang tidak dapat diakses."
- Session expired (401 dari API) → arahkan ke login ulang.
- `maintenance: true` dari `/api/system/status` → layar maintenance
  (pesan + perkiraan dari backend), TIDAK crash.

## Testing checklist Android

- [ ] Login Google sukses → session dipakai semua request API.
- [ ] Logout → data & cookie bersih, `DELETE /api/devices` dipanggil.
- [ ] Streaming HLS/MP4 (ExoPlayer) dan embed (WebView) jalan.
- [ ] Search, detail, episode, history, favorite terbaca sama seperti Web
      (akun sama → data sama).
- [ ] Notifikasi FCM diterima saat app di background; klik membuka deep link
      yang sesuai; user tanpa session → diarahkan login dulu.
- [ ] Toggle preferensi di Web → berpengaruh ke broadcast untuk Android.
- [ ] Maintenance web ON, android OFF → app tetap bisa dipakai; status page
      Web menampilkan maintenance.
- [ ] Maintenance android ON → app menampilkan layar maintenance.
- [ ] Versi minimum dinaikkan → app versi lama menampilkan forced update.
- [ ] Mode pesawat → pesan offline, tidak crash.
