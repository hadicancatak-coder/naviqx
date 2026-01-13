import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDaysSinceUpdate, getStaleLevel, isTaskStale } from "@/lib/staleTaskHelpers";

interface StaleBadgeProps {
  task: any;
  className?: string;
  showIcon?: boolean;
}

export function StaleBadge({ task, className, showIcon = true }: StaleBadgeProps) {
  if (!isTaskStale(task)) return null;

  const days = getDaysSinceUpdate(task);
  const level = getStaleLevel(task);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded-full",
            level === 'critical' 
              ? "bg-destructive/15 text-destructive border-destructive/30" 
              : "bg-warning/15 text-warning border-warning/30",
            className
          )}
        >
          {showIcon && <Clock className="h-2.5 w-2.5 mr-0.5" />}
          {days}d
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>No updates in {days} days</p>
        <p className="text-metadata text-muted-foreground">Consider updating or completing this task</p>
      </TooltipContent>
    </Tooltip>
  );
}
