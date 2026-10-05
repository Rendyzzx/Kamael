/** Badge status kecil (Ongoing/Completed/dll). */
export default function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const tones = {
    default: "bg-accent-500/15 text-accent-500",
    success: "bg-emerald-500/15 text-emerald-400",
    muted: "bg-surface-700 text-zinc-300",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
