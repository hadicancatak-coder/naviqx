import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-sm py-md border-b border-border">
          <Skeleton className="h-5 w-5 rounded shrink-0" />
          <div className="flex-1 space-y-xs">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
