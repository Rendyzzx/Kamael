import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { listFavorites } from "@/lib/redis/favorites";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Anime dan donghua favorit yang kamu simpan di Cyronime.",
};

export default async function FavoritesPage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-5 px-4 text-center">
        <h1 className="font-display text-[18px] font-semibold text-white">Login untuk melihat favorites</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Simpan anime &amp; donghua favorit ke akunmu agar tersedia di semua perangkat.
        </p>
        <div className="w-full">
          <GoogleLoginButton callbackUrl="/favorites" />
        </div>
      </div>
    );
  }

  // Anime dan Donghua tetap dipisah.
  const [animeFavorites, donghuaFavorites] = await Promise.all([
    listFavorites(userId, "anime"),
    listFavorites(userId, "donghua"),
  ]);

  return (
    <div style={{ padding: "0 var(--page-x)" }} className="mx-auto max-w-md space-y-8">
      <h1 className="font-display text-[18px] font-bold text-white">Favorites</h1>

      <section aria-labelledby="favorites-anime">
        <SectionHeader title="Anime" />
        {animeFavorites.length === 0 ? (
          <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
            Belum ada anime favorit. Tambahkan lewat tombol ♥ di halaman detail anime.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {animeFavorites.map((f) => (
              <FavoriteCard key={f.contentId} favorite={f} href={`/anime/${f.contentId}`} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="favorites-donghua">
        <SectionHeader title="Donghua" />
        {donghuaFavorites.length === 0 ? (
          <p className="rounded-app p-4 text-sm" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
            Belum ada donghua favorit. Tambahkan lewat tombol ♥ di halaman detail donghua.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {donghuaFavorites.map((f) => (
              <FavoriteCard key={f.contentId} favorite={f} href={`/donghua/${f.contentId}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FavoriteCard({
  favorite,
  href,
}: {
  favorite: { contentId: string; title: string; poster: string };
  href: string;
}) {
  return (
    <Link href={href} className="group block" aria-label={favorite.title}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-card" style={{ background: "var(--surface)" }}>
        {favorite.poster ? (
          <Image
            src={favorite.poster}
            alt={favorite.title}
            fill
            sizes="(max-width: 640px) 33vw, 160px"
            className="object-cover transition-smooth group-hover:scale-105"
          />
        ) : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-white">
        {favorite.title || favorite.contentId}
      </h3>
    </Link>
  );
}
