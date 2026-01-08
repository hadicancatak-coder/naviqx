import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FolderKanban, Users } from "lucide-react";
import { format, parseISO, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { useEffect, useMemo } from "react";

const phaseColors: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary" },
  success: { bg: "bg-success/20", border: "border-success/40", text: "text-success-text" },
  warning: { bg: "bg-warning/20", border: "border-warning/40", text: "text-warning-text" },
  info: { bg: "bg-info/20", border: "border-info/40", text: "text-info-text" },
  destructive: { bg: "bg-destructive/20", border: "border-destructive/40", text: "text-destructive-text" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-600 dark:text-purple-400" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-600 dark:text-cyan-400" },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/20 text-success-text" },
  "on-hold": { label: "On Hold", className: "bg-warning/20 text-warning-text" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
};

export default function ProjectsPublic() {
  const { token } = useParams<{ token: string }>();

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-md" />
          <h1 className="text-heading-lg font-semibold text-foreground mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">This project doesn't exist or is no longer shared.</p>
        </div>
      </div>
    );
  }

  const iconName = project.icon || "folder-kanban";
  const IconComponent =
    (LucideIcons as any)[iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("")] ||
    LucideIcons.FolderKanban;

  const statusInfo = statusLabels[project.status] || statusLabels.planning;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-muted-foreground text-body-sm">
            <FolderKanban className="h-4 w-4" />
            <span>Project Roadmap</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-lg">
        {/* Title Section */}
        <div className="flex items-start gap-md">
          <div className="p-3 bg-primary/10 rounded-xl">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-sm">
              <h1 className="text-heading-lg font-semibold text-foreground">{project.name}</h1>
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            </div>
            <p className="text-metadata text-muted-foreground mt-1">
              Last updated {format(new Date(project.updated_at), "MMMM d, yyyy")}
              {project.due_date && (
                <span className="ml-2">• Due {format(new Date(project.due_date), "MMM d, yyyy")}</span>
              )}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {project.purpose && (
            <div className="space-y-2">
              <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Purpose</h3>
              <p className="text-body text-foreground">{project.purpose}</p>
            </div>
          )}
          {project.outcomes && (
            <div className="space-y-2">
              <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Expected Outcomes</h3>
              <p className="text-body text-foreground">{project.outcomes}</p>
            </div>
          )}
        </div>

        {/* Stakeholders */}
        {assignees && assignees.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Users className="h-4 w-4" />
              Stakeholders
            </h3>
            <div className="flex flex-wrap gap-2">
              {assignees.map((a: any) => (
                <div key={a.id} className="px-3 py-1.5 bg-subtle rounded-full text-body-sm">
                  {a.profiles?.name || a.profiles?.email}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div className="space-y-2">
            <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Description</h3>
            <p className="text-body text-foreground whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        {/* Roadmap */}
        <div className="space-y-md">
          <h3 className="text-heading-sm font-semibold text-foreground">Roadmap</h3>

          {phases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              <p className="text-body-sm">No roadmap phases defined yet</p>
            </div>
          ) : (
            <div className="relative bg-card border border-border rounded-xl p-md overflow-x-auto">
              {/* Month markers */}
              <div className="relative h-6 mb-2 border-b border-border">
                {monthMarkers.map((marker: any, idx: number) => (
                  <div
                    key={idx}
                    className="absolute top-0 text-metadata text-muted-foreground"
                    style={{ left: `${marker.position}%` }}
                  >
                    {format(marker.date, "MMM yyyy")}
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="relative min-h-[200px]" style={{ minWidth: "600px" }}>
                {/* Today marker */}
                {isTodayVisible && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded text-metadata whitespace-nowrap">
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

                    return (
                      <div key={phase.id} className="relative h-14">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute h-full rounded-lg border-2",
                                colors.bg,
                                colors.border,
                                isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              )}
                              style={{ left: `${left}%`, width: `${width}%`, minWidth: "80px" }}
                            >
                              <div className="h-full px-3 py-2 flex flex-col justify-between overflow-hidden">
                                <span className={cn("text-body-sm font-medium truncate", colors.text)}>
                                  {phase.phase_name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Progress value={phase.progress} className="h-1.5 flex-1" />
                                  <span className="text-metadata text-muted-foreground">{phase.progress}%</span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{phase.phase_name}</p>
                              <p className="text-metadata">
                                {format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}
                              </p>
                              {phase.description && (
                                <p className="text-metadata text-muted-foreground">{phase.description}</p>
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-body-sm text-muted-foreground">
            Proudly presented by the Performance Marketing Team at CFI Group. This page was built internally with AI.
            Do not share with third parties; internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
