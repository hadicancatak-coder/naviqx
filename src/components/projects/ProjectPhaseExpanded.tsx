import { format } from "date-fns";
import { X, Edit2, Trash2, Calendar, Clock, CheckCircle2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { ProjectPhaseMilestones } from "./ProjectPhaseMilestones";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

interface ExtendedPhase extends ProjectTimeline {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface ProjectPhaseExpandedProps {
  phase: ExtendedPhase;
  milestones: PhaseMilestone[];
  taskStats?: PhaseTaskStats;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isReadOnly?: boolean;
  projectId: string;
}

const phaseColors: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "bg-primary/10", border: "border-primary", text: "text-primary" },
  success: { bg: "bg-success/10", border: "border-success", text: "text-success-text" },
  warning: { bg: "bg-warning/10", border: "border-warning", text: "text-warning-text" },
  info: { bg: "bg-info/10", border: "border-info", text: "text-info-text" },
  destructive: { bg: "bg-destructive/10", border: "border-destructive", text: "text-destructive-text" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-600 dark:text-purple-400" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
};

export function ProjectPhaseExpanded({
  phase,
  milestones,
  taskStats,
  onClose,
  onEdit,
  onDelete,
  isReadOnly = false,
  projectId,
}: ProjectPhaseExpandedProps) {
  const colors = phaseColors[phase.color || "primary"] || phaseColors.primary;
  
  // Calculate progress
  const { calculatedProgress } = calculatePhaseProgress(milestones, taskStats);
  const progress = milestones.length > 0 || (taskStats?.total_tasks || 0) > 0 
    ? calculatedProgress 
    : phase.progress || 0;

  const completedMilestones = milestones.filter((m) => m.is_completed).length;

  return (
    <div className={cn(
      "liquid-glass-elevated rounded-xl border-l-4 overflow-hidden",
      colors.border
    )}>
      {/* Header */}
      <div className="flex items-start justify-between p-lg border-b border-border">
        <div className="space-y-xs">
          <div className="flex items-center gap-sm">
            <h3 className="text-heading-sm font-semibold text-foreground">
              {phase.phase_name}
            </h3>
            {phase.isActive && (
              <Badge className="status-success text-metadata">Active</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-md text-metadata text-muted-foreground">
            <div className="flex items-center gap-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-xs">
          {!isReadOnly && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {!isReadOnly && onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-lg space-y-lg">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-body-sm mb-sm">
            <span className="font-medium text-foreground">Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-lg">
          <div className="flex items-center gap-sm">
            <div className={cn("p-xs rounded-lg", colors.bg)}>
              <CheckCircle2 className={cn("h-4 w-4", colors.text)} />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Milestones</p>
              <p className="text-body-sm font-semibold text-foreground">
                {completedMilestones}/{milestones.length} completed
              </p>
            </div>
          </div>

          {taskStats && taskStats.total_tasks > 0 && (
            <div className="flex items-center gap-sm">
              <div className="p-xs bg-muted rounded-lg">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-metadata text-muted-foreground">Linked Tasks</p>
                <p className="text-body-sm font-semibold text-foreground">
                  {taskStats.completed_tasks}/{taskStats.total_tasks} done
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {phase.description && (
          <div>
            <h4 className="text-body-sm font-medium text-muted-foreground mb-xs">Description</h4>
            <div 
              className="text-body text-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(phase.description) }}
            />
          </div>
        )}

        {/* Milestones */}
        <ProjectPhaseMilestones
          phaseId={phase.id}
          milestones={milestones}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
