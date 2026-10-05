/** Chip info kecil (status, rating teks, dll) — bg --surface-3, teks 14px. */
export default function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const toneStyle: Record<string, React.CSSProperties> = {
    default: { background: "rgba(33,150,243,.16)", color: "var(--blue)" },
    success: { background: "rgba(76,175,80,.16)", color: "#8BC34A" },
    muted: { background: "var(--surface-3)", color: "var(--text)" },
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
