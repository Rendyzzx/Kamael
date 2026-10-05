/**
 * Haptic ringan ala native (Android). navigator.vibrate tidak tersedia di
 * iOS Safari — diam saja di sana (tanpa error). Hormati prefers-reduced-motion
 * (getReducedMotion) karena haptic juga feedback gerak.
 */
export function haptic(durationMs = 8): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(durationMs);
  } catch {
    // diam saja
  }
}
