# Telegram Bot Admin — Setup & Panduan

Bot Telegram adalah **control panel admin** Cyronime: maintenance, status
sistem, dan broadcast notification. Bot ini BUKAN bot publik — hanya numeric
Telegram user ID yang terdaftar di `ADMIN_TELEGRAM_IDS` yang bisa memakai
command. Username TIDAK dipakai untuk authorization.

## 1. Membuat bot

1. Chat [@BotFather](https://t.me/botfather) di Telegram.
2. Kirim `/newbot`, ikuti langkahnya (nama bebas, mis. `Cyronime Admin Bot`).
3. Simpan token yang diberikan (format `123456789:AAxxxx...`) — ini nilai
   `TELEGRAM_BOT_TOKEN`. **Jangan pernah commit token ke repo.**

## 2. Mengambil numeric user ID Anda

ID admin yang diisi adalah **angka user ID**, bukan username:

- Chat [@userinfobot](https://t.me/userinfobot) — balas otomatis dengan
  `Id: 123456789`. Itu nilai yang dicari.
- Alternatif: kirim pesan apa pun ke bot Anda, lalu buka
  `https://api.telegram.org/bot<TOKEN>/getUpdates` dan cari
  `"from":{"id": ...}`.

## 3. Environment variables (Vercel → Settings → Environment Variables)

```
TELEGRAM_BOT_TOKEN=123456789:AAxxxx...
ADMIN_TELEGRAM_IDS=123456789,987654321
TELEGRAM_WEBHOOK_SECRET=<string acak minimal 16 karakter>
```

Beberapa admin dipisah koma. Bot token hanya di server — tidak pernah
diekspos ke frontend/APK.

## 4. Memasang webhook

Webhook dipasang SEKALI (per domain). Ganti `<TOKEN>` dan `<SECRET>`:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://cyronime.web.id/api/telegram/webhook&secret_token=<SECRET>"
```

Cek: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` — harus menunjukkan
URL Anda dan `last_error_message` kosong.

Jika ganti domain/proyek: jalankan `setWebhook` lagi dengan URL baru, atau
`deleteWebhook` dulu bila ingin kembali ke mode polling.

## 5. Daftar command

| Command | Fungsi |
|---|---|
| `/start`, `/help` | Salam + daftar command |
| `/status` | Status WEB/ANDROID, global maintenance, pesan, versi |
| `/maintenance` | Lihat state maintenance saat ini |
| `/maintenance web on\|off` | Maintenance khusus **Web** |
| `/maintenance android on\|off` | Maintenance khusus **Android** |
| `/maintenance all on\|off` | Kedua platform sekaligus |
| `/maintenance_on` | Shortcut: maintenance global ON |
| `/maintenance_off` | Shortcut: matikan semua maintenance |
| `/maintenance_message teks \| perkiraan` | Ubah pesan + perkiraan selesai (bagian setelah `\|` opsional) |
| `/notify` | Wizard broadcast: Judul → Isi → Target platform → Kategori → konfirmasi |
| `/broadcast Judul \| Isi` | Broadcast cepat (semua device, kategori pengumuman) + konfirmasi |
| `/users` | Jumlah user terdaftar & device per platform |
| `/version` | Versi Web & Android (latest/minimum) |

## 6. Contoh sesi

```
Anda  : /maintenance_on
Bot   : Maintenance berhasil diaktifkan.
       WEB: MAINTENANCE
       ANDROID: MAINTENANCE

Anda  : /maintenance android off
Bot   : Maintenance Android dimatikan.
       WEB: MAINTENANCE
       ANDROID: ONLINE

Anda  : /notify
Bot   : 1/4 — Kirim Judul notification:
Anda  : Episode Baru!
Bot   : 2/4 — Kirim Isi notification:
Anda  : One Piece episode terbaru sudah tersedia.
Bot   : 3/4 — Pilih Target platform: [Semua device] [Android] [Web]
Bot   : 4/4 — Pilih Kategori: [Episode baru] [Anime favorit] [Pengumuman] ...
Bot   : Anda akan mengirim notification ke 1.245 device. [CONFIRM] [CANCEL]
Anda  : (menekan CONFIRM)
Bot   : Broadcast terkirim: 1.240/1.245 device.
```

Broadcast TIDAK pernah terkirim hanya karena command dipanggil — selalu ada
konfirmasi dengan jumlah device tujuan. Setiap broadcast tercatat di Redis
list `notifications:log` (judul, isi, target, kategori, statistik kirim).

## 7. Keamanan (ringkas)

- Authorization memakai **numeric user ID** dari field `from.id` update
  Telegram — diverifikasi server-side. Username bisa dipalsukan, ID sulit.
- Webhook menolak semua request tanpa header `X-Telegram-Bot-Api-Secret-Token`
  yang cocok dengan `TELEGRAM_WEBHOOK_SECRET` (perbandingan konstan-waktu).
- Rate limit command: 30/menit per admin; callback (tombol) ikut dibatasi.
- Non-admin yang mengirim command hanya menerima "Anda tidak memiliki akses
  ke bot ini" — tidak ada state, tidak ada eksekusi.
- Bot tidak bisa digunakan untuk melewati authorization aplikasi: bypass
  maintenance untuk admin WEB dilakukan lewat session Google + env
  `ADMIN_EMAILS`, terpisah dari bot.

## 8. Testing checklist

- [ ] User ID yang TIDAK ada di `ADMIN_TELEGRAM_IDS` → ditolak.
- [ ] Admin terdaftar → semua command berfungsi.
- [ ] `/maintenance web on` → web menampilkan halaman maintenance, Android
      (via `/api/system/status?platform=android`) tetap `maintenance: false`.
- [ ] `/maintenance all on` → keduanya maintenance.
- [ ] `/maintenance_off` → semuanya kembali online.
- [ ] `/notify` menampilkan jumlah device sebelum konfirmasi; CANCEL tidak
      mengirim apa pun.
- [ ] `/status` mencerminkan perubahan dalam ≤ 30 detik (cache TTL pendek).

## 9. Mengganti bot

1. Set `TELEGRAM_BOT_TOKEN` ke token bot baru (ID admin biasanya tetap).
2. `deleteWebhook` di bot lama, `setWebhook` di bot baru (langkah 4).
3. Tidak ada data state yang tergantung bot lama (state wizard hanya TTL 10
   menit di Redis).
