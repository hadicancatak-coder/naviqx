import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { useEffect, useState } from "react";
import { getUpcomingTasks } from "@/lib/dashboardQueries";
import { useAuth } from "@/hooks/useAuth";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";

export function WhatsNext() {
  const { user } = useAuth();
  const { openTaskDrawer } = useTaskDrawer();
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchUpcomingTasks();
    }
  }, [user?.id]);

  const fetchUpcomingTasks = async () => {
    if (!user?.id) return;
    const data = await getUpcomingTasks(user.id, 5);
    setUpcomingTasks(data);
  };

  const getDateLabel = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isThisWeek(d)) return format(d, "EEEE");
    return format(d, "MMM d");
  };

  const handleTaskClick = (task: any) => {
    openTaskDrawer(task.id, task);
  };

  return (
    <div>
      <h2 className="text-section-title text-foreground mb-md">What's Next</h2>
      <div className="space-y-sm max-h-[400px] overflow-y-auto">
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="flex items-center justify-between py-sm border-b border-border hover:bg-muted/30 transition-smooth cursor-pointer"
            >
              <div className="flex-1">
                <h3 className="font-medium text-body text-foreground mb-1">{task.title}</h3>
                {task.description && (
                  <p className="text-metadata text-muted-foreground line-clamp-1 mb-1">
                    {task.description.replace(/<[^>]*>/g, '')}
                  </p>
                )}
                <p className="text-metadata">
                  {task.assignees && task.assignees.length > 0 
                    ? task.assignees.map((a: any) => a.name).join(", ")
                    : "Unassigned"}
                </p>
              </div>
              <Badge variant="outline" className="ml-md">
                {task.due_at ? getDateLabel(task.due_at) : "No date"}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-body text-muted-foreground text-center py-lg">No upcoming tasks</p>
        )}
      </div>
    </div>
  );
}
