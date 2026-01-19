import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import { ProjectTimeline } from "@/hooks/useProjects";
import { PhaseDependency } from "@/hooks/useRoadmap";

interface DependencyLinesProps {
  phases: (ProjectTimeline & { startDate: Date; endDate: Date })[];
  dependencies: PhaseDependency[];
  minDate: Date;
  totalDays: number;
  phaseRowHeight: number;
  expandedPhaseId: string | null;
}

interface PhasePosition {
  id: string;
  left: number;
  right: number;
  centerY: number;
  index: number;
}

export function DependencyLines({
  phases,
  dependencies,
  minDate,
  totalDays,
  phaseRowHeight,
  expandedPhaseId,
}: DependencyLinesProps) {
  const phasePositions = useMemo(() => {
    const positions: PhasePosition[] = [];
    let yOffset = 0;

    phases.forEach((phase, idx) => {
      const left = (differenceInDays(phase.startDate, minDate) / totalDays) * 100;
      const width = ((differenceInDays(phase.endDate, phase.startDate) + 1) / totalDays) * 100;
      const right = left + width;
      
      // Account for expanded card height
      const rowHeight = expandedPhaseId === phase.id ? 250 : phaseRowHeight;
      const centerY = yOffset + rowHeight / 2;
      
      positions.push({
        id: phase.id,
        left,
        right,
        centerY,
        index: idx,
      });
      
      yOffset += rowHeight + 12; // 12px gap between rows
    });

    return positions;
  }, [phases, minDate, totalDays, phaseRowHeight, expandedPhaseId]);

  // Move useMemo BEFORE the early return to fix hooks order
  const lines = useMemo(() => {
    // Return empty if phase is expanded or no dependencies
    if (expandedPhaseId || dependencies.length === 0) return [];
    
    return dependencies
      .map((dep) => {
        const from = phasePositions.find((p) => p.id === dep.depends_on_phase_id);
        const to = phasePositions.find((p) => p.id === dep.phase_id);
        
        if (!from || !to) return null;

        // Draw line from end of "from" phase to start of "to" phase
        const x1 = from.right;
        const y1 = from.centerY;
        const x2 = to.left;
        const y2 = to.centerY;

        // Calculate control points for curved line
        const midX = (x1 + x2) / 2;
        const curveOffset = Math.abs(y2 - y1) * 0.3;

        return {
          id: dep.id,
          path: `M ${x1}% ${y1} C ${midX + curveOffset}% ${y1}, ${midX - curveOffset}% ${y2}, ${x2}% ${y2}`,
          fromIndex: from.index,
          toIndex: to.index,
        };
      })
      .filter(Boolean);
  }, [dependencies, phasePositions, expandedPhaseId]);

  // Early return AFTER all hooks are called
  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <polygon
            points="0 0, 6 2, 0 4"
            className="fill-muted-foreground/50"
          />
        </marker>
      </defs>
      {lines.map((line) => (
        <path
          key={line!.id}
          d={line!.path}
          className="stroke-muted-foreground/40"
          fill="none"
          strokeWidth="2"
          strokeDasharray="4 2"
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}
