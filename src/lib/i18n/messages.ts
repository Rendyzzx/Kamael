/**
 * Kamus bahasa untuk halaman Settings.
 * Tambah bahasa baru: (1) tambah kode di LOCALES, (2) tambah objek terjemahan
 * di MESSAGES dengan kunci yang sama. Tipe `Messages` memaksa semua kunci terisi.
 */
export const LOCALES = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "id";

const id = {
  "settings.title": "Settings",
  "settings.subtitle": "Atur pengalaman kamu di Cyronime.",
  "common.cancel": "Batal",
  "common.soon": "Segera",
  "common.on": "Aktif",
  "common.off": "Nonaktif",
  "common.close": "Tutup",

  "profile.edit": "Edit Profil",
  "profile.status": "Akun Google terhubung",
  "profile.guest": "Belum login",
  "profile.editTitle": "Edit Profil",
  "profile.editBody":
    "Nama, email, dan foto kamu diambil dari akun Google yang dipakai untuk login. Untuk mengubahnya, perbarui profil di akun Google kamu. Perubahan akan ikut terbaca saat kamu login ulang.",

  "appearance.title": "Appearance",
  "appearance.theme": "Theme",
  "appearance.theme.dark": "Dark",
  "appearance.theme.light": "Light",
  "appearance.theme.system": "System",
  "appearance.accent": "Accent Color",
  "appearance.accent.purple": "Purple",
  "appearance.accent.blue": "Blue",
  "appearance.accent.pink": "Pink",
  "appearance.accent.cyan": "Cyan",

  "player.title": "Player",
  "player.autoResume": "Auto Resume",
  "player.autoResumeDesc": "Lanjut otomatis dari posisi terakhir.",
  "player.autoNext": "Auto Play Next Episode",
  "player.autoNextDesc": "Putar episode berikutnya otomatis.",
  "player.skipIntro": "Skip Intro",
  "player.skipIntroDesc": "Lewati opening secara otomatis.",
  "player.subtitle": "Default Subtitle",
  "player.subtitleValue": "Indonesia",
  "player.quality": "Default Quality",
  "player.qualityValue": "Auto",

  "watching.title": "Watching",
  "watching.continue": "Continue Watching",
  "watching.continueDesc": "Lanjutkan tontonan terakhir.",
  "watching.history": "Watch History",
  "watching.historyDesc": "Riwayat episode yang sudah ditonton.",
  "watching.clearHistory": "Clear Watch History",
  "watching.clearHistoryDesc": "Hapus semua riwayat tontonan.",
  "watching.resetProgress": "Reset Progress",
  "watching.resetProgressDesc": "Hapus daftar Continue Watching.",
  "watching.confirmHistoryTitle": "Hapus semua riwayat?",
  "watching.confirmHistoryBody":
    "Semua riwayat tontonan Anime dan Donghua di akun ini akan dihapus. Daftar Continue Watching dan Favorites tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.",
  "watching.confirmProgressTitle": "Reset progress tontonan?",
  "watching.confirmProgressBody":
    "Semua item di Continue Watching akan dihapus, jadi kamu tidak bisa lanjut dari episode terakhir. Riwayat dan Favorites tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.",
  "watching.confirmHistoryAction": "Hapus Riwayat",
  "watching.confirmProgressAction": "Reset Progress",
  "watching.historyCleared": "Riwayat tontonan dihapus.",
  "watching.progressCleared": "Progress tontonan direset.",
  "watching.failed": "Gagal. Coba lagi nanti.",

  "notif.title": "Notifications",
  "notif.newEpisode": "Episode baru",
  "notif.newEpisodeDesc": "Kabar saat episode baru tayang.",
  "notif.favorite": "Anime favorit",
  "notif.favoriteDesc": "Update dari daftar favoritmu.",
  "notif.system": "Update sistem",
  "notif.systemDesc": "Info fitur dan perbaikan Cyronime.",
  "notif.note": "Sistem notifikasi sedang disiapkan.",

  "language.title": "Language",
  "language.label": "Bahasa tampilan",
  "language.note": "Berlaku untuk halaman Settings. Halaman lain menyusul.",

  "contact.title": "Contact Admin",
  "contact.desc": "Kalau menemukan masalah, bug, atau ingin memberikan saran, hubungi admin Cyronime.",
  "contact.cta": "Hubungi Admin",
  "contact.bug": "Laporkan Bug",
  "contact.bugMessage": "Halo Admin Cyronime, saya ingin melaporkan bug: ",

  "about.title": "About Cyronime",
  "about.desc": "Platform streaming anime & donghua dengan tampilan sederhana dan nyaman digunakan.",
  "about.version": "Version",
  "about.website": "Website",
  "about.contact": "Contact Admin",
  "about.terms": "Terms & Privacy",

  "danger.title": "Danger Zone",
  "danger.logout": "Logout",
  "danger.logoutDesc": "Keluar dari akun dan kembali ke awal.",

  "footer.tagline": "Made for anime fans.",
} as const;

export type MessageKey = keyof typeof id;
export type Messages = Record<MessageKey, string>;

const en: Messages = {
  "settings.title": "Settings",
  "settings.subtitle": "Tune your Cyronime experience.",
  "common.cancel": "Cancel",
  "common.soon": "Soon",
  "common.on": "On",
  "common.off": "Off",
  "common.close": "Close",

  "profile.edit": "Edit Profile",
  "profile.status": "Google account connected",
  "profile.guest": "Not signed in",
  "profile.editTitle": "Edit Profile",
  "profile.editBody":
    "Your name, email, and photo come from the Google account you signed in with. To change them, update your Google profile. The changes will show up the next time you sign in.",

  "appearance.title": "Appearance",
  "appearance.theme": "Theme",
  "appearance.theme.dark": "Dark",
  "appearance.theme.light": "Light",
  "appearance.theme.system": "System",
  "appearance.accent": "Accent Color",
  "appearance.accent.purple": "Purple",
  "appearance.accent.blue": "Blue",
  "appearance.accent.pink": "Pink",
  "appearance.accent.cyan": "Cyan",

  "player.title": "Player",
  "player.autoResume": "Auto Resume",
  "player.autoResumeDesc": "Continue from where you left off.",
  "player.autoNext": "Auto Play Next Episode",
  "player.autoNextDesc": "Play the next episode automatically.",
  "player.skipIntro": "Skip Intro",
  "player.skipIntroDesc": "Skip openings automatically.",
  "player.subtitle": "Default Subtitle",
  "player.subtitleValue": "Indonesian",
  "player.quality": "Default Quality",
  "player.qualityValue": "Auto",

  "watching.title": "Watching",
  "watching.continue": "Continue Watching",
  "watching.continueDesc": "Pick up your latest shows.",
  "watching.history": "Watch History",
  "watching.historyDesc": "Episodes you have watched.",
  "watching.clearHistory": "Clear Watch History",
  "watching.clearHistoryDesc": "Delete all watch history.",
  "watching.resetProgress": "Reset Progress",
  "watching.resetProgressDesc": "Clear your Continue Watching list.",
  "watching.confirmHistoryTitle": "Clear all history?",
  "watching.confirmHistoryBody":
    "All Anime and Donghua watch history on this account will be deleted. Continue Watching and Favorites are not affected. This cannot be undone.",
  "watching.confirmProgressTitle": "Reset watch progress?",
  "watching.confirmProgressBody":
    "Everything in Continue Watching will be removed, so you can no longer resume from your last episode. History and Favorites are not affected. This cannot be undone.",
  "watching.confirmHistoryAction": "Clear History",
  "watching.confirmProgressAction": "Reset Progress",
  "watching.historyCleared": "Watch history cleared.",
  "watching.progressCleared": "Watch progress reset.",
  "watching.failed": "Failed. Please try again later.",

  "notif.title": "Notifications",
  "notif.newEpisode": "New episodes",
  "notif.newEpisodeDesc": "Know when a new episode airs.",
  "notif.favorite": "Favorite anime",
  "notif.favoriteDesc": "Updates from your favorites.",
  "notif.system": "System updates",
  "notif.systemDesc": "Cyronime features and fixes.",
  "notif.note": "The notification system is being prepared.",

  "language.title": "Language",
  "language.label": "Display language",
  "language.note": "Applies to Settings. Other pages are coming.",

  "contact.title": "Contact Admin",
  "contact.desc": "Found a problem, a bug, or have a suggestion? Reach out to the Cyronime admin.",
  "contact.cta": "Contact Admin",
  "contact.bug": "Report a Bug",
  "contact.bugMessage": "Hello Cyronime Admin, I would like to report a bug: ",

  "about.title": "About Cyronime",
  "about.desc": "An anime & donghua streaming platform that is simple and comfortable to use.",
  "about.version": "Version",
  "about.website": "Website",
  "about.contact": "Contact Admin",
  "about.terms": "Terms & Privacy",

  "danger.title": "Danger Zone",
  "danger.logout": "Logout",
  "danger.logoutDesc": "Sign out and return to the start.",

  "footer.tagline": "Made for anime fans.",
};

export const MESSAGES: Record<Locale, Messages> = { id, en };

export function isLocale(v: unknown): v is Locale {
  return LOCALES.some((l) => l.code === v);
}
