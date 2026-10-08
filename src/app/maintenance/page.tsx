import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getMaintenanceCached,
  isAndroidMaintenance,
  isWebMaintenance,
} from "@/lib/system/settings";

/**
 * Halaman maintenance — dicek & diarahkan dari middleware (SERVER-SIDE),
 * bukan disembunyikan via JavaScript. Halaman ini selalu bisa diakses;
 * jika maintenance ternyata tidak aktif, pengunjung diberi link pulang.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return (
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(iso)) + " WIB"
    );
  } catch {
    return iso;
  }
}

export default async function MaintenancePage() {
  const m = await getMaintenanceCached();
  const web = isWebMaintenance(m);
  const android = isAndroidMaintenance(m);
  const estimated = formatDate(m.estimatedEnd);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="relative" style={{ width: 140, height: 160 }}>
        <Image src="/mascot/airin.webp" alt="Maskot Airin" fill sizes="140px" className="object-contain opacity-80" />
      </div>

      <div>
        <h1 className="font-display text-[24px] font-bold leading-tight text-[var(--text)]">
          Cyronime sedang dalam Maintenance
        </h1>
        <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {m.message}
        </p>
        {estimated ? (
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
            Perkiraan selesai: {estimated}
          </p>
        ) : null}
      </div>

      {/* Status sistem per platform */}
      <div
        className="inline-flex overflow-hidden rounded-app"
        style={{ border: "1px solid var(--line)" }}
        role="status"
        aria-label="Status sistem"
      >
        <span
          className="px-4 py-2 text-[12.5px] font-bold"
          style={{
            background: "var(--surface)",
            color: web ? "var(--peach)" : "var(--text)",
            borderRight: "1px solid var(--line)",
          }}
        >
          WEB: {web ? "MAINTENANCE" : "ONLINE"}
        </span>
        <span
          className="px-4 py-2 text-[12.5px] font-bold"
          style={{ background: "var(--surface)", color: android ? "var(--peach)" : "var(--text)" }}
        >
          ANDROID: {android ? "MAINTENANCE" : "ONLINE"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/" className="btn btn-secondary">
          Coba lagi
        </Link>
        <Link href="/privacy" className="btn btn-tertiary">
          Kebijakan Privasi
        </Link>
      </div>

      <p className="text-[11.5px]" style={{ color: "var(--text-2)" }}>
        Status juga tersedia di /api/system/status untuk aplikasi Android.
      </p>
    </div>
  );
}
