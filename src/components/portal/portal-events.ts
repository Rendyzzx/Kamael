/**
 * Util portal (client-shared). Preferensi portal kini disimpan di server:
 * Redis pref:{id} via /api/preference (identitas user login / cookie visitor
 * httpOnly) — TIDAK lagi localStorage/sessionStorage/cookie client.
 */
export type Portal = "anime" | "donghua";
