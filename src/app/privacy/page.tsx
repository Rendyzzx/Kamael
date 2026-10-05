import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Kebijakan privasi Cyronime.",
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: "0 var(--page-x)" }} className="mx-auto max-w-md space-y-5 py-2">
      <h1 className="font-display text-[20px] font-bold text-white">Privacy Policy</h1>
      <p className="text-xs" style={{ color: "var(--text-2)" }}>
        Terakhir diperbarui: Oktober 2026
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">Data yang kami simpan</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Cyronime menyimpan data seminimal mungkin: progres onboarding, pilihan tontonan
          (Anime/Donghua), progres nonton, history, dan favorit. Semua tersimpan di database
          Redis milik kami, diidentifikasi lewat ID akun Google (bila kamu masuk) atau ID
          pengunjung anonim di cookie yang hanya bisa dibaca server (httpOnly).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">Login dengan Google</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Kami hanya meminta nama, email, dan foto profil dasar dari akun Google kamu untuk
          membuat sesi login. Kami tidak pernah menyimpan password kamu — autentikasi
          sepenuhnya ditangani oleh Google.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">Konten pihak ketiga</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Cyronime tidak menyimpan atau menghosting file video. Semua tontonan di-stream lewat
          embed pihak ketiga; hak cipta konten tetap milik pemiliknya masing-masing.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">Kontrol kamu</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Kamu bisa mengulang onboarding atau mengganti pilihan tontonan kapan saja lewat
          Settings. Logout akan menghapus sesi login kamu dari perangkat ini.
        </p>
      </section>
    </div>
  );
}
