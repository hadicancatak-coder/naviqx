import { useState } from "react";
import { format } from "date-fns";
import { ChevronUp, Edit2, ListTodo, ArrowRight, Link2, User2, Layers, Target, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseDependency, PhaseTaskStats } from "@/hooks/useRoadmap";
import { PhaseMilestones } from "./PhaseMilestones";

interface StepExpandedCardProps {
  step: ProjectTimeline & { startDate: Date; endDate: Date };
  steps: (ProjectTimeline & { startDate: Date; endDate: Date })[];
  dependencies: PhaseDependency[];
  taskStats: PhaseTaskStats | undefined;
  progress: number;
  isAdmin?: boolean;
  onEdit: () => void;
  onCollapse: () => void;
  colorClasses: { bg: string; border: string; text: string };
}

// Status colors
const statusColors: Record<string, { badge: string }> = {
  not_started: { badge: "bg-muted text-muted-foreground" },
  in_progress: { badge: "bg-primary/20 text-primary" },
  blocked: { badge: "bg-destructive/20 text-destructive-text" },
  completed: { badge: "bg-success/20 text-success-text" },
};

export function StepExpandedCard({
  step,
  steps,
  dependencies,
  taskStats,
  progress,
  isAdmin,
  onEdit,
  onCollapse,
  colorClasses,
}: StepExpandedCardProps) {
  const [showTasks, setShowTasks] = useState(false);
  
  const status = (step as any).status || "not_started";
  const owner = (step as any).owner;
  const systemName = (step as any).system_name;
  const expectedOutcomes: string[] = (step as any).expected_outcomes || [];
  const statusStyle = statusColors[status] || statusColors.not_started;

  // Find steps this one depends on
  const dependsOnSteps = dependencies
    .filter((d) => d.phase_id === step.id)
    .map((d) => steps.find((p) => p.id === d.depends_on_phase_id))
    .filter(Boolean);

  // Find steps that depend on this one
  const blocksSteps = dependencies
    .filter((d) => d.depends_on_phase_id === step.id)
    .map((d) => steps.find((p) => p.id === d.phase_id))
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
            <div className="flex items-center gap-2">
              <h4 className="text-heading-sm font-bold truncate text-foreground">
                {step.phase_name}
              </h4>
              <span className={cn(
                "px-2 py-0.5 rounded text-metadata font-medium capitalize shrink-0",
                statusStyle.badge
              )}>
                {status.replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-metadata text-muted-foreground mt-0.5">
              <span>{format(step.startDate, "MMM d")} – {format(step.endDate, "MMM d, yyyy")}</span>
              {owner && (
                <span className="flex items-center gap-1">
                  <User2 className="h-3 w-3" />
                  {owner}
                </span>
              )}
              {systemName && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {systemName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-sm">
            <Progress value={progress} className="w-24 h-2" />
            <span className="text-body-sm font-semibold min-w-[3ch] text-foreground">
              {progress}%
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
        {step.description && (
          <div>
            <p className="text-body-sm text-muted-foreground">{step.description}</p>
          </div>
        )}

        {/* Expected Outcomes - Primary Content */}
        {expectedOutcomes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground">
              <Target className="h-4 w-4" />
              <span className="text-body-sm font-semibold">Expected Outcomes</span>
            </div>
            <ul className="space-y-1.5 pl-6">
              {expectedOutcomes.map((outcome, idx) => (
                <li key={idx} className="text-body-sm text-muted-foreground list-disc">
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Milestones */}
        <div className="space-y-2">
          <PhaseMilestones phaseId={step.id} isAdmin={isAdmin} />
        </div>

        {/* Tasks - Hidden by default, collapsible */}
        <Collapsible open={showTasks} onOpenChange={setShowTasks}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-card-hover">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ListTodo className="h-4 w-4" />
                <span className="text-body-sm font-medium">Linked Tasks</span>
                {taskStats && taskStats.total_tasks > 0 && (
                  <span className="text-metadata text-muted-foreground/80">
                    ({taskStats.completed_tasks}/{taskStats.total_tasks} done)
                  </span>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showTasks && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {taskStats && taskStats.total_tasks > 0 ? (
              <div className="flex items-center gap-sm pl-6">
                <div className="flex-1">
                  <Progress
                    value={(taskStats.completed_tasks / taskStats.total_tasks) * 100}
                    className="h-2"
                  />
                </div>
                <span className="text-body-sm text-muted-foreground">
                  {taskStats.completed_tasks}/{taskStats.total_tasks} completed
                </span>
              </div>
            ) : (
              <p className="text-metadata text-muted-foreground pl-6">No tasks linked to this step</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Dependencies */}
        {(dependsOnSteps.length > 0 || blocksSteps.length > 0) && (
          <div className="pt-sm border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Link2 className="h-4 w-4" />
              <span className="text-body-sm font-medium">Dependencies</span>
            </div>
            <div className="flex flex-wrap gap-sm">
              {dependsOnSteps.map((dep) => (
                <div
                  key={dep!.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-metadata"
                >
                  <span className="text-muted-foreground">Depends on:</span>
                  <span className="font-medium text-foreground">{dep!.phase_name}</span>
                </div>
              ))}
              {blocksSteps.map((blocked) => (
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
