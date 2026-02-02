import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDaysOverdue } from "@/lib/overdueHelpers";
import { logger } from "@/lib/logger";

export function OverdueTasks() {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchOverdueTasks();
    }
  }, [user?.id]);

  const fetchOverdueTasks = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setOverdueTasks([]);
        setLoading(false);
        return;
      }

      const { data: assignedTasks } = await supabase
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", profile.id);

      const taskIds = assignedTasks?.map(a => a.task_id) || [];

      if (taskIds.length === 0) {
        setOverdueTasks([]);
        setLoading(false);
        return;
      }

      // Exclude Backlog (not started) and Completed tasks from overdue
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds)
        .lt("due_at", today.toISOString())
        .not("status", "in", "(Completed,Backlog)")
        .order("due_at", { ascending: true })
        .limit(5);

      setOverdueTasks(tasks || []);
    } catch (err) {
      logger.error('Error fetching overdue tasks:', err);
      setOverdueTasks([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-sm">
        <div className="h-6 bg-muted rounded w-40"></div>
        <div className="h-4 bg-muted rounded w-32"></div>
      </div>
    );
  }

  if (overdueTasks.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-sm mb-md">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-section-title text-foreground">Overdue Tasks</h2>
        </div>
        <p className="text-body text-muted-foreground">
          No overdue tasks. Great work! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-destructive pl-lg">
      <div className="flex items-center gap-sm mb-md">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-section-title text-foreground">Overdue Tasks</h2>
        <Badge variant="destructive">{overdueTasks.length}</Badge>
      </div>
      
      <div className="space-y-sm">
        {overdueTasks.map((task) => {
          const daysOverdue = getDaysOverdue(task.due_at);
          return (
            <div key={task.id} className="flex items-start gap-sm py-sm border-b border-border last:border-0 hover:bg-muted/30 transition-smooth cursor-pointer">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-body text-foreground">{task.title}</p>
                <p className="text-metadata text-destructive">
                  {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                </p>
                <p className="text-metadata text-muted-foreground">
                  Due: {format(new Date(task.due_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
