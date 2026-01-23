import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdTemplate {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  entity?: string;
  headlines: string[];
  descriptions: string[];
  sitelinks: any[];
  callouts: string[];
  landing_page?: string;
  ad_type: 'search' | 'display';
  business_name?: string;
  long_headline?: string;
  cta_text?: string;
}

export function useAdTemplates() {
  return useQuery({
    queryKey: ['ad-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdTemplate[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateAdTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<AdTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ad_templates')
        .insert({ ...template, created_by: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-templates'] });
      toast({ title: 'Template saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save template', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAdTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-templates'] });
      toast({ title: 'Template deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete template', description: error.message, variant: 'destructive' });
    },
  });
}
