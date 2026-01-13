import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Loader2 } from "lucide-react";
import { useRecurringCompletions } from "@/hooks/useRecurringCompletions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RecurringCompletionToggleProps {
  taskId: string;
  compact?: boolean;
  className?: string;
}

export function RecurringCompletionToggle({ 
  taskId, 
  compact = false,
  className 
}: RecurringCompletionToggleProps) {
  const { 
    isCompletedToday, 
    markDoneToday, 
    undoToday, 
    streak,
    isLoading 
  } = useRecurringCompletions(taskId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompletedToday) {
      undoToday.mutate();
    } else {
      markDoneToday.mutate();
    }
  };

  const isUpdating = markDoneToday.isPending || undoToday.isPending;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleToggle}
            disabled={isUpdating || isLoading}
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              isCompletedToday
                ? "bg-success border-success text-white"
                : "border-muted-foreground/40 hover:border-success hover:bg-success/10",
              className
            )}
          >
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isCompletedToday ? (
              <Check className="h-3 w-3" />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p>{isCompletedToday ? "Done today! Click to undo" : "Mark as done for today"}</p>
            {streak > 1 && (
              <p className="text-warning-text flex items-center gap-1 justify-center mt-1">
                <Flame className="h-3 w-3" />
                {streak} day streak!
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={isCompletedToday ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={isUpdating || isLoading}
        className={cn(
          "gap-xs",
          isCompletedToday && "bg-success hover:bg-success/90"
        )}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {isCompletedToday ? "Done Today" : "Mark Done"}
      </Button>
      
      {streak > 1 && (
        <Badge variant="secondary" className="bg-warning-soft text-warning-text gap-1">
          <Flame className="h-3 w-3" />
          {streak} day streak
        </Badge>
      )}
    </div>
  );
}