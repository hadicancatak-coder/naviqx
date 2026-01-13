import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays } from "date-fns";

interface RecurringCompletion {
  id: string;
  task_id: string;
  completed_by: string | null;
  completed_at: string | null;
  completed_date: string;
}

export function useRecurringCompletions(taskId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch completions for the last 14 days
  const { data: completions, isLoading } = useQuery({
    queryKey: ['recurring-completions', taskId],
    queryFn: async () => {
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('recurring_task_completions')
        .select('*')
        .eq('task_id', taskId)
        .gte('completed_date', fourteenDaysAgo)
        .order('completed_date', { ascending: false });

      if (error) throw error;
      return data as RecurringCompletion[];
    },
    enabled: !!taskId,
  });

  // Check if completed today
  const isCompletedToday = (completions || []).some(
    (c) => c.completed_date === format(new Date(), 'yyyy-MM-dd')
  );

  // Mark as done for today
  const markDoneToday = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if already completed today
      const { data: existing } = await supabase
        .from('recurring_task_completions')
        .select('id')
        .eq('task_id', taskId)
        .eq('completed_date', today)
        .maybeSingle();

      if (existing) {
        throw new Error('Already completed today');
      }

      const { error } = await supabase
        .from('recurring_task_completions')
        .insert({
          task_id: taskId,
          completed_by: user.id,
          completed_date: today,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-completions', taskId] });
    },
  });

  // Undo today's completion
  const undoToday = useMutation({
    mutationFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('recurring_task_completions')
        .delete()
        .eq('task_id', taskId)
        .eq('completed_date', today);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-completions', taskId] });
    },
  });

  // Calculate streak (consecutive days completed)
  const calculateStreak = () => {
    if (!completions || completions.length === 0) return 0;
    
    const sortedDates = [...new Set(completions.map(c => c.completed_date))].sort().reverse();
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // If not completed today or yesterday, no streak
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;
    
    let streak = 0;
    let expectedDate = sortedDates[0] === today ? today : yesterday;
    
    for (const date of sortedDates) {
      if (date === expectedDate) {
        streak++;
        expectedDate = format(subDays(new Date(expectedDate), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }
    
    return streak;
  };

  return {
    completions: completions || [],
    isLoading,
    isCompletedToday,
    markDoneToday,
    undoToday,
    streak: calculateStreak(),
  };
}