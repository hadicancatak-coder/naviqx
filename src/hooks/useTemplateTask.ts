import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TemplateTaskData {
  id: string;
  recurrence_rrule: string | null;
  next_run_at: string | null;
  recurrence_end_type: string | null;
  recurrence_end_value: string | null;
}

/**
 * Fetches template task data for recurring task instances.
 * Used to get the recurrence schedule when viewing an instance.
 */
export function useTemplateTask(templateTaskId: string | null | undefined) {
  return useQuery<TemplateTaskData | null>({
    queryKey: ['template-task', templateTaskId],
    queryFn: async () => {
      if (!templateTaskId) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, recurrence_rrule, next_run_at, recurrence_end_type, recurrence_end_value')
        .eq('id', templateTaskId)
        .single();
      
      if (error) {
        console.error('Error fetching template task:', error);
        return null;
      }
      
      return data as TemplateTaskData;
    },
    enabled: !!templateTaskId,
    staleTime: 30_000, // 30 seconds
  });
}
