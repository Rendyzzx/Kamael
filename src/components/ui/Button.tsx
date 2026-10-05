"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { haptic } from "@/lib/haptic";

type Variant = "primary" | "secondary" | "tertiary" | "decline" | "play";

/**
 * Sistem tombol Cyronime — bukan satu komponen pill serba-guna.
 *
 * - primary: SATU per layar. Isi amber padat (bukan gradien), radius
 *   rounded-rect (14px, bukan pill). Shadow "keras" berwarna hangat yang
 *   mengecil + tombol turun 2px saat ditekan — reaksi fisik, bukan hover.
 * - secondary: outline tipis peach, transparan. Radius sama dgn primary
 *   supaya terasa satu keluarga, tapi tanpa bobot visual sama.
 * - tertiary: teks polos + underline, dipakai untuk aksi paling ringan
 *   ("Lihat semua", "Kembali").
 * - decline: outline nada hangat redup — untuk aksi menolak/batal.
 * - play: LINGKARAN (bentuk fungsional, bukan dekorasi) — satu-satunya
 *   tombol pill-shaped di sistem ini, karena cuma play yang memang bulat.
 *
 * Tidak ada varian yang pakai gradient+glow sekaligus, dan hover TIDAK
 * sekadar translateY — perubahan nyata terjadi di :active (tekan).
 */
export default function Button({
  children,
  variant = "primary",
  href,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
}: {
  children: ReactNode;
  variant?: Variant;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}) {
  const cls = `btn btn-${variant} ${className}`.trim();
  const handlePointerDown = () => haptic(8);

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel} onPointerDown={handlePointerDown}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onPointerDown={disabled ? undefined : handlePointerDown}
    >
      {children}
    </button>
  );
}
