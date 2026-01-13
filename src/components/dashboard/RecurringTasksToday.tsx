import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Flame, CheckCircle2, Calendar, ChevronRight } from "lucide-react";
import { DataCard } from "@/components/layout/DataCard";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { expandRecurringTask } from "@/lib/recurrenceExpander";
import { RecurringCompletionToggle } from "@/components/tasks/RecurringCompletionToggle";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";

export function RecurringTasksToday() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useTasks();

  const recurringTasksToday = useMemo(() => {
    if (!tasks || !user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks
      .filter((task: any) => {
        // Is it a recurring task?
        if (task.task_type !== 'recurring' && !task.recurrence_rrule) return false;
        // Is user assigned?
        const isAssigned = task.assignees?.some((a: any) => a.user_id === user.id);
        if (!isAssigned) return false;
        // Is it scheduled for today?
        const occurrences = expandRecurringTask(task, today, tomorrow, [], task.assignees || []);
        return occurrences.some(o => isToday(o.occurrenceDate));
      })
      .slice(0, 5); // Show max 5
  }, [tasks, user]);

  if (isLoading) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="h-6 bg-muted rounded w-48 mb-md animate-pulse" />
        <div className="space-y-sm">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </DataCard>
    );
  }

  if (recurringTasksToday.length === 0) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="flex items-center gap-sm mb-md">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <RotateCcw className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-heading-sm font-semibold text-foreground">Recurring Today</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-lg text-center">
          <div className="w-12 h-12 rounded-full bg-success-soft flex items-center justify-center mb-sm">
            <CheckCircle2 className="h-6 w-6 text-success-text" />
          </div>
          <p className="text-body-sm text-muted-foreground">No recurring tasks for today!</p>
          <p className="text-metadata text-muted-foreground mt-1">Enjoy your day 🎉</p>
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard className="hover:shadow-soft transition-smooth">
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <RotateCcw className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-heading-sm font-semibold text-foreground">Recurring Today</h2>
        </div>
        <Badge variant="secondary" className="font-medium">
          {recurringTasksToday.length}
        </Badge>
      </div>
      
      <div className="space-y-sm">
        {recurringTasksToday.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-sm rounded-lg bg-card hover:bg-card-hover border border-border/50 transition-smooth group"
          >
            <div className="flex items-center gap-sm flex-1 min-w-0">
              <RecurringCompletionToggle taskId={task.id} compact />
              <span 
                className="text-body-sm text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(`/tasks?task=${task.id}`)}
              >
                {task.title}
              </span>
            </div>
            <ChevronRight 
              className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => navigate(`/tasks?task=${task.id}`)}
            />
          </div>
        ))}
      </div>

      {tasks && tasks.filter((t: any) => t.task_type === 'recurring' || t.recurrence_rrule).length > 5 && (
        <button
          onClick={() => navigate('/tasks?filter=recurring')}
          className="mt-md w-full text-center text-body-sm text-primary hover:underline"
        >
          View all recurring tasks →
        </button>
      )}
    </DataCard>
  );
}
