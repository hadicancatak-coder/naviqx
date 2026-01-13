import { useNavigate } from "react-router-dom";
import { CheckSquare, AlertCircle, Calendar, Activity, ChevronRight, Timer, RotateCcw } from "lucide-react";
import { DataCard } from "@/components/layout/DataCard";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { isToday } from "date-fns";

export function MyTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useDashboardData();
  const { data: tasks } = useTasks();

  const taskCounts = data?.taskCounts ?? { today: 0, overdue: 0, thisWeek: 0, inProgress: 0, stale: 0 };

  // Calculate recurring tasks due today (instances with occurrence_date = today)
  const recurringTodayCount = useMemo(() => {
    if (!tasks || !user) return 0;

    return tasks.filter((task: any) => {
      // Is it a recurring instance?
      const isRecurringInstance = !!task.template_task_id;
      const isLegacyRecurring = task.task_type === 'recurring' || task.recurrence_rrule;
      
      if (!isRecurringInstance && !isLegacyRecurring) return false;
      
      // Not completed
      if (task.status === 'Completed') return false;
      
      // Check if assigned to current user
      const isAssigned = task.assignees?.some((a: any) => a.user_id === user.id);
      if (!isAssigned) return false;
      
      // Check if due today
      if (task.occurrence_date && isToday(new Date(task.occurrence_date))) {
        return true;
      }
      if (task.due_at && isToday(new Date(task.due_at))) {
        return true;
      }
      
      return false;
    }).length;
  }, [tasks, user]);

  const stats = [
    { 
      icon: Calendar, 
      label: "Due Today", 
      value: taskCounts.today, 
      color: "text-primary", 
      bg: "bg-primary/10",
      onClick: () => navigate('/tasks?filter=today')
    },
    { 
      icon: AlertCircle, 
      label: "Overdue", 
      value: taskCounts.overdue, 
      color: "text-destructive", 
      bg: "bg-destructive/10",
      onClick: () => navigate('/tasks?filter=overdue')
    },
    { 
      icon: Activity, 
      label: "In Progress", 
      value: taskCounts.inProgress, 
      color: "text-success", 
      bg: "bg-success/10",
      onClick: () => navigate('/tasks?filter=in-progress')
    },
    { 
      icon: Timer, 
      label: "Stale", 
      value: taskCounts.stale, 
      color: "text-warning", 
      bg: "bg-warning/10",
      onClick: () => navigate('/tasks?filter=stale')
    },
    { 
      icon: RotateCcw, 
      label: "Recurring Today", 
      value: recurringTodayCount, 
      color: "text-info", 
      bg: "bg-info/10",
      onClick: () => navigate('/tasks')
    },
  ];

  if (isLoading) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="h-6 bg-muted rounded w-32 mb-md animate-pulse" />
        <div className="grid grid-cols-2 gap-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard className="hover:shadow-soft transition-smooth">
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-heading-sm font-semibold text-foreground">My Tasks</h2>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-body-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-sm">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="flex items-center gap-sm p-sm rounded-lg bg-card hover:bg-card-hover border border-border/50 transition-smooth text-left group"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-heading-sm font-semibold text-foreground">{stat.value}</p>
              <p className="text-metadata text-muted-foreground truncate">{stat.label}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </DataCard>
  );
}
