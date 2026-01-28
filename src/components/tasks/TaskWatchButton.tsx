import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTaskWatchers } from "@/hooks/useTaskWatchers";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskWatchButtonProps {
  taskId: string;
  showWatchers?: boolean;
  className?: string;
}

export function TaskWatchButton({ 
  taskId, 
  showWatchers = true,
  className 
}: TaskWatchButtonProps) {
  const { 
    watchers, 
    isWatching, 
    toggleWatch, 
    isUpdating, 
    isLoading 
  } = useTaskWatchers(taskId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isWatching ? "default" : "outline"}
            size="sm"
            onClick={toggleWatch}
            disabled={isUpdating || isLoading}
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
        </TooltipTrigger>
        <TooltipContent>
          {isWatching 
            ? "You'll be notified of changes. Click to stop watching."
            : "Watch this task to get notified of updates."
          }
        </TooltipContent>
      </Tooltip>

      {showWatchers && watchers.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex -space-x-2">
              {watchers.slice(0, 3).map((watcher) => (
                <Avatar key={watcher.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={watcher.profile?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {watcher.profile?.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {watchers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    +{watchers.length - 3}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium mb-1">{watchers.length} watching</p>
            <ul className="text-metadata text-muted-foreground">
              {watchers.map((w) => (
                <li key={w.id}>{w.profile?.name || 'Unknown'}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}