import type { Metadata } from "next";
import { auth, signOut } from "@/lib/auth/session";
import AutoResumeToggle from "@/components/settings/AutoResumeToggle";

export const metadata: Metadata = {
  title: "Settings",
  description: "Preferensi tampilan dan playback Cyronime.",
};

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-bold tracking-tight">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Appearance</h2>
        <div className="flex items-center justify-between rounded-lg bg-surface-900 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-zinc-100">Theme</p>
            <p className="text-xs text-zinc-500">Cyronime saat ini menggunakan dark mode secara penuh.</p>
          </div>
          <span className="rounded-md bg-surface-800 px-2.5 py-1 text-xs font-medium text-zinc-300">Dark</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Playback</h2>
        <div className="flex items-center justify-between rounded-lg bg-surface-900 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-zinc-100">Auto-resume</p>
            <p className="text-xs text-zinc-500">Lanjutkan otomatis dari posisi terakhir tanpa prompt.</p>
          </div>
          <AutoResumeToggle />
        </div>
      </section>

      {session?.user ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</h2>
          <div className="rounded-lg bg-surface-900 px-4 py-3.5">
            <p className="text-sm font-medium text-zinc-100">{session.user.name}</p>
            <p className="text-xs text-zinc-500">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-lg bg-surface-900 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-surface-800"
            >
              Logout
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">About</h2>
        <div className="rounded-lg bg-surface-900 px-4 py-3.5 text-sm text-zinc-400">
          <p className="font-medium text-zinc-100">Cyronime</p>
          <p className="mt-1">
            Platform streaming anime &amp; donghua. Semua konten diambil dari API publik dan di-stream lewat
            embed pihak ketiga — Cyronime tidak menyimpan file video di server.
          </p>
        </div>
      </section>
    </div>
  );
}
