import { useMemo } from "react";
import { format, differenceInDays, parseISO, isFuture } from "date-fns";
import { 
  BarChart3, 
  Target, 
  Calendar, 
  CheckCircle2, 
  Activity,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Phase {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  progress: number;
}

interface Milestone {
  id: string;
  name: string;
  is_completed: boolean;
  due_date?: string | null;
}

interface PublicRoadmapSummaryProps {
  phases: Phase[];
  milestones: Milestone[];
  projectDueDate?: string | null;
}

export function PublicRoadmapSummary({ 
  phases, 
  milestones, 
  projectDueDate 
}: PublicRoadmapSummaryProps) {
  const stats = useMemo(() => {
    const totalPhases = phases.length;
    const completedPhases = phases.filter((p) => p.progress === 100).length;
    
    // Overall progress
    const totalProgress = phases.reduce((sum, p) => sum + (p.progress || 0), 0);
    const overallProgress = totalPhases > 0 ? Math.round(totalProgress / totalPhases) : 0;

    // Milestones
    const completedMilestones = milestones.filter((m) => m.is_completed).length;
    const totalMilestones = milestones.length;

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

    // Active phase
    const today = new Date();
    const activePhase = phases.find((p) => {
      const start = parseISO(p.start_date);
      const end = parseISO(p.end_date);
      return today >= start && today <= end;
    });

    return {
      totalPhases,
      completedPhases,
      overallProgress,
      completedMilestones,
      totalMilestones,
      nextMilestone,
      daysToDeadline,
      activePhase,
    };
  }, [phases, milestones, projectDueDate]);

  if (phases.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
      {/* Overall Progress - Premium Card */}
      <div className="col-span-2 lg:col-span-1 liquid-glass-elevated rounded-xl p-md hover-lift transition-smooth">
        <div className="flex items-center gap-md">
          <div className="relative">
            {/* Circular progress indicator */}
            <svg className="w-14 h-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                className="fill-none stroke-muted stroke-[4]"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                className="fill-none stroke-primary stroke-[4]"
                strokeLinecap="round"
                strokeDasharray={`${stats.overallProgress * 1.51} 151`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-body-sm font-bold text-foreground">
                {stats.overallProgress}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-metadata text-muted-foreground uppercase tracking-wide">
              Overall Progress
            </p>
            <p className="text-body font-semibold text-foreground">
              {stats.completedPhases}/{stats.totalPhases} phases
            </p>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="liquid-glass-elevated rounded-xl p-md hover-lift transition-smooth">
        <div className="flex items-center gap-md">
          <div className="p-2.5 rounded-lg bg-success/15">
            <Target className="h-5 w-5 text-success-text" />
          </div>
          <div>
            <p className="text-metadata text-muted-foreground uppercase tracking-wide">
              Milestones
            </p>
            <p className="text-heading-sm font-bold text-foreground">
              {stats.completedMilestones}/{stats.totalMilestones}
            </p>
          </div>
        </div>
        {stats.totalMilestones > 0 && (
          <Progress 
            value={(stats.completedMilestones / stats.totalMilestones) * 100} 
            className="h-1.5 mt-3" 
          />
        )}
      </div>

      {/* Days to Deadline */}
      {stats.daysToDeadline !== null ? (
        <div className={cn(
          "liquid-glass-elevated rounded-xl p-md hover-lift transition-smooth",
          stats.daysToDeadline < 7 && stats.daysToDeadline >= 0 && "ring-1 ring-destructive/30"
        )}>
          <div className="flex items-center gap-md">
            <div className={cn(
              "p-2.5 rounded-lg",
              stats.daysToDeadline < 0 
                ? "bg-destructive/15" 
                : stats.daysToDeadline < 7 
                  ? "bg-warning/15" 
                  : "bg-info/15"
            )}>
              <Calendar className={cn(
                "h-5 w-5",
                stats.daysToDeadline < 0 
                  ? "text-destructive-text" 
                  : stats.daysToDeadline < 7 
                    ? "text-warning-text" 
                    : "text-info-text"
              )} />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground uppercase tracking-wide">
                {stats.daysToDeadline < 0 ? "Overdue" : "Deadline"}
              </p>
              <p className={cn(
                "text-heading-sm font-bold",
                stats.daysToDeadline < 0 
                  ? "text-destructive-text" 
                  : stats.daysToDeadline < 7 
                    ? "text-warning-text" 
                    : "text-foreground"
              )}>
                {stats.daysToDeadline < 0 
                  ? `${Math.abs(stats.daysToDeadline)}d ago`
                  : `${stats.daysToDeadline} days`
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="liquid-glass-elevated rounded-xl p-md hover-lift transition-smooth">
          <div className="flex items-center gap-md">
            <div className="p-2.5 rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground uppercase tracking-wide">
                Deadline
              </p>
              <p className="text-body text-muted-foreground">Not set</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Phase / Next Milestone */}
      <div className="liquid-glass-elevated rounded-xl p-md hover-lift transition-smooth">
        {stats.activePhase ? (
          <div className="flex items-center gap-md">
            <div className="p-2.5 rounded-lg bg-primary/15">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-metadata text-muted-foreground uppercase tracking-wide">
                Active Phase
              </p>
              <p className="text-body font-semibold text-foreground truncate" title={stats.activePhase.phase_name}>
                {stats.activePhase.phase_name}
              </p>
            </div>
          </div>
        ) : stats.nextMilestone ? (
          <div className="flex items-center gap-md">
            <div className="p-2.5 rounded-lg bg-warning/15">
              <TrendingUp className="h-5 w-5 text-warning-text" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-metadata text-muted-foreground uppercase tracking-wide">
                Next Milestone
              </p>
              <p className="text-body font-semibold text-foreground truncate" title={stats.nextMilestone.name}>
                {stats.nextMilestone.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-md">
            <div className="p-2.5 rounded-lg bg-success/15">
              <CheckCircle2 className="h-5 w-5 text-success-text" />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground uppercase tracking-wide">
                Status
              </p>
              <p className="text-body font-semibold text-success-text">
                All Complete
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
