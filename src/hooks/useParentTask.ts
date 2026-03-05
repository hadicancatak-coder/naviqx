import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ParentTask {
  id: string;
  title: string;
}

export function useParentTask(parentId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['parentTask', parentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("id", parentId!)
        .single();
      return data as ParentTask | null;
    },
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}
