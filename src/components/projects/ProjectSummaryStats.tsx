import { useMemo } from "react";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";
import { cn } from "@/lib/utils";

interface ProjectSummaryStatsProps {
  timelines: ProjectTimeline[];
  milestones: PhaseMilestone[];
  taskStats: PhaseTaskStats[];
  dueDate?: string | null;
}

export function ProjectSummaryStats({ 
  timelines, 
  milestones, 
  taskStats, 
  dueDate 
}: ProjectSummaryStatsProps) {
  const stats = useMemo(() => {
    // Calculate overall progress
    let totalProgress = 0;
    if (timelines.length > 0) {
      const phaseProgresses = timelines.map((t) => {
        const phaseMilestones = milestones.filter((m) => m.phase_id === t.id);
        const phaseTaskStat = taskStats.find((s) => s.phase_id === t.id);
        
        if (phaseMilestones.length > 0 || (phaseTaskStat?.total_tasks || 0) > 0) {
          return calculatePhaseProgress(phaseMilestones, phaseTaskStat).calculatedProgress;
        }
        return t.progress || 0;
      });
      totalProgress = Math.round(phaseProgresses.reduce((a, b) => a + b, 0) / timelines.length);
    }

    // Milestone stats
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.is_completed).length;

    // Phase stats
    const totalPhases = timelines.length;
    const completedPhases = timelines.filter((t) => {
      const phaseMilestones = milestones.filter((m) => m.phase_id === t.id);
      const phaseTaskStat = taskStats.find((s) => s.phase_id === t.id);
      const { calculatedProgress } = calculatePhaseProgress(phaseMilestones, phaseTaskStat);
      return calculatedProgress === 100;
    }).length;

    // Active phase
    const today = startOfDay(new Date());
    const activePhase = timelines.find((t) => {
      const start = parseISO(t.start_date);
      const end = parseISO(t.end_date);
      return today >= start && today <= end;
    });

    // Days until deadline
    let daysRemaining: number | null = null;
    let isOverdue = false;
    if (dueDate) {
      const due = startOfDay(parseISO(dueDate));
      daysRemaining = differenceInDays(due, today);
      isOverdue = daysRemaining < 0;
    }

    // Next milestone
    const upcomingMilestones = milestones
      .filter((m) => !m.is_completed && m.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    const nextMilestone = upcomingMilestones[0];

    return {
      totalProgress,
      totalMilestones,
      completedMilestones,
      totalPhases,
      completedPhases,
      activePhase,
      daysRemaining,
      isOverdue,
      nextMilestone,
    };
  }, [timelines, milestones, taskStats, dueDate]);

  if (timelines.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
      {/* Overall Progress */}
      <div className="liquid-glass-elevated rounded-xl p-md">
        <div className="flex items-center gap-sm mb-sm">
          <div className="p-xs bg-primary/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-metadata font-medium text-muted-foreground">Progress</span>
        </div>
        <div className="space-y-xs">
          <div className="flex items-end gap-xs">
            <span className="text-heading-lg font-bold text-foreground">{stats.totalProgress}</span>
            <span className="text-body-sm text-muted-foreground mb-1">%</span>
          </div>
          <Progress value={stats.totalProgress} className="h-1.5" />
        </div>
      </div>

      {/* Milestones */}
      <div className="liquid-glass-elevated rounded-xl p-md">
        <div className="flex items-center gap-sm mb-sm">
          <div className="p-xs bg-success/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success-text" />
          </div>
          <span className="text-metadata font-medium text-muted-foreground">Milestones</span>
        </div>
        <div className="flex items-end gap-xs">
          <span className="text-heading-lg font-bold text-foreground">{stats.completedMilestones}</span>
          <span className="text-body-sm text-muted-foreground mb-1">/ {stats.totalMilestones}</span>
        </div>
      </div>

      {/* Phases */}
      <div className="liquid-glass-elevated rounded-xl p-md">
        <div className="flex items-center gap-sm mb-sm">
          <div className="p-xs bg-info/10 rounded-lg">
            <Target className="h-4 w-4 text-info-text" />
          </div>
          <span className="text-metadata font-medium text-muted-foreground">Phases</span>
        </div>
        <div className="flex items-end gap-xs">
          <span className="text-heading-lg font-bold text-foreground">{stats.completedPhases}</span>
          <span className="text-body-sm text-muted-foreground mb-1">/ {stats.totalPhases}</span>
        </div>
        {stats.activePhase && (
          <p className="text-metadata text-muted-foreground truncate mt-xs">
            Active: {stats.activePhase.phase_name}
          </p>
        )}
      </div>

      {/* Deadline */}
      <div className="liquid-glass-elevated rounded-xl p-md">
        <div className="flex items-center gap-sm mb-sm">
          <div className={cn(
            "p-xs rounded-lg",
            stats.isOverdue ? "bg-destructive/10" : stats.daysRemaining !== null && stats.daysRemaining <= 7 ? "bg-warning/10" : "bg-muted"
          )}>
            {stats.isOverdue ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className={cn(
                "h-4 w-4",
                stats.daysRemaining !== null && stats.daysRemaining <= 7 ? "text-warning-text" : "text-muted-foreground"
              )} />
            )}
          </div>
          <span className="text-metadata font-medium text-muted-foreground">Deadline</span>
        </div>
        {stats.daysRemaining !== null ? (
          <div className="flex items-end gap-xs">
            <span className={cn(
              "text-heading-lg font-bold",
              stats.isOverdue ? "text-destructive" : stats.daysRemaining <= 7 ? "text-warning-text" : "text-foreground"
            )}>
              {stats.isOverdue ? Math.abs(stats.daysRemaining) : stats.daysRemaining}
            </span>
            <span className="text-body-sm text-muted-foreground mb-1">
              {stats.isOverdue ? "days overdue" : "days left"}
            </span>
          </div>
        ) : (
          <span className="text-body-sm text-muted-foreground">No deadline set</span>
        )}
      </div>
    </div>
  );
}
