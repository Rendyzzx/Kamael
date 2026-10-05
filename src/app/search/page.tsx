import type { Metadata } from "next";
import Link from "next/link";
import AnimeCard from "@/components/cards/AnimeCard";
import DonghuaCard from "@/components/cards/DonghuaCard";
import SectionHeader from "@/components/ui/SectionHeader";
import SearchBox from "@/components/navbar/SearchBox";
import { searchAnime } from "@/lib/api/anime";
import { searchDonghua } from "@/lib/api/donghua";
import { sanitizeSearchQuery } from "@/lib/utils/validation";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);
  return {
    title: q ? `Pencarian: ${q}` : "Pencarian",
    robots: { index: false },
  };
}

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sanitizeSearchQuery(sp.q);

  if (q.length < 2) {
    return (
      <div style={{ padding: "0 var(--page-x)" }}>
        <SearchBox />
        <div className="mt-8 space-y-6">
          <h1 className="font-display text-[18px] font-bold text-white">Pencarian</h1>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Ketik minimal 2 karakter pada kolom pencarian di atas.
          </p>
        </div>
      </div>
    );
  }

  // Hasil TETAP dipisah per kategori; jika salah satu sumber gagal, bagian
  // tersebut menampilkan fallback, bukan error mentah.
  const [animeRes, donghuaRes] = await Promise.allSettled([
    searchAnime(q),
    searchDonghua(q),
  ]);

  const anime = animeRes.status === "fulfilled" ? animeRes.value : [];
  const donghua = donghuaRes.status === "fulfilled" ? donghuaRes.value : [];
  const animeFailed = animeRes.status === "rejected";
  const donghuaFailed = donghuaRes.status === "rejected";

  return (
    <div style={{ padding: "0 var(--page-x)" }}>
      <SearchBox />
      <div className="mt-4 space-y-8">
        <div>
          <h1 className="font-display text-[18px] font-bold text-white">
            Hasil pencarian: <span style={{ color: "var(--blue)" }}>{q}</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
            {anime.length} anime · {donghua.length} donghua
          </p>
        </div>

        <section aria-labelledby="hasil-anime">
          <SectionHeader title="Anime" />
          {anime.length ? (
            <div className="grid grid-cols-3 gap-3">
              {anime.map((a) => (
                <AnimeCard key={a.animeId} anime={a} />
              ))}
            </div>
          ) : (
            <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
              {animeFailed ? "Data sedang tidak tersedia. Silakan coba beberapa saat lagi." : "Tidak ada anime yang cocok."}
            </p>
          )}
        </section>

        <section aria-labelledby="hasil-donghua">
          <SectionHeader title="Donghua" />
          {donghua.length ? (
            <div className="grid grid-cols-3 gap-3">
              {donghua.map((d) => (
                <DonghuaCard key={d.slug} donghua={d} href={`/donghua/${d.slug}`} />
              ))}
            </div>
          ) : (
            <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
              {donghuaFailed ? "Data sedang tidak tersedia. Silakan coba beberapa saat lagi." : "Tidak ada donghua yang cocok."}
            </p>
          )}
        </section>

        <p className="text-center text-sm" style={{ color: "var(--text-2)" }}>
          Tidak menemukan yang dicari?{" "}
          <Link href="/anime" className="font-semibold" style={{ color: "var(--blue)" }}>
            Jelajahi semua anime
          </Link>{" "}
          atau{" "}
          <Link href="/donghua" className="font-semibold" style={{ color: "var(--blue)" }}>
            semua donghua
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
