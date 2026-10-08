"use client";

/**
 * Menu pengaturan player ala YouTube:
 * - Mobile: bottom sheet (radius atas 20px, bg --deep, item 52px + garis pemisah).
 * - Desktop: popover kanan (lihat .sheet-panel di globals.css).
 * Level 1: Kualitas / Server / Kecepatan (mode native) / Lapor video rusak.
 * Level 2: daftar pilihan dengan centang glacier.
 */
import { useEffect, useState } from "react";
import type { PlayerSource, QualityGroup } from "@/types/player";
import { sourceKey } from "@/types/player";
import { qualityLabel, qualityNumber } from "@/lib/player/sources";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

type Level = "main" | "quality" | "server" | "speed";

export default function SettingsSheet({
  open,
  onClose,
  mode,
  groups,
  activeQuality,
  activeSource,
  autoServerActive,
  failedKeys,
  speed,
  onSelectQuality,
  onSelectServer,
  onSelectAutoServer,
  onSelectSpeed,
  onReport,
}: {
  open: boolean;
  onClose: () => void;
  mode: "native" | "embed";
  groups: QualityGroup[];
  activeQuality: string;
  activeSource: PlayerSource | null;
  /** True bila server aktif = pilihan otomatis (prioritas pertama). */
  autoServerActive: boolean;
  failedKeys: Set<string>;
  speed: number;
  onSelectQuality: (quality: string) => void;
  onSelectServer: (source: PlayerSource) => void;
  onSelectAutoServer: () => void;
  onSelectSpeed: (speed: number) => void;
  onReport: () => void;
}) {
  const [level, setLevel] = useState<Level>("main");

  useEffect(() => {
    if (open) setLevel("main");
  }, [open]);

  // Tutup dengan Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeGroup = groups.find((g) => g.quality === activeQuality) ?? groups[0] ?? null;
  const showQuality = groups.length > 1;

  const title =
    level === "quality"
      ? "Kualitas"
      : level === "server"
        ? `Server: ${qualityLabel(activeQuality)}`
        : level === "speed"
          ? "Kecepatan"
          : "Pengaturan";

  return (
    <>
      <div
        className={`sheet-scrim ${open ? "on" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        role="dialog"
        aria-label="Pengaturan pemutar"
        aria-modal="true"
        className={`sheet-panel ${open ? "on" : ""}`}
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        {/* Header: tombol kembali hanya di level 2 */}
        <div
          className="flex items-center"
          style={{ height: 52, borderBottom: "1px solid var(--deep-2)" }}
        >
          {level !== "main" ? (
            <button
              type="button"
              onClick={() => setLevel("main")}
              aria-label="Kembali"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center"
            >
              <span className="material-symbols-rounded" style={{ color: "var(--frost)", fontSize: 22 }}>
                arrow_back
              </span>
            </button>
          ) : null}
          <p className="font-display px-4 text-[17px] font-semibold" style={{ color: "var(--frost)" }}>
            {title}
          </p>
        </div>

        {level === "main" ? (
          <div>
            {showQuality ? (
              <SheetItem
                label="Kualitas"
                value={qualityLabel(activeQuality)}
                chevron
                onClick={() => setLevel("quality")}
              />
            ) : null}
            <SheetItem
              label="Server"
              value={autoServerActive ? "Otomatis" : (activeSource?.server ?? "—")}
              chevron
              onClick={() => setLevel("server")}
            />
            {mode === "native" ? (
              <SheetItem
                label="Kecepatan"
                value={`${speed}x`}
                chevron
                onClick={() => setLevel("speed")}
              />
            ) : null}
            <SheetItem label="Lapor video rusak" onClick={onReport} />
          </div>
        ) : null}

        {level === "quality" ? (
          <div>
            {groups.map((g) => {
                const hd = (qualityNumber(g.quality) ?? 0) >= 720;
                return (
                  <SheetItem
                    key={g.quality}
                    label={qualityLabel(g.quality)}
                    hd={hd}
                    checked={g.quality === activeQuality}
                    onClick={() => {
                      onSelectQuality(g.quality);
                      onClose();
                    }}
                  />
                );
              })}
          </div>
        ) : null}

        {level === "server" && activeGroup ? (
          <div>
            <SheetItem
              label="Otomatis (disarankan)"
              checked={autoServerActive}
              onClick={() => {
                onSelectAutoServer();
                onClose();
              }}
            />
            {activeGroup.sources.map((s) => {
              const failed = failedKeys.has(sourceKey(s));
              return (
                <SheetItem
                  key={sourceKey(s)}
                  label={s.server}
                  value={failed ? "Gagal" : undefined}
                  valueMuted={failed}
                  checked={!autoServerActive && activeSource === s}
                  onClick={() => {
                    if (!failed) {
                      onSelectServer(s);
                      onClose();
                    }
                  }}
                />
              );
            })}
          </div>
        ) : null}

        {level === "speed" ? (
          <div>
            {SPEEDS.map((s) => (
              <SheetItem
                key={s}
                label={`${s}x`}
                checked={Math.abs(speed - s) < 0.01}
                onClick={() => {
                  onSelectSpeed(s);
                  onClose();
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

function SheetItem({
  label,
  value,
  chevron,
  checked,
  hd,
  valueMuted,
  onClick,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  checked?: boolean;
  hd?: boolean;
  valueMuted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex w-full items-center justify-between"
      style={{
        minHeight: 52,
        paddingInline: 20,
        borderBottom: "1px solid rgba(121, 105, 176, 0.28)",
        color: "var(--frost)",
        fontSize: 16,
        textAlign: "left",
      }}
    >
      <span className="flex items-center gap-2">
        {label}
        {hd ? (
          <span
            className="text-[11px] font-bold"
            style={{
              color: "var(--glacier)",
              border: "1px solid rgba(121, 105, 176, 0.5)",
              borderRadius: 5,
              padding: "1px 5px",
            }}
          >
            HD
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        {value ? (
          <span style={{ color: valueMuted ? "var(--muted)" : "var(--muted)", fontSize: 15 }}>{value}</span>
        ) : null}
        {checked ? (
          <span className="material-symbols-rounded" style={{ color: "var(--glacier)", fontSize: 20 }}>
            check
          </span>
        ) : chevron ? (
          <span className="material-symbols-rounded" style={{ color: "var(--muted)", fontSize: 18 }}>
            chevron_right
          </span>
        ) : null}
      </span>
    </button>
  );
}
