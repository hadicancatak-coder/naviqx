import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import type { Json } from "@/integrations/supabase/types";

export interface TaskChangeLog {
  id: string;
  task_id: string;
  changed_by: string;
  changed_at: string;
  field_name: string;
  old_value: Json;
  new_value: Json;
  change_type: string;
  description: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

export const useTaskChangeLogs = (taskId: string) => {
  return useQuery({
    queryKey: ["task-change-logs", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_change_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("changed_at", { ascending: true });

      if (error) throw error;

      const logs = data || [];
      const authorIds = [...new Set(logs.map(l => l.changed_by))];

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("name, avatar_url, user_id")
          .in("user_id", authorIds);

        return logs.map(log => ({
          ...log,
          profiles: profilesData?.find(p => p.user_id === log.changed_by) || undefined,
        })) as TaskChangeLog[];
      }

      return logs as TaskChangeLog[];
    },
    enabled: !!taskId && taskId !== "undefined" && taskId !== "",
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};
