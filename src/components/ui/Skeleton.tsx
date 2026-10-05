/** Blok skeleton untuk grid card (shimmer --surface-2, lihat .skeleton di globals.css). */
export function CardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton aspect-[3/4] w-full rounded-card" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton halaman detail (hero + konten). */
export function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton w-full" style={{ height: 400, borderRadius: 0 }} />
      <div className="space-y-4" style={{ padding: "24px var(--page-x-detail) 0" }}>
        <div className="skeleton h-8 w-2/3 rounded-app" />
        <div className="skeleton h-4 w-1/3 rounded-app" />
        <div className="flex gap-2">
          <div className="skeleton w-24 rounded-chip" style={{ height: 32 }} />
          <div className="skeleton w-24 rounded-chip" style={{ height: 32 }} />
          <div className="skeleton w-24 rounded-chip" style={{ height: 32 }} />
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full rounded-app" />
          ))}
        </div>
      </div>
    </div>
  );
}
