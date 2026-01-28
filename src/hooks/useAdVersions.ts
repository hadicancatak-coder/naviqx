import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdVersion {
  id: string;
  ad_id: string;
  version_number: number;
  snapshot_data: any;
  changed_fields: string[];
  created_by?: string;
  created_at: string;
}

export function useAdVersions(adId: string) {
  return useQuery({
    queryKey: ['ad-versions', adId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_versions')
        .select('*')
        .eq('ad_id', adId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return data as AdVersion[];
    },
    enabled: !!adId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useRestoreAdVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ adId, versionData }: { adId: string; versionData: any }) => {
      const { data, error } = await supabase
        .from('ads')
        .update(versionData)
        .eq('id', adId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      queryClient.invalidateQueries({ queryKey: ['ad-versions'] });
      toast({ title: 'Version restored successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to restore version', description: error.message, variant: 'destructive' });
    },
  });
}
