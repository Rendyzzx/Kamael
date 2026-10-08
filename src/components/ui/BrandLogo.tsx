/**
 * Wordmark Cyronime — matahari senja di garis horizon, digambar tangan
 * (path tidak simetris). Dipakai di header Home, login, dan onboarding
 * supaya identitasnya satu saja.
 */
export default function BrandLogo({ size = 21 }: { size?: number }) {
  return (
    <span className="font-display inline-flex items-center gap-2 font-bold tracking-tight text-[var(--text)]">
      <svg
        width={size + 3}
        height={size + 3}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4.5 17.6h15.2" stroke="var(--lavender)" strokeWidth="1.75" strokeLinecap="round" />
        <path
          d="M12 4.9c3.9 0 6.7 2.7 6.7 6.4 0 2.5-1.6 4.7-3.9 5.7"
          stroke="var(--text)"
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M12 4.9c-3.9 0-6.7 2.7-6.7 6.4 0 2.5 1.6 4.7 3.9 5.7"
          stroke="var(--text-2)"
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M12 13.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z" fill="var(--text)" />
      </svg>
      Cyronime
    </span>
  );
}
