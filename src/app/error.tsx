"use client";

/**
 * Error boundary global. Tidak pernah menampilkan stack ke user;
 * detail error hanya ke console untuk debugging.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log aman untuk debugging (tidak diekspos ke user)
  console.error("[app-error]", error.message, error.digest ?? "");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-semibold text-white">
        Data sedang tidak tersedia.
      </p>
      <p className="text-sm" style={{ color: "var(--text-2)" }}>Silakan coba beberapa saat lagi.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-chip px-5 py-2.5 text-sm font-bold text-white transition-smooth" style={{ background: "var(--blue-grad)" }}
      >
        Coba lagi
      </button>
    </div>
  );
}
