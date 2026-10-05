"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptic";

/**
 * Bottom sheet draggable ala native (dipakai untuk filter genre, daftar
 * episode, dan pengaturan player):
 * - Drag handle di atas: tarik ke bawah untuk menutup (28% tinggi sheet
 *   atau flick >120px), haptic ringan saat menutup.
 * - Backdrop tap untuk menutup; Escape menutup (keyboard).
 * - Konten di bawah handle tetap bisa di-scroll normal (hanya handle +
 *   judul yang men-drag sheet).
 * - Menghormati prefers-reduced-motion: transisi instan (CSS global).
 * - Panel selalu ter-mount, class .on yang men-toggle — supaya ada
 *   animasi slide-out saat menutup, bukan hilang mendadak.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = "82dvh",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragState = useRef({ startY: 0, dragging: false });

  // Kunci scroll body saat sheet terbuka (ala dialog native).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape untuk keyboard; reset drag saat buka ulang.
  useEffect(() => {
    if (!open) return;
    setDragY(0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragState.current = { startY: e.touches[0].clientY, dragging: true };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.dragging) return;
    // Hanya tarikan ke bawah yang menggeser sheet (delta > 0).
    setDragY(Math.max(0, e.touches[0].clientY - dragState.current.startY));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    const panel = panelRef.current;
    const height = panel?.offsetHeight ?? 400;
    if (dragY > height * 0.28 || dragY > 120) {
      haptic(6);
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  return (
    <>
      <div className={`sheet-scrim ${open ? "on" : ""}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className={`sheet-panel ${open ? "on" : ""}`}
        style={{
          maxHeight,
          transform: dragY > 0 ? `translate(-50%, ${dragY}px)` : undefined,
          transition: dragY > 0 ? "none" : undefined,
        }}
      >
        {/* Handle + judul: strip yang bisa di-drag (touch-action none) */}
        <div
          className="sticky top-0 z-10 pb-2 pt-2.5"
          style={{ background: "var(--deep)", borderRadius: "20px 20px 0 0", touchAction: "none" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="mx-auto rounded-full"
            style={{ width: 40, height: 4, background: "var(--deep-2)" }}
            aria-hidden="true"
          />
          <p className="mt-2.5 px-5 text-[15px] font-bold" style={{ color: "var(--frost)" }}>
            {title}
          </p>
        </div>

        {/* Konten: scrollable, overscroll tidak menjalar keluar sheet */}
        <div className="px-5 pb-4" style={{ overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </>
  );
}
