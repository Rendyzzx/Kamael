import type { Metadata } from "next";
import { auth, signOut } from "@/lib/auth/session";
import AutoResumeToggle from "@/components/settings/AutoResumeToggle";
import RestartOnboarding from "@/components/settings/RestartOnboarding";

export const metadata: Metadata = {
  title: "Settings",
  description: "Preferensi tampilan dan playback Cyronime.",
};

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
      {children}
    </h2>
  );
}

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div style={{ padding: "0 var(--page-x)" }} className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-[18px] font-bold text-white">Settings</h1>

      <section className="space-y-3">
        <GroupTitle>Appearance</GroupTitle>
        <div className="flex items-center justify-between rounded-card px-4 py-3.5" style={{ background: "var(--surface)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Theme</p>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>
              Cyronime saat ini menggunakan dark mode secara penuh.
            </p>
          </div>
          <span className="rounded-chip px-2.5 py-1 text-xs font-semibold text-white" style={{ background: "var(--surface-3)" }}>
            Dark
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <GroupTitle>Playback</GroupTitle>
        <div className="flex items-center justify-between rounded-card px-4 py-3.5" style={{ background: "var(--surface)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Auto-resume</p>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>
              Lanjutkan otomatis dari posisi terakhir tanpa prompt.
            </p>
          </div>
          <AutoResumeToggle />
        </div>
      </section>

      <section className="space-y-3">
        <GroupTitle>Onboarding</GroupTitle>
        <div className="rounded-card px-4 py-3.5" style={{ background: "var(--surface)" }}>
          <p className="text-sm font-semibold text-white">Ulangi Onboarding</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-2)" }}>
            Progres onboarding (disclaimer, pilihan tontonan) tersimpan di server. Hapus untuk
            melihat alur pengenalan dan memilih ulang Anime/Donghua dari awal.
          </p>
        </div>
        <RestartOnboarding />
      </section>

      {session?.user ? (
        <section className="space-y-3">
          <GroupTitle>Account</GroupTitle>
          <div className="rounded-card px-4 py-3.5" style={{ background: "var(--surface)" }}>
            <p className="text-sm font-semibold text-white">{session.user.name}</p>
            <p className="text-xs" style={{ color: "var(--text-2)" }}>
              {session.user.email}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-chip px-4 py-3 text-sm font-bold transition-smooth"
              style={{ background: "var(--surface)", color: "#FF1744" }}
            >
              Logout
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-2">
        <GroupTitle>About</GroupTitle>
        <div className="rounded-card px-4 py-3.5 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
          <p className="font-display font-semibold text-white">Cyronime</p>
          <p className="mt-1">
            Platform streaming anime &amp; donghua. Semua konten diambil dari API publik dan di-stream lewat
            embed pihak ketiga — Cyronime tidak menyimpan file video di server.
          </p>
        </div>
      </section>
    </div>
  );
}
