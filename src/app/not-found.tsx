import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-5xl font-extrabold" style={{ color: "var(--blue)" }}>404</p>
      <p className="text-sm" style={{ color: "var(--text-2)" }}>
        Halaman tidak ditemukan atau konten sudah tidak tersedia.
      </p>
      <Link
        href="/"
        className="rounded-chip px-5 py-2.5 text-sm font-bold text-white transition-smooth" style={{ background: "var(--blue-grad)" }}
      >
        Kembali ke Home
      </Link>
    </div>
  );
}
