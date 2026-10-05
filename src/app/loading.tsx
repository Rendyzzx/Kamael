import { CardSkeletonGrid } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="skeleton h-10 w-2/3 max-w-md" />
        <div className="skeleton h-4 w-1/2 max-w-sm" />
        <div className="skeleton h-10 w-64" />
      </div>
      <div className="space-y-8">
        <div>
          <div className="skeleton mb-4 h-6 w-48" />
          <CardSkeletonGrid count={12} />
        </div>
        <div>
          <div className="skeleton mb-4 h-6 w-48" />
          <CardSkeletonGrid count={12} />
        </div>
      </div>
    </div>
  );
}
