import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTaskBlocker(taskId: string) {
  const [blocker, setBlocker] = useState<any>(null);
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
