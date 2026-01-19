import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncConfig {
  id: string;
  user_id: string;
  sheet_id: string;
  sheet_url: string;
  sheet_name: string;
  tab_name: string;
  column_mapping: {
    name: string;
    landing_page?: string;
    campaign_type?: string;
    description?: string;
  };
  last_synced_at: string | null;
  sync_status: 'idle' | 'syncing' | 'success' | 'error';
  sync_error: string | null;
  auto_sync_on_open: boolean;
  sync_count: number;
  created_at: string;
  updated_at: string;
}

export function useGoogleSheetSyncConfigs() {
  return useQuery({
    queryKey: ['google-sheet-sync-configs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('google_sheets_campaign_sync')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SyncConfig[];
    },
  });
}

export function useCreateSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      sheet_id: string;
      sheet_url: string;
      sheet_name: string;
      tab_name?: string;
      column_mapping?: SyncConfig['column_mapping'];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('google_sheets_campaign_sync')
        .insert({
          user_id: user.id,
          sheet_id: config.sheet_id,
          sheet_url: config.sheet_url,
          sheet_name: config.sheet_name,
          tab_name: config.tab_name || 'Sheet1',
          column_mapping: config.column_mapping || {
            name: 'Campaign Name',
            landing_page: 'URL',
            campaign_type: 'Type',
            description: 'Notes',
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data as SyncConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheet-sync-configs'] });
      toast.success('Google Sheet connected successfully');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This sheet is already connected');
      } else {
        toast.error('Failed to connect sheet: ' + error.message);
      }
    },
  });
}

export function useUpdateSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SyncConfig> & { id: string }) => {
      const { error } = await supabase
        .from('google_sheets_campaign_sync')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheet-sync-configs'] });
    },
  });
}

export function useDeleteSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('google_sheets_campaign_sync')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheet-sync-configs'] });
      toast.success('Sheet disconnected');
    },
    onError: () => {
      toast.error('Failed to disconnect sheet');
    },
  });
}

export function useSyncGoogleSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ syncConfigId, accessToken }: { syncConfigId: string; accessToken: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
        body: { syncConfigId, accessToken },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as { 
        success: boolean; 
        synced: number; 
        created: number; 
        updated: number; 
        errors?: string[];
        totalRows: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sheet-sync-configs'] });
      queryClient.invalidateQueries({ queryKey: ['utm-campaigns'] });
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Synced ${data.synced} campaigns with ${data.errors.length} errors`);
      } else {
        toast.success(`Synced ${data.synced} campaigns (${data.created} new, ${data.updated} updated)`);
      }
    },
    onError: (error: Error) => {
      toast.error('Sync failed: ' + error.message);
    },
  });
}