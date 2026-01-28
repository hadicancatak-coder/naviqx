import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ParentTask {
  id: string;
  title: string;
}

export function useParentTask(parentId: string | null | undefined) {
  const [parentTask, setParentTask] = useState<ParentTask | null>(null);

  useEffect(() => {
    if (parentId) {
      supabase
        .from("tasks")
        .select("id, title")
        .eq("id", parentId)
        .single()
        .then(({ data }) => setParentTask(data));
    } else {
      setParentTask(null);
    }
  }, [parentId]);

  return parentTask;
}
