/**
 * Row horizontal-scroll untuk section konten. Padding kiri konsisten dengan
 * --page-x agar kartu pertama tidak mepet tepi layar.
 */
export default function HorizontalRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
      style={{ gap: 12, marginLeft: "calc(-1 * var(--page-x))", marginRight: "calc(-1 * var(--page-x))", paddingLeft: "var(--page-x)", paddingRight: "var(--page-x)" }}
    >
      {children}
    </div>
  );
}
