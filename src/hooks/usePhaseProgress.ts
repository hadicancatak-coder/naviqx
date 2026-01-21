import { useMemo } from "react";
import { PhaseMilestone, PhaseTaskStats } from "./useRoadmap";

interface PhaseProgressResult {
  calculatedProgress: number;
  milestoneProgress: number;
  taskProgress: number;
  completedMilestones: number;
  totalMilestones: number;
  completedTasks: number;
  totalTasks: number;
}

/**
 * Calculate phase progress based on milestones (60% weight) and tasks (40% weight)
 */
export function calculatePhaseProgress(
  milestones: PhaseMilestone[],
  taskStats: PhaseTaskStats | undefined
): PhaseProgressResult {
  const completedMilestones = milestones.filter((m) => m.is_completed).length;
  const totalMilestones = milestones.length;
  const milestoneProgress =
    totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const completedTasks = taskStats?.completed_tasks || 0;
  const totalTasks = taskStats?.total_tasks || 0;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate weighted progress
  let calculatedProgress: number;

  if (totalMilestones === 0 && totalTasks === 0) {
    calculatedProgress = 0;
  } else if (totalMilestones === 0) {
    // No milestones, use 100% task weight
    calculatedProgress = taskProgress;
  } else if (totalTasks === 0) {
    // No tasks, use 100% milestone weight
    calculatedProgress = milestoneProgress;
  } else {
    // Both exist: 60% milestones, 40% tasks
    calculatedProgress = milestoneProgress * 0.6 + taskProgress * 0.4;
  }

  return {
    calculatedProgress: Math.round(calculatedProgress),
    milestoneProgress: Math.round(milestoneProgress),
    taskProgress: Math.round(taskProgress),
    completedMilestones,
    totalMilestones,
    completedTasks,
    totalTasks,
  };
}

/**
 * Hook to get calculated progress for a phase
 */
export function usePhaseProgress(
  phaseId: string,
  allMilestones: PhaseMilestone[],
  taskStats: PhaseTaskStats[]
): PhaseProgressResult {
  return useMemo(() => {
    const phaseMilestones = allMilestones.filter((m) => m.phase_id === phaseId);
    const phaseTaskStat = taskStats.find((s) => s.phase_id === phaseId);
    return calculatePhaseProgress(phaseMilestones, phaseTaskStat);
  }, [phaseId, allMilestones, taskStats]);
}

/**
 * Hook to get calculated progress for all phases
 */
export function useAllPhasesProgress(
  phaseIds: string[],
  allMilestones: PhaseMilestone[],
  taskStats: PhaseTaskStats[]
): Map<string, PhaseProgressResult> {
  return useMemo(() => {
    const progressMap = new Map<string, PhaseProgressResult>();
    
    for (const phaseId of phaseIds) {
      const phaseMilestones = allMilestones.filter((m) => m.phase_id === phaseId);
      const phaseTaskStat = taskStats.find((s) => s.phase_id === phaseId);
      progressMap.set(phaseId, calculatePhaseProgress(phaseMilestones, phaseTaskStat));
    }
    
    return progressMap;
  }, [phaseIds, allMilestones, taskStats]);
}
