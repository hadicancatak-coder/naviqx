import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskChangeLog {
  id: string;
  task_id: string;
  changed_by: string;
  changed_at: string;
  field_name: string;
  old_value: any;
  new_value: any;
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

      // Fetch profiles for each change log
      const logsWithProfiles = await Promise.all(
        (data || []).map(async (log) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", log.changed_by)
            .single();
          return { ...log, profiles: profile };
        })
      );

      return logsWithProfiles as TaskChangeLog[];
    },
    enabled: !!taskId && taskId !== "undefined" && taskId !== "",
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
};
