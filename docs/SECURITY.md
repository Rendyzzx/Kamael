# Security Hardening — Cyronime

Dokumen ini merangkum lapisan keamanan Cyronime, hasil audit 2026-10, dan
batasan yang disadari (trade-off). Security dijalankan DI SERVER — semua
validasi frontend dianggap bisa dibypass.

## Lapisan yang aktif

| Area | Implementasi |
|---|---|
| Auth | Auth.js v5 (Google OAuth), JWT, session maxAge 7 hari, cookie HttpOnly+Secure+SameSite (Auth.js default) |
| Authorization | Semua endpoint user-scoped memanggil `getAuthenticatedUserId()` (session server-side). User ID TIDAK PERNAH dari body client. 401 belum login, 403 origin salah |
| IDOR | Semua key Redis dibangun dari `{userId}:{...}` — user A tidak bisa membaca data user B dengan mengganti ID |
| CSRF | Lapisan 1: cookie SameSite=Lax. Lapisan 2: origin guard di `src/middleware.ts` (403 bila Origin/Referer lintas origin) untuk semua mutasi `/api/*` kecuali `/api/auth/*` (NextAuth punya CSRF token sendiri) |
| Rate limiting | `src/lib/rate-limit.ts` — Redis (Upstash) fixed window, fallback in-memory. Per-endpoint: search 30/mnt, list 60/mnt, embed-check 20/mnt, report 10/mnt, user reads 60/mnt, user writes 30-60/mnt, tester login 10/15mnt |
| Input validation | `src/lib/utils/validation.ts` (slug regex, page clamp 1-500, search ≤80 char), cap panjang field (contentId ≤120, title ≤200, poster ≤500 + wajib http(s)), body JSON strict per route |
| SSRF | `/api/embed-check`: URL awal + TIAP hop redirect divalidasi `isSafeEmbedUrl` (redirect diikuti manual, max 5 hop). Blok localhost/IP privat/CGNAT/link-local dalam semua notasi (desimal, hex, oktal, singkat), IPv6 ULA/link-local/mapped, host satu-label, protokol non-http |
| Security headers | `next.config.mjs`: CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, COOP, CORP. X-Powered-By dimatikan |
| Cache | Respons user-scoped (history/favorites/progress) selalu `Cache-Control: private, no-store`. Respons publik (list/search/embed-check) cache edge singkat dengan s-maxage |
| Secrets | Semau via env server-side; tidak ada NEXT_PUBLIC selain SITE_URL. Tidak ada kode/key hardcoded |
| Login tester | Provider hanya diregistrasi bila TESTER_CODE terisi DAN (dev ATAU ENABLE_TESTER_LOGIN=true). Tidak ada default. Rate limit brute-force + perbandingan konstan-waktu |
| Logging | Event keamanan di-log server-side (429, origin mismatch, login tester gagal) — tanpa data sensitif |

## Trade-off yang disadari (jujur, bukan klaim aman 100%)

1. **CSP `script-src 'unsafe-inline'`** — Next.js menyuntik bootstrap inline.
   Penyempurnaan berikutnya: nonce per-request. Risiko: XSS tetap terbatas
   oleh validasi input + React escaping (tidak ada dangerouslySetInnerHTML).
2. **`frame-src https:`** — player memakai iframe embed pihak ketiga yang
   host-nya dinamis per episode (vidhide, ok.ru, dsb.), tidak mungkin
   di-whitelist statis. `frame-ancestors 'self'` tetap melindungi dari
   clickjacking situs ini.
3. **Streaming tidak anti-download** — video dari provider pihak ketiga
   tidak bisa dibuat anti-download; tidak ada credential internal yang
   bocor, URL embed hanya metadata publik.
4. **DNS rebinding di embed-check** — host publik yang di-resolve ke IP
   privat SETELAH pemeriksaan tidak dicek per-request (butuh resolusi DNS
   per-hop). Nilai SSRF-nya rendah: tidak ada cookie/secret internal yang
   dikirim ke target, hanya UA browser + permintaan header.
5. **Rate limit tanpa Redis** — fallback in-memory hanya per-instance
   (best effort di serverless). Set REDIS_URL + REDIS_TOKEN untuk proteksi
   global.
6. **Dependency build-time** — postcss/braces/postcss-selector-parser
   di bawah Next 15/Tailwind 3 punya advisory (hanya saat BUILD, bukan
   runtime). Fix penuh butuh Next 16/Tailwind 4 (breaking) — sengaja
   tidak di-upgrade mayor di rilis ini.
