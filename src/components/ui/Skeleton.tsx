/** Blok skeleton untuk grid card. */
export function CardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton halaman detail. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <div className="skeleton aspect-[2/3] w-full max-w-[240px] shrink-0" />
      <div className="flex-1 space-y-4">
        <div className="skeleton h-9 w-3/4" />
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-4 w-2/3" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-3.5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
