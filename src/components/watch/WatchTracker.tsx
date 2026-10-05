"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface WatchTrackerProps {
  type: "anime" | "donghua";
  contentId: string;
  episodeId: string;
  episode: number | null;
  title: string;
  poster: string;
}

/**
 * Catat activity menonton (continue watching + history) untuk user yang login.
 * Dijalankan SEKALI per halaman watch — bukan polling per detik — karena player
 * embed iframe pihak ketiga tidak mengekspos posisi video. Jika kelak dipakai
 * player native, komponen ini bisa dikembangkan untuk sync position berkala.
 */
export default function WatchTracker(props: WatchTrackerProps) {
  const { status } = useSession();
  const postedRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || postedRef.current) return;
    postedRef.current = true;

    fetch("/api/watch/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(props),
    }).catch(() => {
      // Kegagalan Redis tidak boleh mengganggu nonton; abaikan.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
