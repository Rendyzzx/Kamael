export default function WatchLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton aspect-video w-full rounded-lg" />
      <div className="space-y-3">
        <div className="skeleton h-6 w-1/2 max-w-sm" />
        <div className="skeleton h-4 w-32" />
        <div className="flex gap-2">
          <div className="skeleton h-10 w-28" />
          <div className="skeleton h-10 w-32" />
          <div className="skeleton h-10 w-20" />
        </div>
      </div>
    </div>
  );
}
