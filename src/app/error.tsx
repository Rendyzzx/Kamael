"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";

/**
 * Error boundary global. Tidak pernah menampilkan stack ke user;
 * detail error hanya ke console. Maskot Senja menemani, teks menjelaskan
 * apa yang salah + cara memperbaiki, tanpa minta maaf berlebihan.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app-error]", error.message, error.digest ?? "");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="relative" style={{ width: 140, height: 160 }}>
        <Image src="/mascot/senja-rimlight.webp" alt="" fill sizes="140px" className="object-contain" />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-white">Datanya gagal dimuat</p>
        <p className="mx-auto mt-1 max-w-[300px] text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
          Sumber data sedang tidak bisa dihubungi. Coba muat ulang — kalau masih
          gagal, tunggu beberapa menit, servernya biasanya balik sendiri.
        </p>
      </div>
      <Button onClick={reset}>Coba muat ulang</Button>
    </div>
  );
}
