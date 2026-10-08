/**
 * Guard CSRF berbasis origin untuk semua mutasi API (POST/PUT/PATCH/DELETE).
 *
 * Model ancaman: cookie Auth.js bersifat SameSite=Lax (cookie TIDAK ikut
 * terkirim pada cross-site POST oleh browser modern) — itu lapisan utama.
 * Guard ini lapisan kedua: jika ada header Origin/Referer yang MENYEBUT
 * origin lain, tolak dengan 403 sebelum handler jalan.
 *
 * Request TANPA Origin/Referer (mis. curl, klien non-browser) tetap
 * dilewati: cookie tidak dikirim otomatis oleh klien semacam itu, dan
 * memaksa Origin akan merusak klien yang sah tanpa manfaat keamanan.
 */

/** Host yang dianggap same-origin dengan request ini (port ikut dicek). */
export function isSameOriginHost(req: Request, host: string): boolean {
  const url = new URL(req.url);
  return host === url.host;
}

/**
 * Return true bila request BOLEH lanjut (origin cocok atau tidak ada origin).
 * Return false bila origin/referer terdeteksi dari host lain → 403.
 */
export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return isSameOriginHost(req, new URL(origin).host);
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return isSameOriginHost(req, new URL(referer).host);
    } catch {
      return false;
    }
  }
  // Tidak ada indikator origin sama sekali (non-browser) → biarkan auth
  // handler yang menentukan (401 bila tanpa session valid).
  return true;
}
