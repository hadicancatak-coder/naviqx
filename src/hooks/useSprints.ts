import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useSprints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Sprint[];
    },
    enabled: !!user,
  });

  const createSprintMutation = useMutation({
    mutationFn: async (sprint: Omit<Sprint, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('sprints')
        .insert({ ...sprint, created_by: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({ title: "Sprint created" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating sprint", description: error.message, variant: "destructive" });
    },
  });

  const updateSprintMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sprint> & { id: string }) => {
      const { data, error } = await supabase
        .from('sprints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({ title: "Sprint updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating sprint", description: error.message, variant: "destructive" });
    },
  });

  const deleteSprintMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({ title: "Sprint deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting sprint", description: error.message, variant: "destructive" });
    },
  });

  // Get active sprint
  const activeSprint = query.data?.find(s => s.status === 'active');
  
  // Get upcoming sprints (planning status)
  const upcomingSprints = query.data?.filter(s => s.status === 'planning') || [];
  
  // Get completed sprints
  const completedSprints = query.data?.filter(s => s.status === 'completed') || [];

  return {
    sprints: query.data || [],
    activeSprint,
    upcomingSprints,
    completedSprints,
    isLoading: query.isLoading,
    error: query.error,
    createSprint: createSprintMutation.mutate,
    updateSprint: updateSprintMutation.mutate,
    deleteSprint: deleteSprintMutation.mutate,
    isCreating: createSprintMutation.isPending,
    isUpdating: updateSprintMutation.isPending,
    isDeleting: deleteSprintMutation.isPending,
  };
}
