import { format } from "date-fns";
import { Calendar, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "status-info" },
  active: { label: "Active", className: "status-success" },
  "on-hold": { label: "On Hold", className: "status-warning" },
  completed: { label: "Completed", className: "status-neutral" },
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { data: tasks } = useTasks();
  
  // Get icon component
  const iconName = project.icon || "folder-kanban";
  const iconKey = iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || LucideIcons.FolderKanban;

  // Count tasks
  const projectTasks = tasks?.filter((t: { project_id?: string | null }) => t.project_id === project.id) || [];
  const taskCount = projectTasks.length;
  const completedTasks = projectTasks.filter((t: { status?: string }) => t.status === "done").length;
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  const status = statusConfig[project.status] || statusConfig.planning;

  return (
    <Card
      interactive
      onClick={onClick}
      className="group p-lg hover-lift card-glow cursor-pointer transition-smooth"
    >
      {/* Header with icon and status */}
      <div className="flex items-start justify-between mb-md">
        <div className="flex items-center gap-sm">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-smooth">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
        </div>
        <Badge className={cn("text-metadata", status.className)}>
          {status.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-heading-sm font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-smooth">
        {project.name}
      </h3>

      {/* Purpose or description preview */}
      {project.purpose && (
        <p className="text-body-sm text-muted-foreground line-clamp-2 mb-md">
          {project.purpose}
        </p>
      )}
      {!project.purpose && project.description && (
        <p className="text-body-sm text-muted-foreground line-clamp-2 mb-md">
          {project.description.replace(/<[^>]*>/g, '').slice(0, 100)}...
        </p>
      )}
      {!project.purpose && !project.description && (
        <p className="text-body-sm text-muted-foreground italic mb-md">
          No description
        </p>
      )}

      {/* Progress bar */}
      {taskCount > 0 && (
        <div className="mb-md">
          <div className="flex items-center justify-between text-metadata text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Footer metadata */}
      <div className="flex items-center gap-md text-metadata text-muted-foreground pt-sm border-t border-border">
        {project.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(project.due_date), "MMM d")}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ListTodo className="h-3.5 w-3.5" />
          <span>{taskCount} tasks</span>
        </div>
      </div>
    </Card>
  );
}
