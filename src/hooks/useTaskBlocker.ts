import { useState, useCallback, useEffect } from "react";
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
  const [blocker, setBlocker] = useState<BlockerRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchBlocker = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from("blockers")
      .select("*")
      .eq("task_id", taskId)
      .eq("resolved", false)
      .maybeSingle();
    setBlocker(data);
  }, [taskId]);

  useEffect(() => {
    fetchBlocker();
  }, [fetchBlocker]);

  return { 
    blocker, 
    blockerDialogOpen: dialogOpen, 
    setBlockerDialogOpen: setDialogOpen, 
    fetchBlocker 
  };
}
