import { useMemo, useCallback } from "react";
import { format, parseISO, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { FolderKanban, Clock, Users } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PublicAccessLink } from "@/hooks/usePublicAccess";
import { PublicRoadmapSummary } from "@/components/projects/roadmap";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";

// Types
interface TimelinePhase {
  id: string;
  start_date: string;
  end_date: string;
  phase_name: string;
  color?: string;
  description?: string;
  progress?: number;
  startDate: Date;
  endDate: Date;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  icon: string | null;
  due_date: string | null;
  updated_at: string;
  description?: string | null;
}

interface Assignee {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface ProjectReviewContentProps {
  accessData: PublicAccessLink;
  projectData?: ProjectData | null;
  timelines?: Array<{
    id: string;
    start_date: string;
    end_date: string;
    phase_name: string;
    color?: string;
    description?: string;
    progress?: number;
  }>;
  milestones?: PhaseMilestone[];
  taskStats?: PhaseTaskStats[];
  assignees?: Assignee[];
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

const statusLabels: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/20 text-success-text" },
  "on-hold": { label: "On Hold", className: "bg-warning/20 text-warning-text" },
  completed: { label: "Completed", className: "bg-primary/20 text-primary" },
};

/**
 * Project roadmap content for external review.
 * Read-only display of project phases and timeline.
 */
export function ProjectReviewContent({
  accessData,
  projectData,
  timelines = [],
  milestones = [],
  taskStats = [],
  assignees = [],
}: ProjectReviewContentProps) {
  // Calculate progress for a phase
  const getPhaseProgress = useCallback((phaseId: string, storedProgress?: number) => {
    const phaseMilestones = milestones.filter((m) => m.phase_id === phaseId);
    const phaseTaskStat = taskStats.find((s) => s.phase_id === phaseId);
    
    if (phaseMilestones.length > 0 || (phaseTaskStat?.total_tasks || 0) > 0) {
      return calculatePhaseProgress(phaseMilestones, phaseTaskStat);
    }
    
    return { calculatedProgress: storedProgress || 0 };
  }, [milestones, taskStats]);

  // Roadmap calculations
  const { minDate, maxDate, totalDays, today, phases, monthMarkers } = useMemo(() => {
    if (!timelines || timelines.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 1, today: new Date(), phases: [], monthMarkers: [] };
    }

    const dates = timelines.flatMap((t) => [parseISO(t.start_date), parseISO(t.end_date)]);
    const min = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const max = startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
    const paddedMin = addDays(min, -7);
    const paddedMax = addDays(max, 14);
    const total = differenceInDays(paddedMax, paddedMin);

    const markers: { date: Date; position: number }[] = [];
    let current = new Date(paddedMin.getFullYear(), paddedMin.getMonth(), 1);
    while (current <= paddedMax) {
      if (current >= paddedMin) {
        markers.push({ date: current, position: (differenceInDays(current, paddedMin) / total) * 100 });
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalDays: total,
      today: startOfDay(new Date()),
      phases: timelines.map((t) => ({
        ...t,
        startDate: parseISO(t.start_date),
        endDate: parseISO(t.end_date),
      })),
      monthMarkers: markers,
    };
  }, [timelines]);

  const getPosition = (date: Date) => (differenceInDays(date, minDate) / totalDays) * 100;
  const getWidth = (start: Date, end: Date) => ((differenceInDays(end, start) + 1) / totalDays) * 100;
  const todayPosition = getPosition(today);
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  if (!projectData) {
    return (
      <div className="text-center py-16">
        <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-heading-md font-semibold text-foreground mb-2">
          Project Not Available
        </h2>
        <p className="text-muted-foreground">
          The project could not be loaded.
        </p>
      </div>
    );
  }

  const iconName = projectData.icon || "folder-kanban";
  const IconComponent =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
      iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
    ] || LucideIcons.FolderKanban;

  const statusInfo = statusLabels[projectData.status] || statusLabels.planning;

  return (
    <div className="max-w-5xl mx-auto space-y-lg">
      {/* Project Header */}
      <div className="liquid-glass-elevated rounded-2xl p-lg">
        <div className="flex items-start gap-md">
          <div className="p-md bg-primary/10 rounded-xl shrink-0">
            <IconComponent className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <h1 className="text-heading-lg font-bold text-foreground">{projectData.name}</h1>
              <Badge className={cn("text-metadata", statusInfo.className)}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-md text-metadata text-muted-foreground mt-sm">
              {projectData.due_date && (
                <span>Due {format(new Date(projectData.due_date), "MMMM d, yyyy")}</span>
              )}
              <div className="flex items-center gap-xs">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {format(new Date(projectData.updated_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          
          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex items-center gap-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {assignees.slice(0, 4).map((assignee) => (
                  <Tooltip key={assignee.id}>
                    <TooltipTrigger>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="text-metadata">
                          {assignee.profiles?.name?.[0] || assignee.profiles?.email?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      {assignee.profiles?.name || assignee.profiles?.email || "Unknown"}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {assignees.length > 4 && (
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-metadata bg-muted">
                      +{assignees.length - 4}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      {phases.length > 0 && (
        <PublicRoadmapSummary
          phases={phases.map((p: TimelinePhase) => ({ ...p, progress: getPhaseProgress(p.id, p.progress).calculatedProgress }))}
          milestones={milestones}
          projectDueDate={projectData.due_date}
        />
      )}

      {/* Timeline */}
      <div className="space-y-md">
        <h2 className="text-heading-sm font-semibold text-foreground flex items-center gap-sm">
          <span>Timeline</span>
          {phases.length > 0 && (
            <span className="text-metadata text-muted-foreground font-normal">
              ({phases.length} phase{phases.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>

        {phases.length === 0 ? (
          <div className="liquid-glass-elevated rounded-xl text-center py-xl">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-md" />
            <p className="text-body text-muted-foreground">No roadmap phases defined yet</p>
          </div>
        ) : (
          <div className="liquid-glass rounded-xl p-md overflow-x-auto">
            {/* Month markers */}
            <div className="relative h-8 mb-sm border-b border-border/50">
              {monthMarkers.map((marker, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 text-metadata font-medium text-muted-foreground"
                  style={{ left: `${marker.position}%` }}
                >
                  {format(marker.date, "MMM yyyy")}
                </div>
              ))}
            </div>

            {/* Timeline bars */}
            <div className="relative min-h-[180px]" style={{ minWidth: "600px" }}>
              {/* Today marker */}
              {isTodayVisible && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-destructive via-destructive to-transparent z-10"
                  style={{ left: `${todayPosition}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-sm py-xs bg-destructive text-destructive-foreground rounded-md text-metadata font-medium whitespace-nowrap shadow-lg">
                    Today
                  </div>
                </div>
              )}

              {/* Phase bars */}
              <div className="space-y-sm pt-sm">
                {phases.map((phase: TimelinePhase) => {
                  const colors = phaseColors[phase.color || 'primary'] || phaseColors.primary;
                  const left = getPosition(phase.startDate);
                  const width = getWidth(phase.startDate, phase.endDate);
                  const isActive = isWithinInterval(today, { start: phase.startDate, end: phase.endDate });
                  const { calculatedProgress } = getPhaseProgress(phase.id, phase.progress);

                  return (
                    <div key={phase.id} className="relative h-12">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "absolute h-full rounded-lg cursor-pointer",
                              "transition-all duration-200",
                              "hover:scale-[1.02] hover:shadow-md hover:z-10",
                              "backdrop-blur-sm border",
                              colors.glass,
                              colors.border,
                              isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background shadow-lg"
                            )}
                            style={{ left: `${left}%`, width: `${width}%`, minWidth: "100px" }}
                          >
                            <div className="h-full px-sm py-xs flex flex-col justify-between overflow-hidden">
                              <span className="text-body-sm font-semibold truncate !text-foreground">
                                {phase.phase_name}
                              </span>
                              <div className="flex items-center gap-sm">
                                <Progress value={calculatedProgress} className="h-1.5 flex-1" />
                                <span className="text-metadata font-medium !text-foreground">
                                  {calculatedProgress}%
                                </span>
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
                              <p className="text-body-sm text-muted-foreground">{phase.description}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entity Badge */}
      {accessData.entity && (
        <div className="text-center text-metadata text-muted-foreground">
          Shared by <span className="font-medium text-foreground">{accessData.entity}</span>
        </div>
      )}
    </div>
  );
}
