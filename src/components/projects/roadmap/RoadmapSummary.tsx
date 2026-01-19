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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-md mb-lg">
      {/* Total Phases */}
      <div className="flex items-center gap-md p-md bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
        <div className="p-2.5 rounded-lg bg-primary/15">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-metadata text-muted-foreground">Phases</p>
          <p className="text-heading-sm font-bold text-foreground">{stats.totalPhases}</p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-md p-md bg-gradient-to-br from-success/5 to-success/10 rounded-xl border border-success/20">
        <div className="p-2.5 rounded-lg bg-success/15">
          <CheckCircle2 className="h-5 w-5 text-success-text" />
        </div>
        <div>
          <p className="text-metadata text-muted-foreground">Progress</p>
          <p className="text-heading-sm font-bold text-foreground">{stats.overallProgress}%</p>
        </div>
      </div>

      {/* Next Milestone */}
      <div className="flex items-center gap-md p-md bg-gradient-to-br from-warning/5 to-warning/10 rounded-xl border border-warning/20 col-span-2 sm:col-span-1">
        <div className="p-2.5 rounded-lg bg-warning/15">
          <Target className="h-5 w-5 text-warning-text" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-metadata text-muted-foreground">Next Milestone</p>
          {stats.nextMilestone ? (
            <p className="text-body font-semibold text-foreground truncate" title={stats.nextMilestone.name}>
              {stats.nextMilestone.name}
              {stats.nextMilestone.due_date && (
                <span className="text-metadata text-muted-foreground ml-1">
                  ({format(parseISO(stats.nextMilestone.due_date), "MMM d")})
                </span>
              )}
            </p>
          ) : (
            <p className="text-body text-muted-foreground">None set</p>
          )}
        </div>
      </div>

      {/* Days to Deadline */}
      {stats.daysToDeadline !== null && (
        <div className={cn(
          "flex items-center gap-md p-md rounded-xl border",
          stats.daysToDeadline < 7 
            ? "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20" 
            : "bg-gradient-to-br from-info/5 to-info/10 border-info/20"
        )}>
          <div className={cn(
            "p-2.5 rounded-lg",
            stats.daysToDeadline < 7 ? "bg-destructive/15" : "bg-info/15"
          )}>
            <Calendar className={cn(
              "h-5 w-5",
              stats.daysToDeadline < 7 ? "text-destructive-text" : "text-info-text"
            )} />
          </div>
          <div>
            <p className="text-metadata text-muted-foreground">Deadline</p>
            <p className={cn(
              "text-heading-sm font-bold",
              stats.daysToDeadline < 7 ? "text-destructive-text" : "text-foreground"
            )}>
              {stats.daysToDeadline}d
            </p>
          </div>
        </div>
      )}

      {/* Active Phase */}
      {stats.activePhase && (
        <div className="flex items-center gap-md p-md bg-gradient-to-br from-cyan-500/5 to-cyan-500/10 rounded-xl border border-cyan-500/20 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-lg bg-cyan-500/15">
            <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata text-muted-foreground">Active Phase</p>
            <p className="text-body font-semibold text-foreground truncate" title={stats.activePhase.phase_name}>
              {stats.activePhase.phase_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
