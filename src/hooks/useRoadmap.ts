import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface PhaseMilestone {
  id: string;
  phase_id: string;
  name: string;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  created_at: string;
}

export interface PhaseDependency {
  id: string;
  phase_id: string;
  depends_on_phase_id: string;
  created_at: string;
}

export interface PhaseTaskStats {
  phase_id: string;
  total_tasks: number;
  completed_tasks: number;
}

// Hook for phase milestones
export function usePhaseMilestones(phaseId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["phase-milestones", phaseId],
    queryFn: async () => {
      if (!phaseId) return [];
      const { data, error } = await supabase
        .from("phase_milestones")
        .select("*")
        .eq("phase_id", phaseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PhaseMilestone[];
    },
    enabled: !!phaseId,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createMilestone = useMutation({
    mutationFn: async (milestone: { phase_id: string; name: string; due_date?: string }) => {
      const { data, error } = await supabase
        .from("phase_milestones")
        .insert({
          phase_id: milestone.phase_id,
          name: milestone.name,
          due_date: milestone.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-milestones", phaseId] });
      queryClient.invalidateQueries({ queryKey: ["all-milestones"] });
    },
    onError: (error) => {
      toast({ title: "Failed to add milestone", description: error.message, variant: "destructive" });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async (milestone: Partial<PhaseMilestone> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (milestone.name !== undefined) updates.name = milestone.name;
      if (milestone.due_date !== undefined) updates.due_date = milestone.due_date;
      if (milestone.is_completed !== undefined) {
        updates.is_completed = milestone.is_completed;
        updates.completed_at = milestone.is_completed ? new Date().toISOString() : null;
      }
      if (milestone.order_index !== undefined) updates.order_index = milestone.order_index;

      const { data, error } = await supabase
        .from("phase_milestones")
        .update(updates)
        .eq("id", milestone.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-milestones", phaseId] });
      queryClient.invalidateQueries({ queryKey: ["all-milestones"] });
    },
    onError: (error) => {
      toast({ title: "Failed to update milestone", description: error.message, variant: "destructive" });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phase_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-milestones", phaseId] });
      queryClient.invalidateQueries({ queryKey: ["all-milestones"] });
    },
  });

  return {
    milestones,
    isLoading,
    createMilestone,
    updateMilestone,
    deleteMilestone,
  };
}

// Hook for all milestones in a project (for summary)
export function useAllProjectMilestones(projectId: string | null, phaseIds: string[]) {
  const { data: milestones, isLoading } = useQuery({
    queryKey: ["all-milestones", projectId, phaseIds],
    queryFn: async () => {
      if (!projectId || phaseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("phase_milestones")
        .select("*")
        .in("phase_id", phaseIds)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as PhaseMilestone[];
    },
    enabled: !!projectId && phaseIds.length > 0,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return { milestones, isLoading };
}

// Hook for phase dependencies
export function usePhaseDependencies(projectId: string | null, phaseIds: string[]) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dependencies, isLoading } = useQuery({
    queryKey: ["phase-dependencies", projectId],
    queryFn: async () => {
      if (!projectId || phaseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("phase_dependencies")
        .select("*")
        .in("phase_id", phaseIds);

      if (error) throw error;
      return data as PhaseDependency[];
    },
    enabled: !!projectId && phaseIds.length > 0,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createDependency = useMutation({
    mutationFn: async (dep: { phase_id: string; depends_on_phase_id: string }) => {
      const { data, error } = await supabase
        .from("phase_dependencies")
        .insert(dep)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-dependencies", projectId] });
    },
    onError: (error) => {
      toast({ title: "Failed to add dependency", description: error.message, variant: "destructive" });
    },
  });

  const deleteDependency = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phase_dependencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-dependencies", projectId] });
    },
  });

  return {
    dependencies,
    isLoading,
    createDependency,
    deleteDependency,
  };
}

// Hook for task stats per phase
export function usePhaseTaskStats(projectId: string | null) {
  const { data: taskStats, isLoading } = useQuery({
    queryKey: ["phase-task-stats", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Get all tasks for this project that have a phase_id
      const { data, error } = await supabase
        .from("tasks")
        .select("id, phase_id, status")
        .eq("project_id", projectId)
        .not("phase_id", "is", null);

      if (error) throw error;
      
      // Group by phase_id
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
    enabled: !!projectId,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return { taskStats, isLoading };
}
