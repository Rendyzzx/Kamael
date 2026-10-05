import { CardSkeletonGrid } from "@/components/ui/Skeleton";

export default function AnimeLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-10 w-72" />
      <CardSkeletonGrid count={12} />
    </div>
  );
}
