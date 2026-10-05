"use client";

import { openPortalSwitch, type Portal } from "./portal-events";

/**
 * Chip portal aktif di header home: menampilkan portal saat ini
 * (Anime / Donghua) dan membuka dialog ganti portal.
 */
export default function PortalSwitch({ portal }: { portal: Portal }) {
  return (
    <button
      type="button"
      onClick={openPortalSwitch}
      aria-label={`Portal ${portal === "anime" ? "Anime" : "Donghua"} aktif. Ganti portal.`}
      className="flex h-11 items-center gap-1.5 rounded-chip px-3 transition-smooth"
      style={{ background: "var(--surface)" }}
    >
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 20, color: portal === "anime" ? "var(--blue)" : "var(--maroon)" }}
      >
        {portal === "anime" ? "live_tv" : "auto_awesome"}
      </span>
      <span className="text-[13px] font-semibold text-white">
        {portal === "anime" ? "Anime" : "Donghua"}
      </span>
      <span className="material-symbols-rounded" style={{ fontSize: 18, color: "var(--text-2)" }} aria-hidden="true">
        swap_vert
      </span>
    </button>
  );
}
