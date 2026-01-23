import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FolderKanban, Users, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { format, parseISO, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";
import { PublicPhaseCard, PublicRoadmapSummary } from "@/components/projects/roadmap";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

export default function ProjectsPublic() {
  const { token } = useParams<{ token: string }>();
  const [showDetails, setShowDetails] = useState(false);

  // Fetch project
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project-public", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("public_token", token)
        .eq("is_public", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Project not found or not public");
      return data;
    },
    enabled: !!token,
  });

  // Fetch timelines
  const { data: timelines } = useQuery({
    queryKey: ["project-timelines-public", project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data, error } = await supabase
        .from("project_timelines")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!project?.id,
  });

  // Fetch milestones for all phases
  const phaseIds = useMemo(() => timelines?.map((t) => t.id) || [], [timelines]);
  
  const { data: milestones = [] } = useQuery({
    queryKey: ["project-milestones-public", phaseIds],
    queryFn: async () => {
      if (phaseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("phase_milestones")
        .select("*")
        .in("phase_id", phaseIds)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PhaseMilestone[];
    },
    enabled: phaseIds.length > 0,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Fetch task stats for progress calculation
  const { data: taskStats = [] } = useQuery({
    queryKey: ["project-task-stats-public", project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, phase_id, status")
        .eq("project_id", project.id)
        .not("phase_id", "is", null);

      if (error) throw error;

      const statsMap = new Map<string, PhaseTaskStats>();
      for (const task of data || []) {
        if (!task.phase_id) continue;
        const existing = statsMap.get(task.phase_id) || {
          phase_id: task.phase_id,
          total_tasks: 0,
          completed_tasks: 0,
        };
        existing.total_tasks++;
        if (task.status === "Completed") {
          existing.completed_tasks++;
        }
        statsMap.set(task.phase_id, existing);
      }
      return Array.from(statsMap.values());
    },
    enabled: !!project?.id,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Calculate progress for a phase using milestones + tasks
  const getPhaseProgress = useCallback((phaseId: string) => {
    const phaseMilestones = milestones.filter((m) => m.phase_id === phaseId);
    const phaseTaskStat = taskStats.find((s) => s.phase_id === phaseId);
    return calculatePhaseProgress(phaseMilestones, phaseTaskStat);
  }, [milestones, taskStats]);

  // Fetch assignees
  const { data: assignees } = useQuery({
    queryKey: ["project-assignees-public", project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data, error } = await supabase
        .from("project_assignees")
        .select(`
          id,
          user_id,
          profiles:user_id (id, name, email)
        `)
        .eq("project_id", project.id);

      if (error) throw error;
      return data;
    },
    enabled: !!project?.id,
  });

  // Track page view
  useEffect(() => {
    if (project?.id) {
      supabase
        .from("projects")
        .update({
          click_count: (project.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .then(() => {});
    }
  }, [project?.id]);

  // Roadmap calculations
  const { minDate, maxDate, totalDays, today, phases, monthMarkers } = useMemo(() => {
    if (!timelines || timelines.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 1, today: new Date(), phases: [], monthMarkers: [] };
    }

    const dates = timelines.flatMap((t: any) => [parseISO(t.start_date), parseISO(t.end_date)]);
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
      phases: timelines.map((t: any) => ({
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

  if (isLoading) {
    return (
      <GlassBackground variant="centered">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-body-sm text-muted-foreground">Loading project...</p>
        </div>
      </GlassBackground>
    );
  }

  if (error || !project) {
    return (
      <GlassBackground variant="centered">
        <div className="liquid-glass-elevated p-lg text-center max-w-md w-full rounded-2xl">
          <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-md" />
          <h1 className="text-heading-lg font-semibold text-foreground mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">This project doesn't exist or is no longer shared.</p>
        </div>
      </GlassBackground>
    );
  }

  const iconName = project.icon || "folder-kanban";
  const IconComponent =
    (LucideIcons as any)[iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("")] ||
    LucideIcons.FolderKanban;

  const statusInfo = statusLabels[project.status] || statusLabels.planning;

  return (
    <GlassBackground variant="full">
      {/* Header */}
      <header className="border-b border-border/50 liquid-glass sticky top-0 z-sticky">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-body-sm">
              <FolderKanban className="h-4 w-4" />
              <span>Project Roadmap</span>
            </div>
            <p className="text-metadata text-muted-foreground">
              Last updated {format(new Date(project.updated_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-lg">
        {/* Title Section - Premium Header */}
        <div className="liquid-glass-elevated rounded-2xl p-lg">
          <div className="flex items-start gap-md">
            <div className="p-4 bg-primary/10 rounded-xl shrink-0">
              <IconComponent className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm flex-wrap">
                <h1 className="text-heading-lg font-bold text-foreground">{project.name}</h1>
                <Badge className={cn("text-metadata", statusInfo.className)}>{statusInfo.label}</Badge>
              </div>
              {project.due_date && (
                <p className="text-body-sm text-muted-foreground mt-2">
                  Due {format(new Date(project.due_date), "MMMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        {phases.length > 0 && (
          <PublicRoadmapSummary
            phases={phases.map((p: any) => ({ ...p, progress: getPhaseProgress(p.id).calculatedProgress }))}
            milestones={milestones}
            projectDueDate={project.due_date}
          />
        )}

        {/* Visual Roadmap Timeline */}
        <div className="space-y-md">
          <h2 className="text-heading-sm font-semibold text-foreground flex items-center gap-2">
            <span>Timeline</span>
            {phases.length > 0 && (
              <span className="text-metadata text-muted-foreground font-normal">
                ({phases.length} phase{phases.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>

          {phases.length === 0 ? (
            <div className="liquid-glass-elevated rounded-xl text-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-body text-muted-foreground">No roadmap phases defined yet</p>
            </div>
          ) : (
            <div className="liquid-glass rounded-xl p-md overflow-x-auto">
              {/* Month markers */}
              <div className="relative h-8 mb-3 border-b border-border/50">
                {monthMarkers.map((marker: any, idx: number) => (
                  <div
                    key={idx}
                    className="absolute top-0 text-metadata font-medium text-muted-foreground"
                    style={{ left: `${marker.position}%` }}
                  >
                    {format(marker.date, "MMM yyyy")}
                  </div>
                ))}
              </div>

              {/* Timeline with bars */}
              <div className="relative min-h-[180px]" style={{ minWidth: "600px" }}>
                {/* Today marker */}
                {isTodayVisible && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-destructive via-destructive to-transparent z-10"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-destructive text-destructive-foreground rounded-md text-metadata font-medium whitespace-nowrap shadow-lg">
                      Today
                    </div>
                  </div>
                )}

                {/* Phase bars */}
                <div className="space-y-3 pt-2">
                  {phases.map((phase: any) => {
                    const colors = phaseColors[phase.color] || phaseColors.primary;
                    const left = getPosition(phase.startDate);
                    const width = getWidth(phase.startDate, phase.endDate);
                    const isActive = isWithinInterval(today, { start: phase.startDate, end: phase.endDate });
                    const { calculatedProgress } = getPhaseProgress(phase.id);

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
                              <div className="h-full px-3 py-2 flex flex-col justify-between overflow-hidden">
                                <span className={cn("text-body-sm font-semibold truncate", colors.text)}>
                                  {phase.phase_name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Progress value={calculatedProgress} className="h-1.5 flex-1" />
                                  <span className="text-metadata font-medium text-muted-foreground">
                                    {calculatedProgress}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="liquid-glass-dropdown max-w-xs">
                            <div className="space-y-1.5 p-1">
                              <p className="font-semibold text-foreground">{phase.phase_name}</p>
                              <p className="text-metadata text-muted-foreground">
                                {format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}
                              </p>
                              {phase.description && (
                                <p className="text-body-sm text-muted-foreground line-clamp-2">{phase.description}</p>
                              )}
                              <p className="text-metadata text-primary font-medium">Click phase below for details →</p>
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

        {/* Phase Details - Clickable Cards */}
        {phases.length > 0 && (
          <div className="space-y-md">
            <h2 className="text-heading-sm font-semibold text-foreground">Phase Details</h2>
            <p className="text-body-sm text-muted-foreground -mt-2">
              Click any phase to view milestones and details
            </p>
            <div className="space-y-3">
              {phases.map((phase: any) => {
                const colors = phaseColors[phase.color] || phaseColors.primary;
                const { calculatedProgress } = getPhaseProgress(phase.id);
                return (
                  <PublicPhaseCard
                    key={phase.id}
                    phase={{ ...phase, progress: calculatedProgress }}
                    milestones={milestones}
                    isActive={isWithinInterval(today, { start: phase.startDate, end: phase.endDate })}
                    colorClasses={colors}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Project Details - Collapsible */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger className="w-full">
            <div className="liquid-glass-elevated rounded-xl px-md py-sm flex items-center justify-between hover:bg-card-hover transition-smooth cursor-pointer">
              <h2 className="text-heading-sm font-semibold text-foreground">Project Details</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-body-sm">
                  {showDetails ? "Hide" : "Show"} details
                </span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-md">
              {/* Purpose & Outcomes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {project.purpose && (
                  <div className="liquid-glass-elevated rounded-xl p-md space-y-2">
                    <h3 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Purpose
                    </h3>
                    <p className="text-body text-foreground leading-relaxed">{project.purpose}</p>
                  </div>
                )}
                {project.outcomes && (
                  <div className="liquid-glass-elevated rounded-xl p-md space-y-2">
                    <h3 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Expected Outcomes
                    </h3>
                    <p className="text-body text-foreground leading-relaxed">{project.outcomes}</p>
                  </div>
                )}
              </div>

              {/* Stakeholders */}
              {assignees && assignees.length > 0 && (
                <div className="liquid-glass-elevated rounded-xl p-md space-y-3">
                  <h3 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Stakeholders
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((a: any) => (
                      <div 
                        key={a.id} 
                        className="px-3 py-1.5 bg-muted rounded-full text-body-sm font-medium text-foreground"
                      >
                        {a.profiles?.name || a.profiles?.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {project.description && (
                <div className="liquid-glass-elevated rounded-xl p-md space-y-2">
                  <h3 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </h3>
                  <p className="text-body text-foreground whitespace-pre-wrap leading-relaxed">
                    {project.description}
                  </p>
                </div>
              )}

              {/* No details available */}
              {!project.purpose && !project.outcomes && !project.description && (!assignees || assignees.length === 0) && (
                <div className="liquid-glass-elevated rounded-xl p-md text-center">
                  <p className="text-body-sm text-muted-foreground">No additional details available for this project.</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </main>

      {/* Footer */}
      <ExternalPageFooter />
    </GlassBackground>
  );
}
