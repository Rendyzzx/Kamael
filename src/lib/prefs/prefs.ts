/**
 * Preferensi pengguna di perangkat (localStorage), dipakai halaman Settings.
 * Auto-resume memakai key lama "cyronime_auto_resume" yang sudah dibaca
 * NativePlayer, jadi toggle di Settings langsung berlaku di player.
 */
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/messages";

export type Theme = "dark" | "light" | "system";
export type Accent = "purple" | "blue" | "pink" | "cyan";

export const ACCENTS: { id: Accent; swatch: string }[] = [
  { id: "purple", swatch: "#6A69F3" },
  { id: "blue", swatch: "#3B8EF0" },
  { id: "pink", swatch: "#E5589B" },
  { id: "cyan", swatch: "#1CB8CF" },
];

export const KEYS = {
  theme: "cyronime_theme",
  accent: "cyronime_accent",
  locale: "cyronime_locale",
  autoResume: "cyronime_auto_resume",
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage penuh / diblok: abaikan, state tetap berlaku di sesi ini */
  }
}

export function readTheme(): Theme {
  const v = read(KEYS.theme);
  return v === "light" || v === "system" || v === "dark" ? v : "dark";
}

export function readAccent(): Accent {
  const v = read(KEYS.accent);
  return ACCENTS.some((a) => a.id === v) ? (v as Accent) : "purple";
}

export function readLocale(): Locale {
  const v = read(KEYS.locale);
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function readAutoResume(): boolean {
  return read(KEYS.autoResume) !== "0";
}

/** Terapkan ke <html>: accent berlaku seketika lewat override CSS variable. */
export function applyAccent(accent: Accent) {
  document.documentElement.setAttribute("data-accent", accent);
}

/** Tema efektif ("system" diselesaikan lewat prefers-color-scheme). */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme !== "system") return theme;
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Warna address bar / status bar mengikuti tema efektif.
  const color = resolveTheme(theme) === "light" ? "#E6E4F3" : "#212237";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function saveTheme(theme: Theme) {
  write(KEYS.theme, theme);
  applyTheme(theme);
}

export function saveAccent(accent: Accent) {
  write(KEYS.accent, accent);
  applyAccent(accent);
}

export function saveLocale(locale: Locale) {
  write(KEYS.locale, locale);
  document.documentElement.setAttribute("lang", locale);
}

export function saveAutoResume(on: boolean) {
  write(KEYS.autoResume, on ? "1" : "0");
}

/**
 * Skrip inline pra-hydration (dipasang di layout): terapkan accent tersimpan
 * sebelum paint supaya tidak berkedip dari ungu ke warna pilihan.
 */
export const PREFS_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEYS.theme}");if(t==="light"||t==="system"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var a=localStorage.getItem("${KEYS.accent}");if(a==="blue"||a==="pink"||a==="cyan"||a==="purple"){document.documentElement.setAttribute("data-accent",a);}}catch(e){}})();`;
