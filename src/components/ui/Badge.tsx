/** Chip info kecil (status, rating teks, dll) — bg --surface-3, teks 14px. */
export default function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const toneStyle: Record<string, React.CSSProperties> = {
    default: { background: "var(--surface-2)", color: "var(--text-2)" },
    success: { background: "var(--surface-2)", color: "var(--peach)" },
    muted: { background: "var(--surface)", color: "var(--text)" },
  };
  return (
    <span
      className="inline-flex items-center rounded-chip px-3.5 py-0 text-[14px] font-medium"
      style={{ height: 32, ...toneStyle[tone] }}
    >
      {children}
    </span>
  );
}
