import { CardSkeletonGrid } from "@/components/ui/Skeleton";

export default function DonghuaLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-10 w-72" />
      <CardSkeletonGrid count={12} />
    </div>
  );
}
