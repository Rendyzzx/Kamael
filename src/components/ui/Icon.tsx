/**
 * Set ikon inti Cyronime — bukan icon-font generik (Material Symbols dipakai
 * di tempat lain untuk ikon sekunder/jarang terlihat; 8 ikon INTI di sini
 * digambar manual: beranda, anime, donghua, cari, profil, putar, simpan, unduh).
 *
 * Gaya: grid 24px, stroke 1.75, ujung & sambungan bulat, proporsi sedikit
 * tidak simetris (bukan hasil generator rapi) — lihat tiap path, titiknya
 * digeser dengan tangan, bukan dibuat dari lingkaran/kotak sempurna.
 *
 * State aktif = duotone ala cetak offset: bentuk isian amber DIGESER 1-2px
 * dari stroke-nya (misregistration), bukan sekadar versi filled polos.
 */
export type IconName =
  | "home"
  | "anime"
  | "donghua"
  | "search"
  | "profile"
  | "play"
  | "save"
  | "download";

const PATHS: Record<IconName, { stroke: string; fill?: string }> = {
  home: {
    // Atap sedikit curam di sisi kanan, cerobong kecil asimetris di kiri.
    stroke:
      "M3.4 11.3 11.6 3.9c.24-.21.56-.21.8 0l8.2 7.4 M5.4 10.1V19.4c0 .33.27.6.6.6h3.2v-5.1c0-.33.27-.6.6-.6h3.9c.33 0 .6.27.6.6V20h3.3c.33 0 .6-.27.6-.6V10 M8.1 6.9V4.3h1.7v1.4",
    fill: "M4.9 11.5 12 5.1l7.3 6.6V19c0 .5-.4.9-.9.9h-3V15c0-.7-.5-1.3-1.2-1.3h-3.6c-.7 0-1.2.6-1.2 1.3v4.9H5.8c-.5 0-.9-.4-.9-.9z",
  },
  anime: {
    // Clapperboard sedikit miring — gigi atas tidak rata, mewakili "tontonan".
    stroke:
      "M3.6 9.7 4.3 6.9c.07-.3.37-.48.67-.4l13.6 3.1-.7 2.9 M3.6 9.7h15.4c.5 0 .9.4.9.9v8.1c0 .5-.4.9-.9.9H4.5c-.5 0-.9-.4-.9-.9z M6.6 7 8 9.9 M11 7.9l1.4 2.9 M15.4 8.9l1.3 2.8 M10.3 13.6l4.1 2.4-4.1 2.4z",
  },
  donghua: {
    // Bintang 4 sudut sengaja tidak simetris — satu lengan lebih panjang.
    stroke: "M12 2.6c.6 4 2 7 6.2 8.2-4 .9-5.6 3.3-6.2 8.7-.5-4.4-2.1-7.5-6.4-8.4 4.2-1.2 5.7-4.1 6.4-8.5z",
    fill: "M12 2.6c.6 4 2 7 6.2 8.2-4 .9-5.6 3.3-6.2 8.7-.5-4.4-2.1-7.5-6.4-8.4 4.2-1.2 5.7-4.1 6.4-8.5z",
  },
  search: {
    // Pegangan kaca pembesar sedikit menekuk, bukan garis lurus sempurna.
    stroke: "M18.1 18.6c-.1.1-2.6-2.4-3.7-3.5a6.6 6.6 0 1 1 1.1-1.1c1.1 1.1 3.6 3.6 3.7 3.7 .3.3.2.6-.1.9-.3.3-.7.3-1-.0zM10.6 5.3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  },
  profile: {
    // Bahu tidak simetris, kepala sedikit oval bukan lingkaran sempurna.
    stroke:
      "M12.1 12.1c2.1 0 3.7-1.7 3.7-3.9S14.2 4.4 12.1 4.4 8.4 6.1 8.4 8.3s1.6 3.8 3.7 3.8z M4.6 19.8c.3-3.8 2.9-6 7.4-6 4.4 0 7.2 2.2 7.5 6",
  },
  play: {
    // Segitiga sedikit asimetris (bukan equilateral pas) — terasa digambar tangan.
    stroke: "M8.4 5.9c0-.9.9-1.4 1.7-.9l9.1 6c.8.5.8 1.7 0 2.2l-9.1 6.1c-.8.5-1.7 0-1.7-.9z",
    fill: "M8.4 5.9c0-.9.9-1.4 1.7-.9l9.1 6c.8.5.8 1.7 0 2.2l-9.1 6.1c-.8.5-1.7 0-1.7-.9z",
  },
  save: {
    // Pita bookmark dengan notch tidak simetris (sisi kanan lebih dalam).
    stroke:
      "M6.9 4.3h10.3c.5 0 .9.4.9.9v14.4c0 .4-.5.6-.8.4l-5.2-3.9c-.2-.1-.4-.1-.6 0l-5.4 3.9c-.3.2-.8 0-.8-.4V5.2c0-.5.4-.9.9-.9z",
  },
  download: {
    // Nampan bawah sedikit tidak rata, anak panah agak miring ke kiri.
    stroke:
      "M12.3 3.9v10.4 M8.9 11.4l3.2 3.4 3.6-3.6 M4.6 16.4v3c0 .6.5 1.1 1.1 1.1h12.9c.6 0 1.1-.5 1.1-1.1v-3",
  },
};

export default function Icon({
  name,
  size = 24,
  active = false,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  name: IconName;
  size?: number;
  /** Duotone offset amber — dipakai untuk state terpilih/aktif. */
  active?: boolean;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const def = PATHS[name];
  const isFilled = name === "donghua" || name === "play";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden={ariaHidden}
    >
      {active && def.fill ? (
        <path
          d={def.fill}
          fill="var(--amber)"
          opacity={0.85}
          transform="translate(1.3 -1.1)"
        />
      ) : null}
      <path
        d={def.stroke}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isFilled && active ? "none" : isFilled ? "currentColor" : "none"}
        fillOpacity={isFilled && !active ? 1 : 0}
      />
    </svg>
  );
}
