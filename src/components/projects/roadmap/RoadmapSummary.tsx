import { useMemo } from "react";
import { format, differenceInDays, parseISO, isFuture } from "date-fns";
import { BarChart3, Target, Calendar, CheckCircle2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseMilestone } from "@/hooks/useRoadmap";

interface RoadmapSummaryProps {
  phases: ProjectTimeline[];
  milestones: PhaseMilestone[];
  projectDueDate?: string | null;
}

export function RoadmapSummary({ phases, milestones, projectDueDate }: RoadmapSummaryProps) {
  const stats = useMemo(() => {
    // Total phases
    const totalPhases = phases.length;

    // Overall progress (weighted average by phase duration)
    const totalProgress = phases.reduce((sum, p) => sum + (p.progress || 0), 0);
    const overallProgress = totalPhases > 0 ? Math.round(totalProgress / totalPhases) : 0;

    // Next milestone
    const upcomingMilestones = milestones
      .filter((m) => !m.is_completed && m.due_date && isFuture(parseISO(m.due_date)))
      .sort((a, b) => 
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
      );
    const nextMilestone = upcomingMilestones[0];

    // Days to deadline
    const daysToDeadline = projectDueDate
      ? differenceInDays(parseISO(projectDueDate), new Date())
      : null;

    // Active phase (currently in progress based on dates)
    const today = new Date();
    const activePhase = phases.find((p) => {
      const start = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      return today >= start && today <= end;
    });

    // Completed milestones count
    const completedMilestones = milestones.filter((m) => m.is_completed).length;
    const totalMilestones = milestones.length;

    return {
      totalPhases,
      overallProgress,
      nextMilestone,
      daysToDeadline,
      activePhase,
      completedMilestones,
      totalMilestones,
    };
  }, [phases, milestones, projectDueDate]);

  if (phases.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-sm mb-md">
      {/* Total Phases */}
      <div className="flex items-center gap-sm p-sm bg-muted/50 rounded-lg border border-border">
        <div className="p-2 rounded-md bg-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-metadata text-muted-foreground">Phases</p>
          <p className="text-body-sm font-semibold text-foreground">{stats.totalPhases}</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-sm p-sm bg-muted/50 rounded-lg border border-border">
        <div className="p-2 rounded-md bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success-text" />
        </div>
        <div>
          <p className="text-metadata text-muted-foreground">Progress</p>
          <p className="text-body-sm font-semibold text-foreground">{stats.overallProgress}%</p>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="flex items-center gap-sm p-sm bg-muted/50 rounded-lg border border-border col-span-2 md:col-span-1">
        <div className="p-2 rounded-md bg-warning/10">
          <Target className="h-4 w-4 text-warning-text" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-metadata text-muted-foreground">Next Milestone</p>
          {stats.nextMilestone ? (
            <p className="text-body-sm font-semibold text-foreground truncate" title={stats.nextMilestone.name}>
              {stats.nextMilestone.name}
              {stats.nextMilestone.due_date && (
                <span className="text-metadata text-muted-foreground ml-1">
                  ({format(parseISO(stats.nextMilestone.due_date), "MMM d")})
                </span>
              )}
            </p>
          ) : (
            <p className="text-body-sm text-muted-foreground">None set</p>
          )}
        </div>
      </div>

      {/* Days to Deadline */}
      {stats.daysToDeadline !== null && (
        <div className="flex items-center gap-sm p-sm bg-muted/50 rounded-lg border border-border">
          <div className={cn(
            "p-2 rounded-md",
            stats.daysToDeadline < 7 ? "bg-destructive/10" : "bg-info/10"
          )}>
            <Calendar className={cn(
              "h-4 w-4",
              stats.daysToDeadline < 7 ? "text-destructive-text" : "text-info-text"
            )} />
          </div>
          <div>
            <p className="text-metadata text-muted-foreground">Deadline</p>
            <p className={cn(
              "text-body-sm font-semibold",
              stats.daysToDeadline < 7 ? "text-destructive-text" : "text-foreground"
            )}>
              {stats.daysToDeadline} days
            </p>
          </div>
        </div>
      )}

      {/* Active Phase */}
      {stats.activePhase && (
        <div className="flex items-center gap-sm p-sm bg-muted/50 rounded-lg border border-border col-span-2 md:col-span-1">
          <div className="p-2 rounded-md bg-cyan-500/10">
            <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata text-muted-foreground">Active</p>
            <p className="text-body-sm font-semibold text-foreground truncate" title={stats.activePhase.phase_name}>
              {stats.activePhase.phase_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
