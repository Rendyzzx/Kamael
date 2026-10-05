"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * Gambar dengan blur placeholder ala native: skeleton shimmer di belakang
 * (bg token), gambar blur(12px)+transparan sampai onLoad, lalu fade+unblur
 * halus ke tajam (300ms; instan bila prefers-reduced-motion — CSS global
 * .img-blur-in menghormati itu lewat media query? animasi dikelola lewat
 * transition di sini; reduced-motion mematikan transition di CSS global).
 */
export default function BlurImage({
  src,
  alt,
  sizes,
  priority,
  className,
  imgClassName,
  rounded,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  rounded?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className={`relative block overflow-hidden ${className ?? ""} ${rounded ?? ""}`}
      style={{ background: "var(--surface-2)" }}
      aria-busy={!loaded}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${loaded ? "opacity-0" : "skeleton"}`}
        style={{ transition: "opacity .2s ease" }}
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={`${imgClassName ?? "object-cover"} transition-[opacity,filter] duration-300`}
        style={{
          opacity: loaded ? 1 : 0,
          filter: loaded ? undefined : "blur(12px)",
        }}
      />
    </span>
  );
}

// Digunakan oleh komponen lain untuk tipe hanya (hindari unused import warning).
export type { ImageProps };
