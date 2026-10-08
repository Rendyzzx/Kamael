"use client";

/**
 * Primitif UI Settings. Semua memakai token desain Cyronime (navy datar,
 * garis tipis --line, aksen --accent) dan ikon Material Symbols Rounded
 * yang sudah dimuat di globals.css. Tanpa gradien/glow.
 */
import { useEffect, useRef, type ReactNode } from "react";

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`material-symbols-rounded ${className ?? ""}`} style={{ fontSize: size }} aria-hidden="true">
      {name}
    </span>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-2)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-card ${className ?? ""}`}
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
    >
      {children}
    </div>
  );
}

/** Daftar baris dalam satu kartu, dipisah garis tipis. */
export function CardList({ children }: { children: ReactNode }) {
  return (
    <Card>
      <div className="divide-y" style={{ borderColor: "var(--line)" }}>
        {children}
      </div>
    </Card>
  );
}

export function SoonBadge({ label }: { label: string }) {
  return (
    <span
      className="shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-bold"
      style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--line)" }}
    >
      {label}
    </span>
  );
}

const rowBase = "flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-smooth";

export function Row({
  icon,
  title,
  desc,
  right,
  disabled,
  danger,
  onClick,
  href,
}: {
  icon: string;
  title: string;
  desc?: string;
  right?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-app"
        style={{ background: "var(--surface-2)", color: danger ? "var(--peach)" : "var(--text-2)" }}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight text-[var(--text)]">{title}</span>
        {desc ? (
          <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: "var(--text-2)" }}>
            {desc}
          </span>
        ) : null}
      </span>
      {right}
    </>
  );

  const style = { opacity: disabled ? 0.6 : 1 } as const;
  if (href && !disabled) {
    return (
      <a href={href} className={`${rowBase} active:bg-[var(--surface-2)]`} style={style}>
        {content}
      </a>
    );
  }
  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={`${rowBase} active:bg-[var(--surface-2)]`} style={style}>
        {content}
      </button>
    );
  }
  return (
    <div className={rowBase} style={style} aria-disabled={disabled || undefined}>
      {content}
    </div>
  );
}

export function Chevron() {
  return <Icon name="chevron_right" size={20} className="shrink-0 text-[var(--text-2)]" />;
}

/** Toggle dengan state ganda: posisi + teks Aktif/Nonaktif (bukan hanya warna). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  onText,
  offText,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="w-[54px] text-right text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
        {checked ? onText : offText}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="relative h-7 w-12 shrink-0 rounded-full transition-smooth before:absolute before:-inset-2 before:content-[''] disabled:cursor-not-allowed"
        style={{
          background: checked ? "var(--accent)" : "var(--surface-2)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--line-strong)"}`,
        }}
      >
        <span
          className="absolute top-[3px] h-[20px] w-[20px] rounded-full transition-transform duration-200"
          style={{
            background: "#FEFDFF",
            transform: checked ? "translateX(23px)" : "translateX(3px)",
          }}
        />
      </button>
    </span>
  );
}

/** Segmented control: item aktif ditandai warna + centang (tidak hanya warna). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean; icon?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-app p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        background: "var(--bg)",
        border: "1px solid var(--line)",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-chip px-2 text-[13px] font-semibold transition-smooth active:scale-[.97] disabled:cursor-not-allowed"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#FEFDFF" : "var(--text-2)",
              opacity: o.disabled ? 0.55 : 1,
            }}
          >
            {active ? <Icon name="check" size={16} /> : o.icon ? <Icon name={o.icon} size={16} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Dialog modal / bottom sheet ramah HP, dengan fokus dan Escape. */
export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Tutup"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(10,10,20,.72)" }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[420px] rounded-t-[22px] p-5 outline-none sm:rounded-card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-strong)",
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <h3 className="font-display text-[17px] font-bold text-[var(--text)]">{title}</h3>
        <div className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {children}
        </div>
        <div className="mt-5 flex gap-2.5">{actions}</div>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
  href,
  external,
  icon,
  full = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  href?: string;
  external?: boolean;
  icon?: string;
  full?: boolean;
}) {
  const styles = {
    primary: { background: "var(--accent)", color: "#FEFDFF", border: "1px solid var(--accent)" },
    ghost: { background: "transparent", color: "var(--text)", border: "1px solid var(--line-strong)" },
    danger: { background: "transparent", color: "var(--peach)", border: "1px solid var(--peach)" },
  }[variant];

  const cls = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-app px-4 text-[14px] font-bold transition-smooth active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60 ${
    full ? "flex-1" : ""
  }`;

  const inner = (
    <>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cls}
        style={styles}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={styles}>
      {inner}
    </button>
  );
}
