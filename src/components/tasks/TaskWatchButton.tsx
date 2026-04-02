import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTaskWatchers } from "@/hooks/useTaskWatchers";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskWatchButtonProps {
  taskId: string;
  showWatchers?: boolean;
  className?: string;
}

export function TaskWatchButton({
  taskId,
  showWatchers = true,
  className,
}: TaskWatchButtonProps) {
  const {
    watchers,
    isWatching,
    toggleWatch,
    isUpdating,
    isLoading,
  } = useTaskWatchers(taskId);

  const watchActionLabel = isWatching
    ? "You'll be notified of changes. Click to stop watching."
    : "Watch this task to get notified of updates.";

  const watchersSummary = watchers
    .map((watcher) => watcher.profile?.name || "Unknown")
    .join(", ");

  return (
    <div className={cn("flex items-center gap-sm", className)}>
      <Button
        variant={isWatching ? "default" : "outline"}
        size="sm"
        onClick={toggleWatch}
        disabled={isUpdating || isLoading}
        title={watchActionLabel}
        aria-label={watchActionLabel}
        className={cn(
          "gap-xs",
          isWatching && "bg-info hover:bg-info/90 text-info-foreground"
        )}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isWatching ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        {isWatching ? "Watching" : "Watch"}
      </Button>

      {showWatchers && watchers.length > 0 && (
        <div
          className="flex -space-x-2"
          title={`${watchers.length} watching${watchersSummary ? `: ${watchersSummary}` : ""}`}
          aria-label={`${watchers.length} watching${watchersSummary ? `: ${watchersSummary}` : ""}`}
        >
          {watchers.slice(0, 3).map((watcher) => (
            <Avatar key={watcher.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={watcher.profile?.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {watcher.profile?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {watchers.length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted">
              <span className="text-[10px] text-muted-foreground">
                +{watchers.length - 3}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
