/**
 * Row horizontal-scroll untuk section konten (Anime Terbaru, Popular, dst).
 * Mobile: swipe horizontal natural (overflow-x-auto + snap).
 * Tidak memaksa semua card masuk grid kecil.
 */
export default function HorizontalRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory sm:gap-4">
      {children}
    </div>
  );
}
