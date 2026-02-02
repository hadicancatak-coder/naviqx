import { useState } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProjectTasks } from "@/hooks/useProjects";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";

interface ProjectTasksSectionProps {
  projectId: string;
  projectName: string;
  isAdmin?: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  Backlog: <Circle className="h-4 w-4 text-muted-foreground" />,
  Ongoing: <Clock className="h-4 w-4 text-info-text" />,
  Completed: <CheckCircle2 className="h-4 w-4 text-success-text" />,
  Blocked: <AlertCircle className="h-4 w-4 text-destructive" />,
  Failed: <AlertCircle className="h-4 w-4 text-destructive" />,
};

const priorityColors: Record<string, string> = {
  High: "status-destructive",
  Medium: "status-warning",
  Low: "status-info",
};

export function ProjectTasksSection({ projectId, projectName, isAdmin }: ProjectTasksSectionProps) {
  const { tasks, isLoading } = useProjectTasks(projectId);
  const { openTaskDrawer } = useTaskDrawer();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleTaskClick = (taskId: string, task: { id: string; title: string; status: string }) => {
    openTaskDrawer(taskId, task);
  };

  const completedCount = tasks?.filter((t) => t.status === "Completed").length || 0;
  const totalCount = tasks?.length || 0;

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <h3 className="text-heading-sm font-semibold text-foreground">Tasks</h3>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-metadata">
              {completedCount}/{totalCount} completed
            </Badge>
          )}
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-xs" />
            Add Task
          </Button>
        )}
      </div>

      <CreateTaskDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        defaultProjectId={projectId}
      />

      {isLoading ? (
        <div className="space-y-xs">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-xs">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-md p-md bg-card border border-border rounded-lg hover:bg-card-hover cursor-pointer transition-smooth"
              onClick={() => handleTaskClick(task.id, task)}
            >
              <div className="flex-shrink-0">{statusIcons[task.status] || statusIcons["Backlog"]}</div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-body-sm font-medium truncate",
                    task.status === "Completed" && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </p>
                {task.due_at && (
                  <p className="text-metadata text-muted-foreground">
                    Due {format(new Date(task.due_at), "MMM d")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-xs">
                {task.priority && (
                  <Badge className={priorityColors[task.priority]} variant="secondary">
                    {task.priority}
                  </Badge>
                )}
                <Badge variant="outline">{task.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-xl text-muted-foreground border border-dashed border-border rounded-lg">
          <p className="text-body-sm">No tasks linked to this project</p>
          {isAdmin && (
            <Button variant="link" className="mt-xs" onClick={() => setCreateDialogOpen(true)}>
              Create the first task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
