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
      <p className="text-sm font-medium text-zinc-300">
        Data sedang tidak tersedia.
      </p>
      <p className="text-sm text-zinc-500">Silakan coba beberapa saat lagi.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
      >
        Coba lagi
      </button>
    </div>
  );
}
