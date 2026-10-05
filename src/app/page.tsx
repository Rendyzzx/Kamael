import { redirect } from "next/navigation";
import EntryPortal from "@/components/portal/EntryPortal";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { getOngoingAnime } from "@/lib/api/anime";
import { getLatestDonghua } from "@/lib/api/donghua";
import { getPreference } from "@/lib/redis/preference";
import { readVisitorId } from "@/lib/visitor";

/**
 * "/" = gerbang portal pembuka (server-side, tanpa flicker):
 * 1. Identitas: user ID (login) atau visitor ID dari cookie httpOnly.
 * 2. Cek Redis pref:{id}. Jika sudah pernah memilih → redirect() langsung ke
 *    /anime atau /donghua SEBELUM render apa pun (tanpa portal, tanpa flicker).
 * 3. Jika belum → render portal fullscreen pilihan Anime / Donghua.
 *
 * URL dalam seperti /anime/xxx TIDAK lewat sini — hanya "/" yang memeriksa.
 * Redis down/timeout → getPreference null → portal tampil (kondisi aman).
 */
export default async function PortalPage() {
  const userId = await getAuthenticatedUserId();
  const id = userId ?? (await readVisitorId());

  if (id) {
    const preference = await getPreference(id);
    if (preference === "anime") redirect("/anime");
    if (preference === "donghua") redirect("/donghua");
  }

  // Poster latar kartu: ambil 1 poster terbaru tiap kategori dari API sumber
  // (sudah melewati cache Redis/Next). Gagal → kartu tetap tampil dengan
  // gradient saja.
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
