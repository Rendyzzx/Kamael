import Image from "next/image";
import Link from "next/link";

/**
 * 404 — maskot Senja + ajakan konkret, bukan angka besar generik.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative" style={{ width: 150, height: 170 }}>
        <Image src="/mascot/senja-rimlight.png" alt="Maskot Senja kebingungan" fill sizes="150px" className="object-contain" />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-white">Halaman ini tidak ada</p>
        <p className="mx-auto mt-1 max-w-[300px] text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Alamatnya salah ketik, atau kontennya sudah dihapus dari sumber. Cari
          judulnya lewat pencarian, mungkin ada di halaman lain.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/search" className="btn btn-secondary">
          Cari judulnya
        </Link>
        <Link href="/" className="btn btn-tertiary">
          Kembali ke home
        </Link>
      </div>
    </div>
  );
}
