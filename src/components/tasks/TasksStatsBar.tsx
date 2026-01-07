import { useMemo } from "react";
import { CheckCircle2, Clock, AlertCircle, ListTodo } from "lucide-react";

interface Task {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TasksStatsBarProps {
  tasks: Task[];
}

export const TasksStatsBar = ({ tasks }: TasksStatsBarProps) => {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const completedToday = tasks.filter(
      (task) =>
        task.status === "Completed" &&
        new Date(task.updated_at) >= todayStart
    ).length;

    const completedThisWeek = tasks.filter(
      (task) =>
        task.status === "Completed" &&
        new Date(task.updated_at) >= weekStart
    ).length;

    const overdue = tasks.filter(
      (task) => task.status !== "Completed" && task.status !== "Failed"
    ).length;

    const ongoing = tasks.filter(
      (task) => task.status === "Ongoing"
    ).length;

    return {
      total: tasks.length,
      completedToday,
      completedThisWeek,
      overdue,
      ongoing,
    };
  }, [tasks]);

  return (
    <div className="flex items-center gap-lg py-lg px-xs border-b border-border overflow-x-auto">
      <div className="flex items-center gap-sm min-w-fit">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ListTodo className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-metadata text-muted-foreground">Total Tasks</div>
          <div className="text-heading-lg font-semibold text-foreground">{stats.total}</div>
        </div>
      </div>
      
      <div className="h-12 w-px bg-border" />
      
      <div className="flex items-center gap-sm min-w-fit">
        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <div className="text-metadata text-muted-foreground">Completed Today</div>
          <div className="text-heading-lg font-semibold text-success">{stats.completedToday}</div>
        </div>
      </div>
      
      <div className="h-12 w-px bg-border" />
      
      <div className="flex items-center gap-sm min-w-fit">
        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <div className="text-metadata text-muted-foreground">This Week</div>
          <div className="text-heading-lg font-semibold text-success">{stats.completedThisWeek}</div>
        </div>
      </div>
      
      <div className="h-12 w-px bg-border" />
      
      <div className="flex items-center gap-sm min-w-fit">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-metadata text-muted-foreground">In Progress</div>
          <div className="text-heading-lg font-semibold text-primary">{stats.ongoing}</div>
        </div>
      </div>
    </div>
  );
};
