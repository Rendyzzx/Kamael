import { redirect } from "next/navigation";
import EntryPortal from "@/components/portal/EntryPortal";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getOngoingAnime } from "@/lib/api/anime";
import { getLatestDonghua } from "@/lib/api/donghua";
import { getPreferenceStatus } from "@/lib/redis/preference";
import { readVisitorId } from "@/lib/visitor";

export const metadata = {
  title: "Pilih Portal",
  robots: { index: false },
};

/**
 * "/portal" = halaman TERPISAH untuk memilih Anime atau Donghua pertama kali
 * (bukan bagian dari Home — Home ("/") adalah dashboard trending sesuai
 * portal yang sudah dipilih).
 *
 * - Identitas: user ID (login) atau visitor ID dari cookie httpOnly.
 * - Sudah pernah memilih (Redis terjangkau & ada value) -> redirect("/")
 *   langsung, tanpa menampilkan portal lagi.
 * - Redis tidak terjangkau -> TETAP tampilkan portal (tidak redirect buta;
 *   lihat getPreferenceStatus) supaya tidak ada kondisi aneh menebak status.
 * - Belum pernah memilih -> render kartu pilihan fullscreen.
 */
export default async function PortalPage() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());

  if (id) {
    const status = await getPreferenceStatus(id);
    if (status.redisOk && status.value) redirect("/");
  }

  // Poster latar kartu: 1 poster terbaru tiap kategori. Gagal -> kartu tetap
  // tampil dengan gradient saja.
  const [animePoster, donghuaPoster] = await Promise.all([
    getOngoingAnime(1)
      .then((res) => res.items[0]?.poster ?? null)
      .catch(() => null),
    getLatestDonghua(1)
      .then((items) => items[0]?.poster ?? null)
      .catch(() => null),
  ]);

  return <EntryPortal animePoster={animePoster} donghuaPoster={donghuaPoster} />;
}
