import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProjectTimeline } from "@/hooks/useProjects";

// Step Lane definitions - categories for organizing steps
export const STEP_LANES = [
  { id: "discovery", label: "Discovery & Analysis", color: "bg-purple-500/10 border-purple-500/30" },
  { id: "infrastructure", label: "Data & Infrastructure", color: "bg-blue-500/10 border-blue-500/30" },
  { id: "tracking", label: "Tracking & Signals", color: "bg-cyan-500/10 border-cyan-500/30" },
  { id: "validation", label: "Validation & QA", color: "bg-amber-500/10 border-amber-500/30" },
  { id: "activation", label: "Activation & Outcomes", color: "bg-green-500/10 border-green-500/30" },
  { id: "execution", label: "Execution", color: "bg-primary/10 border-primary/30" },
] as const;

export type StepLaneId = typeof STEP_LANES[number]["id"];

interface StepLanesProps {
  steps: (ProjectTimeline & { startDate: Date; endDate: Date })[];
  children: (lane: typeof STEP_LANES[number], laneSteps: (ProjectTimeline & { startDate: Date; endDate: Date })[]) => React.ReactNode;
}

export function StepLanes({ steps, children }: StepLanesProps) {
  // Group steps by lane
  const stepsByLane = useMemo(() => {
    const grouped = new Map<string, (ProjectTimeline & { startDate: Date; endDate: Date })[]>();
    
    STEP_LANES.forEach(lane => {
      grouped.set(lane.id, []);
    });
    
    steps.forEach(step => {
      const laneId = (step as any).step_lane || "execution";
      const laneSteps = grouped.get(laneId) || [];
      laneSteps.push(step);
      grouped.set(laneId, laneSteps);
    });
    
    return grouped;
  }, [steps]);

  // Only show lanes that have steps
  const activeLanes = STEP_LANES.filter(lane => {
    const laneSteps = stepsByLane.get(lane.id) || [];
    return laneSteps.length > 0;
  });

  // If no lane organization, show all steps in a flat view
  if (activeLanes.length <= 1) {
    return <>{children(STEP_LANES[5], steps)}</>;
  }

  return (
    <div className="space-y-1">
      {activeLanes.map(lane => {
        const laneSteps = stepsByLane.get(lane.id) || [];
        if (laneSteps.length === 0) return null;
        
        return (
          <div key={lane.id} className="relative">
            {/* Lane label */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1 rounded-full",
              lane.color.split(" ")[0].replace("/10", "/40")
            )} />
            <div className="pl-4">
              <span className="text-metadata font-medium text-muted-foreground mb-1 block">
                {lane.label}
              </span>
              {children(lane, laneSteps)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper to get lane info
export function getStepLane(laneId: string) {
  return STEP_LANES.find(l => l.id === laneId) || STEP_LANES[5];
}
