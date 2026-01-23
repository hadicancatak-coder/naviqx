import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CompletedTask {
  id: string;
  title: string;
  updated_at: string;
  completed_by: string | null;
}

export function RecentlyCompletedTicker() {
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ["recently-completed-ticker"],
    queryFn: async () => {
      // Single query with join - eliminates N+1 problem
      const { data: completedTasks, error } = await supabase
        .from("tasks")
        .select(`
          id, 
          title, 
          updated_at,
          task_assignees(profiles:user_id(name))
        `)
        .eq("status", "Completed")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform data to expected format
      return (completedTasks || []).map(task => ({
        id: task.id,
        title: task.title,
        updated_at: task.updated_at,
        completed_by: (task.task_assignees as any)?.[0]?.profiles?.name || null,
      })) as CompletedTask[];
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const truncateTitle = (title: string, maxLength = 30) => {
    return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
  };

  const handleClick = () => {
    navigate("/tasks?filter=completed");
  };

  if (!tasks || tasks.length === 0) {
    return null;
  }

  // Duplicate items for seamless loop
  const items = [...tasks, ...tasks];

  return (
    <div 
      className="bg-elevated rounded-lg border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-smooth"
      onClick={handleClick}
    >
      <div className="flex items-center gap-xs px-sm py-xs border-b border-border bg-muted/30">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span className="text-xs font-medium text-muted-foreground">Recently Completed</span>
      </div>
      
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`flex gap-lg py-sm px-md ${isPaused ? "" : "animate-ticker"}`}
          style={{
            width: "max-content",
          }}
        >
          {items.map((task, index) => (
            <div
              key={`${task.id}-${index}`}
              className="flex items-center gap-xs text-body-sm whitespace-nowrap hover:text-primary transition-colors"
            >
              <span className="text-foreground font-medium">
                {truncateTitle(task.title)}
              </span>
              {task.completed_by && (
                <span className="text-muted-foreground">
                  by {task.completed_by}
                </span>
              )}
              <span className="text-muted-foreground/60 text-xs">
                {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
              </span>
              <span className="text-border">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
