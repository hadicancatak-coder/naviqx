import { format } from "date-fns";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";
import { cn } from "@/lib/utils";

interface ExtendedPhase extends ProjectTimeline {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface ProjectPhaseCardProps {
  phase: ExtendedPhase;
  left: number;
  width: number;
  isActive: boolean;
  isExpanded: boolean;
  milestones: PhaseMilestone[];
  taskStats?: PhaseTaskStats;
  onClick: () => void;
}

const phaseColors: Record<string, { bg: string; border: string; text: string; glass: string }> = {
  primary: { bg: "bg-primary/20", border: "border-primary", text: "text-primary", glass: "bg-primary/10" },
  success: { bg: "bg-success/20", border: "border-success", text: "text-success-text", glass: "bg-success/10" },
  warning: { bg: "bg-warning/20", border: "border-warning", text: "text-warning-text", glass: "bg-warning/10" },
  info: { bg: "bg-info/20", border: "border-info", text: "text-info-text", glass: "bg-info/10" },
  destructive: { bg: "bg-destructive/20", border: "border-destructive", text: "text-destructive-text", glass: "bg-destructive/10" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-600 dark:text-purple-400", glass: "bg-purple-500/10" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500", text: "text-cyan-600 dark:text-cyan-400", glass: "bg-cyan-500/10" },
};

export function ProjectPhaseCard({
  phase,
  left,
  width,
  isActive,
  isExpanded,
  milestones,
  taskStats,
  onClick,
}: ProjectPhaseCardProps) {
  const colors = phaseColors[phase.color || "primary"] || phaseColors.primary;
  
  // Calculate progress
  const { calculatedProgress } = calculatePhaseProgress(milestones, taskStats);
  const progress = milestones.length > 0 || (taskStats?.total_tasks || 0) > 0 
    ? calculatedProgress 
    : phase.progress || 0;

  const completedMilestones = milestones.filter((m) => m.is_completed).length;

  return (
    <div className="relative h-12">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className={cn(
              "absolute h-full rounded-lg cursor-pointer",
              "transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-md hover:z-10",
              "backdrop-blur-sm border",
              colors.glass,
              colors.border,
              isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background shadow-lg",
              isExpanded && "ring-2 ring-foreground/20"
            )}
            style={{ left: `${left}%`, width: `${width}%`, minWidth: "120px" }}
          >
            <div className="h-full px-sm py-xs flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-semibold truncate !text-foreground">
                  {phase.phase_name}
                </span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </div>
              
              <div className="flex items-center gap-sm">
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="text-metadata font-medium !text-foreground shrink-0">
                  {progress}%
                </span>
                
                {milestones.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-metadata text-muted-foreground">
                      {completedMilestones}/{milestones.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="liquid-glass-dropdown max-w-xs">
          <div className="space-y-xs p-xs">
            <p className="font-semibold text-foreground">{phase.phase_name}</p>
            <p className="text-metadata text-muted-foreground">
              {format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}
            </p>
            {phase.description && (
              <p className="text-body-sm text-muted-foreground line-clamp-2">{phase.description}</p>
            )}
            <p className="text-metadata text-muted-foreground">
              Click to {isExpanded ? "collapse" : "expand"} details
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
