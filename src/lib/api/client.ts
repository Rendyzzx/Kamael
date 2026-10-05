/**
 * HTTP client untuk Sanka Vollerei Anime API.
 *
 * Fakta terinspeksi (docs/API-INSPECTION.md):
 * - API menolak request tanpa User-Agent browser (anti-bot "Plana AI Detector").
 * - Rate limit 30 req/menit → setiap fetch WAJIB memakai cache Next.js (revalidate).
 * - Tidak ada API key; API_BASE_URL dibaca dari env server-side.
 */

const DEFAULT_BASE_URL = "https://www.sankavollerei.web.id";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOptions {
  /** Detik sebelum request dianggap timeout. */
  timeoutMs?: number;
  /** Detik cache Next.js sebelum revalidate. Default 300 (5 menit). */
  revalidate?: number;
}

/** Bangun URL absolut ke API sumber. Tidak pernah menerima URL arbitrary dari luar. */
export function apiUrl(path: string): string {
  const base = process.env.API_BASE_URL || DEFAULT_BASE_URL;
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base.replace(/\/+$/, "")}${path}`;
}

/** Fetch JSON dari API sumber dengan timeout + cache. Melempar ApiError saat gagal. */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, revalidate = 300 } = options;

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate },
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new ApiError(
      isTimeout ? "Upstream API timeout" : "Upstream API unreachable",
      isTimeout ? 504 : 502
    );
  }

  if (!res.ok) {
    throw new ApiError(`Upstream API error ${res.status}`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("Upstream API returned invalid JSON", 502);
  }
}
