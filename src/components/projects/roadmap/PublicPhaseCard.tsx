import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, Target, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { PhaseMilestone } from "@/hooks/useRoadmap";

interface PublicPhaseCardProps {
  phase: {
    id: string;
    phase_name: string;
    description?: string | null;
    start_date: string;
    end_date: string;
    progress: number;
    color?: string | null;
  };
  milestones: PhaseMilestone[];
  isActive?: boolean;
  colorClasses: { bg: string; border: string; text: string; glass: string };
}

export function PublicPhaseCard({
  phase,
  milestones,
  isActive,
  colorClasses,
}: PublicPhaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const phaseMilestones = milestones.filter((m) => m.phase_id === phase.id);
  const completedMilestones = phaseMilestones.filter((m) => m.is_completed).length;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-300",
        "liquid-glass-elevated",
        isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
        isExpanded && "shadow-lg"
      )}
    >
      {/* Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-md py-sm flex items-center justify-between",
          "hover:bg-card-hover transition-smooth cursor-pointer",
          "border-l-4",
          colorClasses.border
        )}
      >
        <div className="flex items-center gap-md flex-1 min-w-0">
          {/* Color indicator */}
          <div className={cn("w-3 h-3 rounded-full shrink-0", colorClasses.bg.replace('/20', ''))} />
          
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-body font-semibold truncate !text-foreground">
              {phase.phase_name}
            </h4>
            <p className="text-metadata text-muted-foreground">
              {format(parseISO(phase.start_date), "MMM d")} – {format(parseISO(phase.end_date), "MMM d, yyyy")}
            </p>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex items-center gap-sm shrink-0">
            <Progress value={phase.progress} className="w-20 h-2" />
            <span className="text-body-sm font-semibold min-w-[3ch] !text-foreground">
              {phase.progress}%
            </span>
          </div>

          {/* Milestone count badge */}
          {phaseMilestones.length > 0 && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-metadata">
              <Target className="h-3 w-3" />
              <span>{completedMilestones}/{phaseMilestones.length}</span>
            </div>
          )}
        </div>

        <div className={cn(
          "ml-md p-1.5 rounded-full transition-smooth",
          "hover:bg-muted"
        )}>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-md py-md space-y-md border-t border-border/50 bg-card/30">
            {/* Mobile progress */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-metadata text-muted-foreground">Progress</span>
                <span className="text-body-sm font-semibold !text-foreground">
                  {phase.progress}%
                </span>
              </div>
              <Progress value={phase.progress} className="h-2" />
            </div>

            {/* Description */}
            {phase.description && (
              <div>
                <p className="text-body-sm text-muted-foreground leading-relaxed">
                  {phase.description}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-md text-metadata text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Start: {format(parseISO(phase.start_date), "MMM d, yyyy")}</span>
              </div>
              <span className="text-border">•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>End: {format(parseISO(phase.end_date), "MMM d, yyyy")}</span>
              </div>
            </div>

            {/* Milestones */}
            {phaseMilestones.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body-sm font-medium text-foreground">
                    Milestones ({completedMilestones}/{phaseMilestones.length})
                  </span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {phaseMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2.5 rounded-lg",
                        milestone.is_completed
                          ? "bg-success/10 text-success-text"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {milestone.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-current shrink-0" />
                      )}
                      <span className={cn(
                        "text-body-sm flex-1",
                        milestone.is_completed && "line-through opacity-75"
                      )}>
                        {milestone.name}
                      </span>
                      {milestone.due_date && (
                        <span className="text-metadata">
                          {format(parseISO(milestone.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phaseMilestones.length === 0 && !phase.description && (
              <p className="text-metadata text-muted-foreground italic">
                No additional details for this phase.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
