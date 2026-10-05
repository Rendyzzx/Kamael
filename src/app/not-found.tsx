import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-black text-accent-500">404</p>
      <p className="text-sm text-zinc-400">
        Halaman tidak ditemukan atau konten sudah tidak tersedia.
      </p>
      <Link
        href="/"
        className="rounded-md bg-surface-800 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-surface-700"
      >
        Kembali ke Home
      </Link>
    </div>
  );
}
