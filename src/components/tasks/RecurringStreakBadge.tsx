import { useRecurringCompletions } from "@/hooks/useRecurringCompletions";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { expandRecurringTask } from "@/lib/recurrenceExpander";

interface RecurringStreakBadgeProps {
  task: any;
  compact?: boolean;
}

export function RecurringStreakBadge({ task, compact = false }: RecurringStreakBadgeProps) {
  const { streak, isCompletedToday, isLoading } = useRecurringCompletions(task.id);

  if (isLoading) return null;

  // Check if task is due today based on recurrence
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const occurrences = expandRecurringTask(task, today, tomorrow, [], task.assignees || []);
  const isDueToday = occurrences.some(o => isToday(o.occurrenceDate));

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {isDueToday && !isCompletedToday && (
          <Badge 
            variant="outline" 
            className="text-metadata px-1 py-0 h-4 bg-success-soft border-success/30 text-success-text flex-shrink-0 rounded-full animate-pulse"
          >
            <Calendar className="h-2.5 w-2.5" />
          </Badge>
        )}
        {streak > 1 && (
          <Badge 
            variant="outline" 
            className="text-metadata px-1 py-0 h-4 bg-warning-soft border-warning/30 text-warning-text flex-shrink-0 rounded-full"
          >
            <Flame className="h-2.5 w-2.5 mr-0.5" />
            {streak}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {isDueToday && !isCompletedToday && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded-full",
            "bg-success-soft border-success/30 text-success-text"
          )}
        >
          <Calendar className="h-2.5 w-2.5 mr-0.5" />
          Due Today
        </Badge>
      )}
      {isCompletedToday && (
        <Badge 
          variant="outline" 
          className="text-metadata px-1.5 py-0 h-4 bg-muted border-border text-muted-foreground flex-shrink-0 rounded-full"
        >
          ✓ Done
        </Badge>
      )}
      {streak > 1 && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded-full",
            streak >= 7 
              ? "bg-destructive/10 border-destructive/30 text-destructive" 
              : "bg-warning-soft border-warning/30 text-warning-text"
          )}
        >
          <Flame className="h-2.5 w-2.5 mr-0.5" />
          {streak} day streak
        </Badge>
      )}
    </div>
  );
}
