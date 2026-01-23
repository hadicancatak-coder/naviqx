import { format, parseISO } from "date-fns";
import { ChevronUp, Edit2, ListTodo, ArrowRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseDependency, PhaseTaskStats } from "@/hooks/useRoadmap";
import { PhaseMilestones } from "./PhaseMilestones";

interface PhaseExpandedCardProps {
  phase: ProjectTimeline & { startDate: Date; endDate: Date };
  phases: (ProjectTimeline & { startDate: Date; endDate: Date })[];
  dependencies: PhaseDependency[];
  taskStats: PhaseTaskStats | undefined;
  isAdmin?: boolean;
  onEdit: () => void;
  onCollapse: () => void;
  colorClasses: { bg: string; border: string; text: string };
}

export function PhaseExpandedCard({
  phase,
  phases,
  dependencies,
  taskStats,
  isAdmin,
  onEdit,
  onCollapse,
  colorClasses,
}: PhaseExpandedCardProps) {
  // Find phases this one depends on
  const dependsOnPhases = dependencies
    .filter((d) => d.phase_id === phase.id)
    .map((d) => phases.find((p) => p.id === d.depends_on_phase_id))
    .filter(Boolean);

  // Find phases that depend on this one
  const blocksPhases = dependencies
    .filter((d) => d.depends_on_phase_id === phase.id)
    .map((d) => phases.find((p) => p.id === d.phase_id))
    .filter(Boolean);

  return (
    <div
      className={cn(
        "liquid-glass-elevated rounded-xl overflow-hidden animate-fade-in",
        "border-l-4",
        colorClasses.border
      )}
    >
      {/* Header */}
      <div className="px-md py-sm flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-md flex-1 min-w-0">
          {/* Color dot */}
          <div className={cn("w-3 h-3 rounded-full shrink-0", colorClasses.bg.replace('/20', ''))} />
          
          <div className="flex-1 min-w-0">
            <h4 className="text-body font-semibold truncate text-foreground">
              {phase.phase_name}
            </h4>
            <p className="text-metadata text-muted-foreground">
              {format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <Progress value={phase.progress} className="w-24 h-2" />
            <span className="text-body-sm font-semibold min-w-[3ch] text-foreground">
              {phase.progress}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-xs ml-md">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="hover:bg-card-hover">
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onCollapse} className="hover:bg-card-hover">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-md space-y-md bg-card/50">
        {/* Description */}
        {phase.description && (
          <div>
            <p className="text-body-sm text-muted-foreground">{phase.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Milestones */}
          <div className="space-y-2">
            <PhaseMilestones phaseId={phase.id} isAdmin={isAdmin} />
          </div>

          {/* Linked Tasks */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListTodo className="h-4 w-4" />
              <span className="text-body-sm font-medium">Linked Tasks</span>
            </div>
            {taskStats && taskStats.total_tasks > 0 ? (
              <div className="flex items-center gap-sm">
                <div className="flex-1">
                  <Progress
                    value={(taskStats.completed_tasks / taskStats.total_tasks) * 100}
                    className="h-2"
                  />
                </div>
                <span className="text-body-sm text-muted-foreground">
                  {taskStats.completed_tasks}/{taskStats.total_tasks} done
                </span>
              </div>
            ) : (
              <p className="text-metadata text-muted-foreground">No tasks linked to this phase</p>
            )}
          </div>
        </div>

        {/* Dependencies */}
        {(dependsOnPhases.length > 0 || blocksPhases.length > 0) && (
          <div className="pt-sm border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Link2 className="h-4 w-4" />
              <span className="text-body-sm font-medium">Dependencies</span>
            </div>
            <div className="flex flex-wrap gap-sm">
              {dependsOnPhases.map((dep) => (
                <div
                  key={dep!.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-metadata"
                >
                  <span className="text-muted-foreground">Depends on:</span>
                  <span className="font-medium text-foreground">{dep!.phase_name}</span>
                </div>
              ))}
              {blocksPhases.map((blocked) => (
                <div
                  key={blocked!.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10 text-metadata"
                >
                  <span className="text-muted-foreground">Blocks:</span>
                  <span className="font-medium text-warning-text">{blocked!.phase_name}</span>
                  <ArrowRight className="h-3 w-3 text-warning-text" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
