import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Entity {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export const useEntities = () => {
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_entities")
        .select("id, name, code, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as Entity[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
