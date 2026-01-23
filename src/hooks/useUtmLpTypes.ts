import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UtmLpType {
  id: string;
  name: string;
  description: string | null;
  default_url_pattern: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const useUtmLpTypes = () => {
  return useQuery({
    queryKey: ['utm-lp-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utm_lp_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as UtmLpType[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateLpType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lpType: Omit<UtmLpType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('utm_lp_types')
        .insert([lpType])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-lp-types'] });
      toast.success('LP type created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create LP type: ' + error.message);
    },
  });
};

export const useUpdateLpType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UtmLpType> & { id: string }) => {
      const { data, error } = await supabase
        .from('utm_lp_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-lp-types'] });
      toast.success('LP type updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update LP type: ' + error.message);
    },
  });
};

export const useDeleteLpType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('utm_lp_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-lp-types'] });
      toast.success('LP type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete LP type: ' + error.message);
    },
  });
};
