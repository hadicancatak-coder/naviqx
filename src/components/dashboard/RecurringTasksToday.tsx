import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, CheckCircle2, ChevronRight } from "lucide-react";
import { DataCard } from "@/components/layout/DataCard";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { completeTask } from "@/domain/tasks/actions";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function RecurringTasksToday() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get recurring task instances that are due today
  const recurringTasksToday = useMemo(() => {
    if (!tasks || !user) return [];

    const today = new Date();

    return tasks
      .filter((task) => {
        // Is it a recurring instance (has template_task_id) OR legacy recurring task?
        const isRecurringInstance = !!task.template_task_id;
        const isLegacyRecurring = task.task_type === 'recurring' || task.recurrence_rrule;
        
        if (!isRecurringInstance && !isLegacyRecurring) return false;
        
        // Not completed
        if (task.status === 'Completed') return false;
        
        // Is user assigned?
        const isAssigned = task.assignees?.some((a) => a.user_id === user.id);
        if (!isAssigned) return false;
        
        // For new instances, check if due today via occurrence_date or due_at
        if (isRecurringInstance) {
          if (task.occurrence_date) {
            return isToday(new Date(task.occurrence_date));
          }
          if (task.due_at) {
            return isToday(new Date(task.due_at));
          }
        }
        
        // For legacy recurring tasks, check due_at
        if (task.due_at && isToday(new Date(task.due_at))) {
          return true;
        }
        
        return false;
      })
      .slice(0, 5); // Show max 5
  }, [tasks, user]);

  const handleComplete = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.success) {
      toast({ title: "Task completed!", duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

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
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {recurringTasksToday.map((task: any) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-sm rounded-lg bg-card hover:bg-card-hover border border-border/50 transition-smooth group"
          >
            <div className="flex items-center gap-sm flex-1 min-w-0">
              <Checkbox
                checked={task.status === 'Completed'}
                onCheckedChange={() => handleComplete(task.id)}
                className="h-4 w-4"
              />
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

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {tasks && tasks.filter((t: any) => t.template_task_id || t.task_type === 'recurring').length > 5 && (
        <button
          onClick={() => navigate('/tasks')}
          className="mt-md w-full text-center text-body-sm text-primary hover:underline"
        >
          View all recurring tasks →
        </button>
      )}
    </DataCard>
  );
}
