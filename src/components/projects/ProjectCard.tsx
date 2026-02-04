import { useMemo } from "react";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Project, ProjectTimeline } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  timelines?: ProjectTimeline[];
  taskCount?: number;
  completedTasks?: number;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "status-info" },
  active: { label: "Active", className: "status-success" },
  "on-hold": { label: "On Hold", className: "status-warning" },
  completed: { label: "Completed", className: "status-neutral" },
};

const phaseColors: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
};

export function ProjectCard({ 
  project, 
  timelines = [], 
  taskCount = 0, 
  completedTasks = 0,
  onClick 
}: ProjectCardProps) {
  // Get icon component
  const iconName = project.icon || "folder-kanban";
  const iconKey = iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || LucideIcons.FolderKanban;

  // Calculate overall progress from phases
  const progress = useMemo(() => {
    if (timelines.length === 0) {
      if (taskCount > 0) return Math.round((completedTasks / taskCount) * 100);
      return 0;
    }
    const totalProgress = timelines.reduce((sum, t) => sum + (t.progress || 0), 0);
    return Math.round(totalProgress / timelines.length);
  }, [timelines, taskCount, completedTasks]);

  // Days until deadline
  const daysUntilDeadline = useMemo(() => {
    if (!project.due_date) return null;
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(project.due_date));
    return differenceInDays(dueDate, today);
  }, [project.due_date]);

  const status = statusConfig[project.status] || statusConfig.planning;

  // Mini timeline visualization
  const timelinePreview = useMemo(() => {
    if (timelines.length === 0) return null;
    
    const dates = timelines.flatMap((t) => [parseISO(t.start_date), parseISO(t.end_date)]);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const totalDays = differenceInDays(max, min) || 1;
    
    return timelines.slice(0, 4).map((phase) => {
      const left = (differenceInDays(parseISO(phase.start_date), min) / totalDays) * 100;
      const width = Math.max(((differenceInDays(parseISO(phase.end_date), parseISO(phase.start_date)) + 1) / totalDays) * 100, 5);
      return { id: phase.id, left, width, color: phase.color || "primary", name: phase.phase_name };
    });
  }, [timelines]);

  return (
    <Card
      interactive
      onClick={onClick}
      className="group p-lg hover-lift card-glow cursor-pointer transition-smooth"
    >
      {/* Header with icon and status */}
      <div className="flex items-start justify-between mb-md">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-smooth">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>
        <Badge className={cn("text-metadata", status.className)}>
          {status.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-heading-sm font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-smooth">
        {project.name}
      </h3>

      {/* Purpose preview */}
      {project.purpose && (
        <p className="text-body-sm text-muted-foreground line-clamp-2 mb-md">
          {project.purpose}
        </p>
      )}
      {!project.purpose && (
        <p className="text-body-sm text-muted-foreground italic mb-md">
          No purpose defined
        </p>
      )}

      {/* Mini roadmap timeline */}
      {timelinePreview && timelinePreview.length > 0 && (
        <div className="relative h-3 bg-muted/50 rounded-full mb-md overflow-hidden">
          {timelinePreview.map((phase) => (
            <Tooltip key={phase.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute h-full rounded-full opacity-80 hover:opacity-100 transition-smooth cursor-pointer",
                    phaseColors[phase.color] || "bg-primary"
                  )}
                  style={{ left: `${phase.left}%`, width: `${phase.width}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-metadata">
                {phase.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-md">
        <div className="flex items-center justify-between text-metadata text-muted-foreground mb-1">
          <span>Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Footer metadata */}
      <div className="flex items-center gap-md text-metadata text-muted-foreground pt-sm border-t border-border">
        {project.due_date && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1",
                daysUntilDeadline !== null && daysUntilDeadline < 0 && "text-destructive",
                daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && "text-warning-text"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(parseISO(project.due_date), "MMM d")}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {daysUntilDeadline !== null && (
                daysUntilDeadline < 0 
                  ? `${Math.abs(daysUntilDeadline)} days overdue`
                  : daysUntilDeadline === 0 
                    ? "Due today"
                    : `${daysUntilDeadline} days remaining`
              )}
            </TooltipContent>
          </Tooltip>
        )}
        
        {timelines.length > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{timelines.length} phases</span>
          </div>
        )}
        
        {taskCount > 0 && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{completedTasks}/{taskCount}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
