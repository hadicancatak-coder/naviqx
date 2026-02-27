import { cn } from "@/lib/utils";

interface AppStoreFieldCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function AppStoreFieldCounter({ current, max, className }: AppStoreFieldCounterProps) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const status = pct > 95 ? "destructive" : pct > 75 ? "warning" : "success";

  return (
    <div className={cn("flex items-center gap-xs", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-smooth",
            status === "success" && "bg-success",
            status === "warning" && "bg-warning",
            status === "destructive" && "bg-destructive",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={cn(
        "text-metadata tabular-nums",
        status === "destructive" ? "text-destructive-text" : "text-muted-foreground",
      )}>
        {current}/{max}
      </span>
    </div>
  );
}
