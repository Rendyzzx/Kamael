import { CardSkeletonGrid } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-10">
      <div className="skeleton h-8 w-72" />
      <div>
        <div className="skeleton mb-4 h-6 w-24" />
        <CardSkeletonGrid count={6} />
      </div>
      <div>
        <div className="skeleton mb-4 h-6 w-24" />
        <CardSkeletonGrid count={6} />
      </div>
    </div>
  );
}
