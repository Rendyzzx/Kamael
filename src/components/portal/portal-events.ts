/**
 * Util portal (client-shared). Tipe pilihan tontonan — sekarang bagian dari
 * state onboarding (Redis onboarding:{id}.type via /api/onboarding), bukan
 * sistem terpisah lagi. TIDAK pernah localStorage/sessionStorage/cookie client.
 */
export type Portal = "anime" | "donghua";
