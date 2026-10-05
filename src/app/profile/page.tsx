import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth/session";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

export const metadata: Metadata = {
  title: "Profile",
  description: "Kelola akun, history, dan favorite Cyronime kamu.",
};

const LINKS = [
  { href: "/history", label: "Watch History", desc: "Riwayat episode yang sudah ditonton" },
  { href: "/favorites", label: "Favorites", desc: "Anime & donghua yang kamu simpan" },
  { href: "/settings", label: "Settings", desc: "Tema dan preferensi lainnya" },
] as const;

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="text-lg font-semibold">Kamu belum login</h1>
        <p className="text-sm text-zinc-400">
          Login untuk melihat profile, continue watching, history, dan favorite.
        </p>
        <div className="w-full">
          <GoogleLoginButton callbackUrl="/profile" />
        </div>
      </div>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <section className="flex items-center gap-4 rounded-lg bg-surface-900 p-4">
        <div className="h-14 w-14 overflow-hidden rounded-full bg-surface-800">
          {image ? (
            <Image src={image} alt={name ?? "Avatar"} width={56} height={56} className="h-14 w-14 object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-100">{name}</p>
          <p className="truncate text-sm text-zinc-500">{email}</p>
        </div>
      </section>

      <section className="divide-y divide-surface-800 overflow-hidden rounded-lg bg-surface-900">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-800">
            <div>
              <p className="text-sm font-medium text-zinc-100">{l.label}</p>
              <p className="text-xs text-zinc-500">{l.desc}</p>
            </div>
            <span aria-hidden="true" className="text-zinc-500">
              &rarr;
            </span>
          </Link>
        ))}
      </section>

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
    </div>
  );
}
