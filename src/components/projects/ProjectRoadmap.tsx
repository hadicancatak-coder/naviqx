import { useMemo, useState } from "react";
import { format, parseISO, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseMilestone, PhaseTaskStats } from "@/hooks/useRoadmap";
import { ProjectPhaseCard } from "./ProjectPhaseCard";
import { ProjectPhaseExpanded } from "./ProjectPhaseExpanded";
import { cn } from "@/lib/utils";

interface ProjectRoadmapProps {
  projectId: string;
  timelines: ProjectTimeline[];
  milestones?: PhaseMilestone[];
  taskStats?: PhaseTaskStats[];
  onAddPhase?: () => void;
  onEditPhase?: (phase: ProjectTimeline) => void;
  onDeletePhase?: (phaseId: string) => void;
  isReadOnly?: boolean;
}

export function ProjectRoadmap({
  projectId,
  timelines,
  milestones = [],
  taskStats = [],
  onAddPhase,
  onEditPhase,
  onDeletePhase,
  isReadOnly = false,
}: ProjectRoadmapProps) {
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);

  // Timeline calculations
  const { minDate, maxDate, totalDays, today, monthMarkers } = useMemo(() => {
    if (timelines.length === 0) {
      const now = new Date();
      return { 
        minDate: now, 
        maxDate: addDays(now, 30), 
        totalDays: 30, 
        today: now, 
        monthMarkers: [] 
      };
    }

    const dates = timelines.flatMap((t) => [parseISO(t.start_date), parseISO(t.end_date)]);
    const min = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const max = startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
    const paddedMin = addDays(min, -14);
    const paddedMax = addDays(max, 21);
    const total = differenceInDays(paddedMax, paddedMin);

    // Generate month markers
    const markers: { date: Date; position: number; label: string }[] = [];
    let current = new Date(paddedMin.getFullYear(), paddedMin.getMonth(), 1);
    while (current <= paddedMax) {
      if (current >= paddedMin) {
        markers.push({ 
          date: current, 
          position: (differenceInDays(current, paddedMin) / total) * 100,
          label: format(current, "MMM yyyy"),
        });
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalDays: total,
      today: startOfDay(new Date()),
      monthMarkers: markers,
    };
  }, [timelines]);

  const getPosition = (date: Date) => (differenceInDays(date, minDate) / totalDays) * 100;
  const getWidth = (start: Date, end: Date) => ((differenceInDays(end, start) + 1) / totalDays) * 100;
  
  const todayPosition = getPosition(today);
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  // Process phases with dates
  const phases = useMemo(() => {
    return timelines.map((t) => ({
      ...t,
      startDate: parseISO(t.start_date),
      endDate: parseISO(t.end_date),
      isActive: isWithinInterval(today, { 
        start: parseISO(t.start_date), 
        end: parseISO(t.end_date) 
      }),
    }));
  }, [timelines, today]);

  // Get milestones for a phase
  const getPhaseMilestones = (phaseId: string) => {
    return milestones.filter((m) => m.phase_id === phaseId);
  };

  // Get task stats for a phase
  const getPhaseTaskStats = (phaseId: string) => {
    return taskStats.find((s) => s.phase_id === phaseId);
  };

  if (timelines.length === 0 && isReadOnly) {
    return (
      <div className="liquid-glass-elevated rounded-xl text-center py-xl">
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-md">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-heading-sm font-semibold text-foreground mb-xs">No Roadmap Defined</h3>
        <p className="text-body-sm text-muted-foreground">
          This project doesn't have any phases yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-heading-sm font-semibold text-foreground">
          Roadmap
          {phases.length > 0 && (
            <span className="text-metadata text-muted-foreground font-normal ml-sm">
              ({phases.length} phase{phases.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>
        
        {!isReadOnly && onAddPhase && (
          <Button variant="outline" size="sm" onClick={onAddPhase} className="gap-xs">
            <Plus className="h-4 w-4" />
            Add Phase
          </Button>
        )}
      </div>

      {/* Timeline visualization */}
      {phases.length > 0 && (
        <div className="liquid-glass rounded-xl p-md overflow-x-auto">
          {/* Month markers */}
          <div className="relative h-8 mb-sm border-b border-border/50" style={{ minWidth: "700px" }}>
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 text-metadata font-medium text-muted-foreground whitespace-nowrap"
                style={{ left: `${marker.position}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>

          {/* Timeline bars */}
          <div className="relative" style={{ minWidth: "700px", minHeight: `${phases.length * 56 + 40}px` }}>
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
              {phases.map((phase) => (
                <ProjectPhaseCard
                  key={phase.id}
                  phase={phase}
                  left={getPosition(phase.startDate)}
                  width={getWidth(phase.startDate, phase.endDate)}
                  isActive={phase.isActive}
                  isExpanded={expandedPhaseId === phase.id}
                  milestones={getPhaseMilestones(phase.id)}
                  taskStats={getPhaseTaskStats(phase.id)}
                  onClick={() => setExpandedPhaseId(expandedPhaseId === phase.id ? null : phase.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state for editable */}
      {phases.length === 0 && !isReadOnly && (
        <div className="liquid-glass-elevated rounded-xl text-center py-xl">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-md">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-heading-sm font-semibold text-foreground mb-xs">Create Your Roadmap</h3>
          <p className="text-body-sm text-muted-foreground mb-md">
            Add phases to plan your project timeline
          </p>
          {onAddPhase && (
            <Button onClick={onAddPhase} className="gap-xs">
              <Plus className="h-4 w-4" />
              Add First Phase
            </Button>
          )}
        </div>
      )}

      {/* Expanded phase details */}
      {expandedPhaseId && (
        <ProjectPhaseExpanded
          phase={phases.find((p) => p.id === expandedPhaseId)!}
          milestones={getPhaseMilestones(expandedPhaseId)}
          taskStats={getPhaseTaskStats(expandedPhaseId)}
          onClose={() => setExpandedPhaseId(null)}
          onEdit={!isReadOnly && onEditPhase ? () => onEditPhase(phases.find((p) => p.id === expandedPhaseId)!) : undefined}
          onDelete={!isReadOnly && onDeletePhase ? () => onDeletePhase(expandedPhaseId) : undefined}
          isReadOnly={isReadOnly}
          projectId={projectId}
        />
      )}
    </div>
  );
}
