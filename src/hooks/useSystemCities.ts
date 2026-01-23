import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SeminarCityRow = Database["public"]["Tables"]["seminar_cities"]["Row"];
type SeminarCityInsert = Database["public"]["Tables"]["seminar_cities"]["Insert"];
type SeminarCityUpdate = Database["public"]["Tables"]["seminar_cities"]["Update"];

export type SeminarCity = SeminarCityRow;

export const useSystemCities = () => {
  return useQuery({
    queryKey: ["system-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seminar_cities")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SeminarCity[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
};

export const useAllCities = () => {
  return useQuery({
    queryKey: ["system-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seminar_cities")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SeminarCity[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - city data rarely changes
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (city: Omit<SeminarCityInsert, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("seminar_cities")
        .insert(city)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-cities"] });
      toast.success("City created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create city: ${error.message}`);
    },
  });
};

export const useUpdateCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<SeminarCityUpdate>) => {
      const { data, error } = await supabase
        .from("seminar_cities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-cities"] });
      toast.success("City updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update city: ${error.message}`);
    },
  });
};

export const useDeleteCity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seminar_cities")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-cities"] });
      toast.success("City deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete city: ${error.message}`);
    },
  });
};
