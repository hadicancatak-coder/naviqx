import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loading state for TaskDetail panel
 */
export function TaskDetailSkeleton() {
  return (
    <div className="p-md space-y-md">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-sm">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
