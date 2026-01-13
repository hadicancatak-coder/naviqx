import { useRecurringCompletions } from "@/hooks/useRecurringCompletions";
import { format, subDays, isSameDay } from "date-fns";
import { Check, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RecurringCompletionHistoryProps {
  taskId: string;
  days?: number;
}

export function RecurringCompletionHistory({ taskId, days = 14 }: RecurringCompletionHistoryProps) {
  const { completions, streak, isLoading } = useRecurringCompletions(taskId);

  if (isLoading) {
    return (
      <div className="flex gap-1">
        {Array.from({ length: days }).map((_, i) => (
          <div key={i} className="w-6 h-6 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const completionDates = new Set(completions.map(c => c.completed_date));
  const today = new Date();
  
  // Generate last N days
  const daysList = Array.from({ length: days }).map((_, i) => {
    const date = subDays(today, days - 1 - i);
    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayOfWeek: format(date, 'EEE'),
      dayNum: format(date, 'd'),
      isToday: isSameDay(date, today),
    };
  });

  return (
    <div className="space-y-sm">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-medium text-muted-foreground">
          Last {days} days
        </span>
        {streak > 1 && (
          <span className="text-body-sm text-warning-text flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            {streak} day streak
          </span>
        )}
      </div>
      
      <div className="flex gap-1 flex-wrap">
        {daysList.map(({ date, dateStr, dayOfWeek, dayNum, isToday }) => {
          const isCompleted = completionDates.has(dateStr);
          
          return (
            <Tooltip key={dateStr}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-7 h-7 rounded flex items-center justify-center text-metadata transition-colors",
                    isCompleted
                      ? "bg-success text-white"
                      : isToday
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px]">{dayNum}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{format(date, 'MMM d, yyyy')}</p>
                <p className="text-muted-foreground">
                  {isCompleted ? 'Completed' : 'Not completed'}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}