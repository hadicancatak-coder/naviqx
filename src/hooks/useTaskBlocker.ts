import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BlockerRow = Database["public"]["Tables"]["blockers"]["Row"];

export interface TaskBlockerResult {
  blocker: BlockerRow | null;
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (open: boolean) => void;
  fetchBlocker: () => Promise<void>;
}

export function useTaskBlocker(taskId: string): TaskBlockerResult {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['taskBlocker', taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from("blockers")
        .select("*")
        .eq("task_id", taskId)
        .eq("resolved", false)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
  });

  const fetchBlocker = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['taskBlocker', taskId] });
  }, [taskId, queryClient]);

  return {
    blocker: data ?? null,
    blockerDialogOpen: dialogOpen,
    setBlockerDialogOpen: setDialogOpen,
    fetchBlocker,
  };
}
