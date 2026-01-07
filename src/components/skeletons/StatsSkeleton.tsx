import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex items-center gap-lg lg:gap-xl py-lg border-b border-border overflow-x-auto">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-1 min-w-[120px]">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-10 w-16" />
        </div>
      ))}
    </div>
  );
}
